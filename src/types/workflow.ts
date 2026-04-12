// ─── Enums ───
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type WorkflowTriggerType = 'manual' | 'cron' | 'event' | 'webhook' | 'ai_suggestion';
export type WorkflowNodeType = 'trigger' | 'ai_task' | 'condition' | 'delay' | 'human_approval' | 'action' | 'end';
export type WorkflowExecutionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type WorkflowEventStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';
export type WorkflowLearningType = 'optimization' | 'bottleneck' | 'pattern' | 'error_prevention';

export type BotId = 'simeon' | 'simona' | 'simone' | 'monika' | 'simoni' | 'simoneta' | 'simonka';

// ─── Database row types ───
export interface Workflow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown>;
  mind_map_json: MindMapData;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  type: WorkflowNodeType;
  bot_id: BotId | null;
  label: string;
  task_prompt: string;
  tool_permissions: string[];
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  sort_order: number;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  owner_id: string;
  status: WorkflowExecutionStatus;
  trigger_source: string;
  input_data: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}

export interface WorkflowEvent {
  id: string;
  execution_id: string;
  node_id: string;
  owner_id: string;
  status: WorkflowEventStatus;
  bot_id: BotId | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  tool_calls: Record<string, unknown>[];
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
}

export interface WorkflowLearning {
  id: string;
  workflow_id: string;
  execution_id: string;
  owner_id: string;
  analysis_type: WorkflowLearningType;
  suggestion: string;
  applied: boolean;
  created_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  methodology_data: Record<string, unknown>;
  marketing_plan: Record<string, unknown>;
  business_plan: Record<string, unknown>;
  api_connections: Record<string, unknown>;
  team_config: Record<string, unknown>;
  processes: Record<string, unknown>;
  automation_patterns: Record<string, unknown>;
  updated_at: string;
}

// ─── Mind Map types (React Flow compatible) ───
export interface MindMapNodeData {
  label: string;
  type: WorkflowNodeType;
  botId: BotId | null;
  taskPrompt: string;
  toolPermissions: string[];
  config: Record<string, unknown>;
  // Live execution state (set during execution)
  eventStatus?: WorkflowEventStatus;
  eventOutput?: string;
}

export interface MindMapData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: MindMapNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
  }>;
}

// ─── Bot tool definitions ───
export interface BotToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface BotConfig {
  id: BotId;
  name: string;
  role: string;
  color: string;
  tools: BotToolDefinition[];
  systemPrompt: string;
}

// ─── Bot registry ───
export const BOT_REGISTRY: Record<BotId, Omit<BotConfig, 'tools' | 'systemPrompt'>> = {
  simeon: { id: 'simeon', name: 'Симеон', role: 'Orchestrator', color: '#a855f7' },
  simona: { id: 'simona', name: 'Симона', role: 'Съдържание & Реклами', color: '#34d399' },
  simone: { id: 'simone', name: 'Симоне', role: 'Продажби & Клиенти', color: '#fb923c' },
  monika: { id: 'monika', name: 'Моника', role: 'Email маркетинг', color: '#f472b6' },
  simoni: { id: 'simoni', name: 'Симони', role: 'Стратегия & Анализи', color: '#60a5fa' },
  simoneta: { id: 'simoneta', name: 'Симонета', role: 'Уеб & SEO', color: '#818cf8' },
  simonka: { id: 'simonka', name: 'Симонка', role: 'Проджект мениджър', color: '#fbbf24' },
};
