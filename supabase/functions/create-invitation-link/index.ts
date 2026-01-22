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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header");
    }

    // Extract the token from the Authorization header
    const authToken = authHeader.replace("Bearer ", "");
    
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
      global: { headers: { Authorization: authHeader } },
    });

    const { teamId, email, name, role }: InvitationRequest = await req.json();

    // Get team and verify user has access
    const { data: team, error: teamError } = await supabaseClient
      .from("teams")
      .select("*, projects!inner(owner_id)")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      throw new Error("Team not found or access denied");
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
    const appUrl = Deno.env.get("APP_URL") || "https://team-genius-talk.lovable.app";
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
