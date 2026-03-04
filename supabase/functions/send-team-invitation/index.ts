import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to verify the request
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

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
    const appUrl = Deno.env.get("APP_URL") || "https://simora.lovable.app";
    const invitationUrl = `${appUrl}/accept-invitation?token=${token}`;

    // Get inviter's profile for the email
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "Вашият екип";

    // Send email using Gmail SMTP
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    await client.send({
      from: gmailUser,
      to: email,
      subject: `Покана за екип "${team.name}" в Simora`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Покана за екип</h1>
            </div>
            <div class="content">
              <p>Здравейте${name ? ` ${name}` : ""},</p>
              <p><strong>${inviterName}</strong> ви кани да се присъедините към екип <strong>"${team.name}"</strong> в Simora.</p>
              <p>Вашата роля: <strong>${role}</strong></p>
              <p style="text-align: center;">
                <a href="${invitationUrl}" class="button">Приеми поканата</a>
              </p>
              <p style="font-size: 14px; color: #64748b;">
                Ако линкът не работи, копирайте този адрес в браузъра:<br>
                <a href="${invitationUrl}">${invitationUrl}</a>
              </p>
              <p style="font-size: 12px; color: #94a3b8;">Поканата е валидна 7 дни.</p>
            </div>
            <div class="footer">
              <p>Simora - Управление на екипи</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await client.close();

    console.log(`Invitation email sent to ${email} for team ${team.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation sent successfully",
        teamMemberId: teamMember.id 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
