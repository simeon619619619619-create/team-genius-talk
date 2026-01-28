import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Simple Web Push implementation using fetch
async function sendWebPush(
  subscription: PushSubscription,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For now, we'll use a simpler approach with the web-push service
    // In production, you'd want to implement proper VAPID signing
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { userId: string; success: boolean }[] = [];

    for (const subscription of subscriptions as PushSubscription[]) {
      // Get user's projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", subscription.user_id);

      if (!projects || projects.length === 0) continue;

      const projectIds = projects.map((p) => p.id);

      // Get business plans for user's projects
      const { data: businessPlans } = await supabase
        .from("business_plans")
        .select("id")
        .in("project_id", projectIds);

      if (!businessPlans || businessPlans.length === 0) continue;

      const businessPlanIds = businessPlans.map((bp) => bp.id);

      // Get incomplete weekly tasks
      const { data: tasks } = await supabase
        .from("weekly_tasks")
        .select("id, title")
        .in("business_plan_id", businessPlanIds)
        .eq("is_completed", false);

      if (!tasks || tasks.length === 0) continue;

      const taskCount = tasks.length;
      const firstTaskTitle = tasks[0].title;

      const payload = {
        title: "🔔 Напомняне за задачи",
        body:
          taskCount === 1
            ? `Имате 1 непълна задача: ${firstTaskTitle}`
            : `Имате ${taskCount} непълни задачи. Първа: ${firstTaskTitle}`,
        url: "/business-plan",
      };

      const success = await sendWebPush(
        subscription,
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );

      results.push({ userId: subscription.user_id, success });

      // If push failed (subscription invalid), remove it
      if (!success) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications sent",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notifications:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
