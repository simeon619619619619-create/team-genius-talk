import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  teamId: string;
  email: string;
  name: string;
  role: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Missing environment variables");
      throw new Error("Server configuration error");
    }

    // Note: header names are case-insensitive; Deno keeps original casing.
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Extract token from: "Bearer <jwt>"
    const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!authToken) {
      console.error("Authorization header present but token missing");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user with admin client using the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken);
    if (userError) {
      console.error("Auth error:", userError.message);
      throw new Error("Unauthorized: " + userError.message);
    }
    if (!user) {
      console.error("No user found");
      throw new Error("Unauthorized");
    }
    
    console.log("Authenticated user:", user.email);

    // Create a client with the user's context for RLS-protected queries
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: `Bearer ${authToken}` } },
    });

    const { teamId, email, name, role }: InvitationRequest = await req.json();

    // Get team (service role) and verify user has access (RLS-safe RPC)
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

    // Use admin client to call SECURITY DEFINER function
    const { data: hasAccess, error: accessError } = await supabaseAdmin.rpc(
      "has_project_access",
      { _user_id: user.id, _project_id: team.project_id },
    );

    if (accessError) {
      console.error("Access check error:", accessError.message);
      return new Response(
        JSON.stringify({ error: "Access check failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Create team member record
    const { data: teamMember, error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: teamId,
        email: email,
        role: role,
        status: "pending",
        invited_by: user.id,
      })
      .select()
      .single();

    if (memberError) {
      throw new Error(`Failed to create team member: ${memberError.message}`);
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    
    const { error: inviteError } = await supabaseAdmin
      .from("team_invitations")
      .insert({
        team_member_id: teamMember.id,
        token: token,
      });

    if (inviteError) {
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    // Build invitation URL
    const appUrl = Deno.env.get("APP_URL") || "https://simora.lovable.app";
    const invitationUrl = `${appUrl}/accept-invitation?token=${token}`;

    console.log(`Invitation link created for ${email} to team ${team.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitationUrl,
        teamMemberId: teamMember.id,
        teamName: team.name,
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error creating invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
