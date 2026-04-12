import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workflow_id, input_data = {}, retry_from_event_id } = await req.json();

    // Load workflow
    const { data: workflow, error: wfError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflow_id)
      .single();
    if (wfError || !workflow) throw new Error("Workflow not found");

    // Sync nodes from mind_map_json if workflow_nodes table is empty
    const { data: existingNodes } = await supabase
      .from("workflow_nodes")
      .select("*")
      .eq("workflow_id", workflow_id)
      .order("sort_order", { ascending: true });

    let execNodes = existingNodes || [];
    if (execNodes.length === 0 && workflow.mind_map_json?.nodes?.length > 0) {
      const mindMapNodes = workflow.mind_map_json.nodes;
      const inserts = mindMapNodes.map((n: any, idx: number) => ({
        id: n.id,
        workflow_id,
        type: n.data?.type || n.type,
        bot_id: n.data?.botId || null,
        label: n.data?.label || "",
        task_prompt: n.data?.taskPrompt || "",
        tool_permissions: n.data?.toolPermissions || [],
        config: n.data?.config || {},
        position_x: n.position?.x || 0,
        position_y: n.position?.y || 0,
        sort_order: idx,
      }));
      const { data: inserted } = await supabase
        .from("workflow_nodes")
        .upsert(inserts, { onConflict: "id" })
        .select();
      execNodes = inserted || [];
    }

    // Create execution
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id,
        owner_id: user.id,
        status: "running",
        trigger_source: retry_from_event_id ? "retry" : "manual",
        input_data,
      })
      .select()
      .single();
    if (execError) throw execError;

    // Create pending events for each node
    const eventInserts = execNodes.map((node: any) => ({
      execution_id: execution.id,
      node_id: node.id,
      owner_id: user.id,
      status: "pending",
      bot_id: node.bot_id,
      input_data: {},
    }));
    await supabase.from("workflow_events").insert(eventInserts);

    // Load user memory for bot context
    const { data: memory } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Process events sequentially
    const sortedNodes = execNodes.sort((a: any, b: any) => a.sort_order - b.sort_order);

    for (const node of sortedNodes) {
      // Skip trigger and end nodes
      if (node.type === "trigger" || node.type === "end") {
        await supabase
          .from("workflow_events")
          .update({ status: "done", started_at: new Date().toISOString(), finished_at: new Date().toISOString(), duration_ms: 0 })
          .eq("execution_id", execution.id)
          .eq("node_id", node.id);
        continue;
      }

      // Handle delay nodes (MVP: mark done immediately with note)
      if (node.type === "delay") {
        await supabase
          .from("workflow_events")
          .update({
            status: "done",
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_ms: 0,
            output_data: { message: `Delay: ${node.config?.delayMinutes || 1} minutes (MVP: instant)` },
          })
          .eq("execution_id", execution.id)
          .eq("node_id", node.id);
        continue;
      }

      // Handle human_approval nodes — pause execution
      if (node.type === "human_approval") {
        await supabase
          .from("workflow_events")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("execution_id", execution.id)
          .eq("node_id", node.id);
        await supabase
          .from("workflow_executions")
          .update({ status: "paused" })
          .eq("id", execution.id);
        return new Response(
          JSON.stringify({ execution_id: execution.id, status: "paused", reason: "Чака одобрение" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark event as running
      const startTime = Date.now();
      await supabase
        .from("workflow_events")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("execution_id", execution.id)
        .eq("node_id", node.id);

      // Build context from memory
      const botId = node.bot_id || "simeon";
      const memoryContext = memory
        ? `\n\nПотребителски данни:\n- Маркетинг план: ${JSON.stringify(memory.marketing_plan)}\n- Бизнес план: ${JSON.stringify(memory.business_plan)}\n- Процеси: ${JSON.stringify(memory.processes)}`
        : "";

      const taskPrompt = node.task_prompt || node.label;

      try {
        // Call assistant-chat with bot_id
        const { data: aiResult, error: aiError } = await supabase.functions.invoke("assistant-chat", {
          body: {
            message: taskPrompt + memoryContext,
            bot_id: botId,
            workflow_mode: true,
          },
        });

        if (aiError) throw aiError;

        const duration = Date.now() - startTime;
        await supabase
          .from("workflow_events")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            duration_ms: duration,
            output_data: { response: aiResult?.response || aiResult?.text || "" },
            tool_calls: aiResult?.tool_calls || [],
          })
          .eq("execution_id", execution.id)
          .eq("node_id", node.id);
      } catch (err: any) {
        const duration = Date.now() - startTime;
        await supabase
          .from("workflow_events")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            duration_ms: duration,
            error_message: err.message || "Unknown error",
          })
          .eq("execution_id", execution.id)
          .eq("node_id", node.id);

        await supabase
          .from("workflow_executions")
          .update({ status: "failed", finished_at: new Date().toISOString(), duration_ms: Date.now() - new Date(execution.started_at).getTime() })
          .eq("id", execution.id);

        return new Response(
          JSON.stringify({ execution_id: execution.id, status: "failed", error: err.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // All done
    const totalDuration = Date.now() - new Date(execution.started_at).getTime();
    await supabase
      .from("workflow_executions")
      .update({ status: "completed", finished_at: new Date().toISOString(), duration_ms: totalDuration })
      .eq("id", execution.id);

    return new Response(
      JSON.stringify({ execution_id: execution.id, status: "completed", duration_ms: totalDuration }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
