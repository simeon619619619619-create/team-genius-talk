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
  projectIds?: string[];
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body first
    const { teamId, name, role, projectIds }: CreateMemberRequest = await req.json();
    console.log("Request:", { teamId, name, role });

    if (!teamId || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: teamId, name, role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Auth: get user from JWT
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "No authorization token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken);
    if (userError || !user) {
      console.error("Auth failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Authentication failed", detail: userError?.message }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    console.log("Auth OK:", user.email);

    // Get team
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("id, name, project_id")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      console.error("Team not found:", teamError?.message);
      return new Response(
        JSON.stringify({ error: "Team not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    console.log("Team found:", team.name, "project:", team.project_id);

    // Verify access — check directly instead of RPC to avoid issues
    const { data: projectOwner } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", team.project_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("project_id", team.project_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!projectOwner && !userRole) {
      console.error("Access denied for user", user.id);
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    console.log("Access verified");

    // Get org from project
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("organization_id")
      .eq("id", team.project_id)
      .single();

    // Create user account
    const uniqueId = crypto.randomUUID().substring(0, 8);
    const internalEmail = `member-${uniqueId}@team.simora.bg`;
    const tempPassword = crypto.randomUUID();

    console.log("Creating user:", internalEmail);

    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        created_by_owner: user.id,
        is_team_member: true,
      },
    });

    if (createUserError || !newUser.user) {
      console.error("Create user failed:", createUserError?.message);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createUserError?.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    console.log("User created:", newUser.user.id);

    // Update profile (trigger already created it, just update extra fields)
    await supabaseAdmin
      .from("profiles")
      .update({
        user_type: "worker",
        onboarding_completed: true,
      })
      .eq("user_id", newUser.user.id);

    // Create team member
    const { data: teamMember, error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: newUser.user.id,
        email: internalEmail,
        role: role,
        status: "accepted",
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      console.error("Team member insert failed:", memberError.message);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to add member: ${memberError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    console.log("Team member created:", teamMember.id);

    // Create permissions
    await supabaseAdmin
      .from("member_permissions")
      .insert({
        team_member_id: teamMember.id,
        can_view_tasks: true,
        can_view_business_plan: true,
        can_view_annual_plan: true,
        can_view_all: true,
      });

    // Add user_roles
    const allProjectIds = new Set<string>([team.project_id]);
    if (projectIds && Array.isArray(projectIds)) {
      projectIds.forEach(pid => allProjectIds.add(pid));
    }

    await supabaseAdmin
      .from("user_roles")
      .insert(
        Array.from(allProjectIds).map(pid => ({
          user_id: newUser.user.id,
          project_id: pid,
          role: "editor",
        }))
      );

    // Add org membership
    if (project?.organization_id) {
      await supabaseAdmin
        .from("organization_members")
        .insert({
          user_id: newUser.user.id,
          organization_id: project.organization_id,
          role: "member",
        });
    }

    // Generate access link
    const appUrl = Deno.env.get("APP_URL") || "https://simora.bg";
    let accessLink = `${appUrl}/member-login?email=${encodeURIComponent(internalEmail)}&pw=${encodeURIComponent(tempPassword)}`;

    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: internalEmail,
        options: { redirectTo: `${appUrl}/set-password` },
      });

      if (!linkError && linkData?.properties?.hashed_token) {
        accessLink = `${appUrl}/member-login?token_hash=${linkData.properties.hashed_token}&email=${encodeURIComponent(internalEmail)}`;
      }
    } catch {
      // fallback link already set
    }

    console.log("Success! Member:", name, "Team:", team.name);

    return new Response(
      JSON.stringify({
        success: true,
        accessLink,
        teamMemberId: teamMember.id,
        userId: newUser.user.id,
        teamName: team.name,
        memberName: name,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("FATAL:", error?.message, error?.stack);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
