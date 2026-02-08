import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  teamId: string;
  name: string;
  role: string;
  projectIds?: string[]; // Optional: additional projects to grant access to
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      throw new Error("Server configuration error");
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken);
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    
    console.log("Authenticated owner:", user.email);

    const { teamId, name, role, projectIds }: CreateMemberRequest = await req.json();

    if (!teamId || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: teamId, name, role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Get team and verify owner has access
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("id, name, project_id")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ error: "Team not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Verify owner has access to this project
    const { data: hasAccess, error: accessError } = await supabaseAdmin.rpc(
      "has_project_access",
      { _user_id: user.id, _project_id: team.project_id },
    );

    if (accessError || !hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Get the organization_id from the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("organization_id")
      .eq("id", team.project_id)
      .single();

    if (projectError || !project?.organization_id) {
      return new Response(
        JSON.stringify({ error: "Project or organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Generate a unique email for this member (internal use only)
    const uniqueId = crypto.randomUUID().substring(0, 8);
    const internalEmail = `member-${uniqueId}@team.local`;
    
    // Generate a random temporary password (user will reset this)
    const tempPassword = crypto.randomUUID();

    // Create the user account using admin API
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since we don't use email
      user_metadata: {
        full_name: name,
        created_by_owner: user.id,
        is_team_member: true,
      },
    });

    if (createUserError || !newUser.user) {
      console.error("Error creating user:", createUserError);
      throw new Error("Failed to create user account");
    }

    console.log("Created user account:", newUser.user.id);

    // Create or update profile for the new user (upsert to handle auth trigger)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: newUser.user.id,
        full_name: name,
        email: internalEmail,
        user_type: "worker",
        onboarding_completed: true, // Skip onboarding for team members
      }, {
        onConflict: "user_id",
      });

    if (profileError) {
      console.error("Error upserting profile:", profileError);
      // Cleanup: delete the user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Failed to create user profile");
    }

    // Create team member record
    const { data: teamMember, error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: newUser.user.id,
        email: internalEmail,
        role: role,
        status: "accepted", // Auto-accept since owner created them
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error creating team member:", memberError);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Failed to create team member");
    }

    // Create member_permissions with full access by default
    const { error: permError } = await supabaseAdmin
      .from("member_permissions")
      .insert({
        team_member_id: teamMember.id,
        can_view_tasks: true,
        can_view_business_plan: true,
        can_view_annual_plan: true,
        can_view_all: true,
      });

    if (permError) {
      console.error("Error creating member permissions:", permError);
    }

    // Build list of projects to grant access to
    const allProjectIds = new Set<string>([team.project_id]);
    if (projectIds && Array.isArray(projectIds)) {
      projectIds.forEach(pid => allProjectIds.add(pid));
    }

    // Add user_roles entries for all projects
    const roleInserts = Array.from(allProjectIds).map(pid => ({
      user_id: newUser.user.id,
      project_id: pid,
      role: "editor",
    }));

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert(roleInserts);

    if (roleError) {
      console.error("Error creating user roles:", roleError);
    }

    // Add organization_members entry
    const { error: orgMemberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        user_id: newUser.user.id,
        organization_id: project.organization_id,
        role: "member",
      });

    if (orgMemberError) {
      console.error("Error creating org member:", orgMemberError);
    }

    // Generate a password recovery link for the user to set their password
    const appUrl = Deno.env.get("APP_URL") || "https://team-genius-talk.lovable.app";
    
    // Create a magic link token for first login
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: internalEmail,
      options: {
        redirectTo: `${appUrl}/set-password`,
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      throw new Error("Failed to generate access link");
    }

    // Extract the token_hash from the link and build our custom URL
    const tokenHash = linkData.properties?.hashed_token;
    const accessLink = `${appUrl}/member-login?token_hash=${tokenHash}&email=${encodeURIComponent(internalEmail)}`;

    console.log(`Team member created: ${name} for team ${team.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        accessLink,
        teamMemberId: teamMember.id,
        userId: newUser.user.id,
        teamName: team.name,
        memberName: name,
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error creating team member:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
