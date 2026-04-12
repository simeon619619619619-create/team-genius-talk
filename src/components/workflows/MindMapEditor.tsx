import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "./TriggerNode";
import { AiTaskNode } from "./AiTaskNode";
import { ConditionNode } from "./ConditionNode";
import { DelayNode } from "./DelayNode";
import { ApprovalNode } from "./ApprovalNode";
import { ActionNode } from "./ActionNode";
import { EndNode } from "./EndNode";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import type { MindMapData, MindMapNodeData, WorkflowNodeType } from "@/types/workflow";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  ai_task: AiTaskNode,
  condition: ConditionNode,
  delay: DelayNode,
  human_approval: ApprovalNode,
  action: ActionNode,
  end: EndNode,
};

const defaultNodeData: Record<WorkflowNodeType, MindMapNodeData> = {
  trigger: { label: "Старт", type: "trigger", botId: null, taskPrompt: "", toolPermissions: [], config: {} },
  ai_task: { label: "AI Задача", type: "ai_task", botId: null, taskPrompt: "", toolPermissions: [], config: {} },
  condition: { label: "Условие", type: "condition", botId: null, taskPrompt: "", toolPermissions: [], config: {} },
  delay: { label: "Изчакай", type: "delay", botId: null, taskPrompt: "", toolPermissions: [], config: { delayMinutes: 60 } },
  human_approval: { label: "Одобрение", type: "human_approval", botId: null, taskPrompt: "", toolPermissions: [], config: {} },
  action: { label: "Действие", type: "action", botId: null, taskPrompt: "", toolPermissions: [], config: {} },
  end: { label: "Край", type: "end", botId: null, taskPrompt: "", toolPermissions: [], config: {} },
};

interface MindMapEditorProps {
  initialData: MindMapData;
  onChange: (data: MindMapData) => void;
  readOnly?: boolean;
}

export function MindMapEditor({ initialData, onChange, readOnly = false }: MindMapEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const saveChanges = useCallback(
    (updatedNodes: typeof nodes, updatedEdges: typeof edges) => {
      onChange({ nodes: updatedNodes, edges: updatedEdges });
    },
    [onChange]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, id: `e-${Date.now()}` }, eds);
        saveChanges(nodes, newEdges);
        return newEdges;
      });
    },
    [setEdges, nodes, saveChanges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow-nodetype") as WorkflowNodeType;
      if (!nodeType || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 75,
        y: event.clientY - bounds.top - 25,
      };

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position,
        data: { ...defaultNodeData[nodeType] },
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        saveChanges(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, saveChanges]
  );

  const onUpdateNodeData = useCallback(
    (nodeId: string, updates: Partial<MindMapNodeData>) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        );
        saveChanges(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, saveChanges]
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  return (
    <div className="flex h-full">
      {!readOnly && (
        <div className="w-48 border-r bg-card p-3 overflow-y-auto shrink-0">
          <NodePalette />
        </div>
      )}

      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : handleNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={readOnly ? undefined : onDragOver}
          onDrop={readOnly ? undefined : onDrop}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={true}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {selectedNode && !readOnly && (
        <div className="w-72 border-l bg-card overflow-y-auto shrink-0">
          <NodeConfigPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as MindMapNodeData}
            onUpdate={onUpdateNodeData}
          />
        </div>
      )}
    </div>
  );
}
