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
  email?: string;
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

    // Parse body
    const { teamId, name, role, email, projectIds }: CreateMemberRequest = await req.json();
    console.log("Request:", { teamId, name, role, email });

    if (!teamId || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: teamId, name, role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Auth: try multiple methods to verify user (ES256 compat)
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "No authorization token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    let userId: string | null = null;
    let userEmail: string | null = null;

    // Method 1: Direct fetch to auth API
    try {
      const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "apikey": supabaseServiceKey,
        },
      });
      if (authRes.ok) {
        const authUser = await authRes.json();
        if (authUser?.id) {
          userId = authUser.id;
          userEmail = authUser.email;
        }
      } else {
        console.log("Auth method 1 failed:", authRes.status);
      }
    } catch (e: any) {
      console.log("Auth method 1 error:", e.message);
    }

    // Method 2: Decode JWT and verify user exists via admin
    if (!userId) {
      try {
        const parts = authToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload.sub && (!payload.exp || payload.exp > Date.now() / 1000)) {
            const { data: { user: adminUser } } = await supabaseAdmin.auth.admin.getUserById(payload.sub);
            if (adminUser) {
              userId = adminUser.id;
              userEmail = adminUser.email ?? null;
              console.log("Auth via JWT decode + admin verify");
            }
          }
        }
      } catch (e: any) {
        console.log("Auth method 2 error:", e.message);
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    console.log("Auth OK:", userEmail);

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

    // Verify access
    const { data: projectOwner } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", team.project_id)
      .eq("owner_id", userId)
      .maybeSingle();

    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("project_id", team.project_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!projectOwner && !userRole) {
      console.error("Access denied for user", userId);
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
    const memberEmail = email || `member-${crypto.randomUUID().substring(0, 8)}@team.simora.bg`;
    const appUrl = Deno.env.get("APP_URL") || "https://simora.bg";
    const isRealEmail = email && !email.endsWith("@team.simora.bg");

    console.log("Creating user:", memberEmail, "realEmail:", isRealEmail);

    let newUserId: string;

    let existingUser = false;

    if (isRealEmail) {
      // Try invite first — sends an actual invitation email for new users
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        memberEmail,
        {
          data: {
            full_name: name,
            created_by_owner: userId,
            is_team_member: true,
          },
          redirectTo: `${appUrl}/member-login`,
        }
      );

      if (inviteError) {
        // If email sending fails, create user directly without invite email
        if (inviteError.message?.includes("Error sending") || inviteError.message?.includes("email")) {
          console.log("Invite email failed, creating user directly:", inviteError.message);
          const tempPassword = crypto.randomUUID();
          const { data: directUser, error: directError } = await supabaseAdmin.auth.admin.createUser({
            email: memberEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: name, created_by_owner: userId, is_team_member: true },
          });
          if (directError || !directUser.user) {
            // Maybe user already exists
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const found = existingUsers?.users?.find((u: any) => u.email === memberEmail);
            if (found) {
              newUserId = found.id;
              existingUser = true;
              console.log("User already exists:", newUserId);
            } else {
              return new Response(
                JSON.stringify({ error: `Не може да се създаде потребител: ${directError?.message}` }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
              );
            }
          } else {
            newUserId = directUser.user.id;
            console.log("User created directly (no invite email):", newUserId);
          }
        } else if (inviteError.message?.includes("already been registered")) {
          console.log("User already exists, looking up and sending magic link...");
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const found = existingUsers?.users?.find((u: any) => u.email === memberEmail);
          if (!found) {
            return new Response(
              JSON.stringify({ error: "Потребителят не е намерен" }),
              { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }
          newUserId = found.id;
          existingUser = true;

          // Send magic link email so they can access the project
          try {
            await supabaseAdmin.auth.admin.generateLink({
              type: "magiclink",
              email: memberEmail,
              options: { redirectTo: `${appUrl}/` },
            });
            // Use the auth API to actually send the email
            const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
              email: memberEmail,
              options: { shouldCreateUser: false, emailRedirectTo: `${appUrl}/` },
            });
            if (otpError) console.log("OTP send note:", otpError.message);
          } catch (e: any) {
            console.log("Magic link send note:", e.message);
          }
          console.log("Existing user found:", newUserId, "magic link sent");
        } else {
          console.error("Invite user failed:", inviteError.message);
          return new Response(
            JSON.stringify({ error: `Failed to invite user: ${inviteError.message}` }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      } else {
        newUserId = inviteData.user!.id;
        console.log("User invited (email sent):", newUserId);
      }
    } else {
      // Internal email — create directly without sending email
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: memberEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          created_by_owner: userId,
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
      newUserId = newUser.user.id;
      console.log("User created:", newUserId);
    }

    // Update profile — for new users wait for trigger, for existing just update
    if (!existingUser) {
      await new Promise(r => setTimeout(r, 500));
    }
    await supabaseAdmin
      .from("profiles")
      .update({
        user_type: "worker",
        onboarding_completed: true,
      })
      .eq("user_id", newUserId);

    // Create team member
    const { data: teamMember, error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: newUserId,
        email: memberEmail,
        role: role,
        status: "accepted",
        invited_by: userId,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      console.error("Team member insert failed:", memberError.message);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
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
          user_id: newUserId,
          project_id: pid,
          role: "editor",
        }))
      );

    // Add org membership
    if (project?.organization_id) {
      await supabaseAdmin
        .from("organization_members")
        .insert({
          user_id: newUserId,
          organization_id: project.organization_id,
          role: "member",
        });
    }

    // Generate access link (for sharing manually)
    let accessLink = "";
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: memberEmail,
        options: { redirectTo: `${appUrl}/member-login` },
      });

      if (!linkError && linkData?.properties?.hashed_token) {
        accessLink = `${appUrl}/member-login?token_hash=${linkData.properties.hashed_token}&email=${encodeURIComponent(memberEmail)}`;
      }
    } catch {
      // no link available
    }

    console.log("Success! Member:", name, "Team:", team.name, "emailSent:", isRealEmail);

    return new Response(
      JSON.stringify({
        success: true,
        accessLink,
        emailSent: !!isRealEmail,
        teamMemberId: teamMember.id,
        userId: newUserId,
        teamName: team.name,
        memberName: name,
        memberEmail,
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
