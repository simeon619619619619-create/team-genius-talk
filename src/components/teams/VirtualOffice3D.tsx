import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, Sky, PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import type { AiBot } from "./VirtualOffice";
import { Gamepad2, MessageSquare, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  bots: AiBot[];
  selectedBotId?: string | null;
  onSelectBot?: (id: string | null) => void;
}

// ─── VOXEL BLOCK ───
function Block({ position, color, args = [1, 1, 1] }: { position: [number, number, number]; color: string; args?: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// ─── DESK ───
function Desk({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group>
      {/* Table top */}
      <Block position={[x, y + 0.75, z]} color="#8b7050" args={[1.5, 0.1, 0.8]} />
      {/* Legs */}
      <Block position={[x - 0.6, y + 0.35, z - 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      <Block position={[x + 0.6, y + 0.35, z - 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      <Block position={[x - 0.6, y + 0.35, z + 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      <Block position={[x + 0.6, y + 0.35, z + 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      {/* Monitor */}
      <Block position={[x, y + 1.15, z - 0.2]} color="#1f2937" args={[0.6, 0.4, 0.05]} />
      <Block position={[x, y + 0.9, z - 0.2]} color="#374151" args={[0.1, 0.1, 0.05]} />
      {/* Keyboard */}
      <Block position={[x, y + 0.82, z + 0.1]} color="#4b5563" args={[0.4, 0.02, 0.15]} />
    </group>
  );
}

// ─── BOT CHARACTER ───
function BotCharacter({ bot, position, isNear, onClick }: {
  bot: AiBot;
  position: [number, number, number];
  isNear: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    // Idle bob
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.03;
    // Look at camera when near
    if (isNear) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={meshRef} position={position} onClick={onClick}
      onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      {/* Legs */}
      <Block position={[-0.1, 0.2, 0]} color="#2d2d4a" args={[0.15, 0.4, 0.15]} />
      <Block position={[0.1, 0.2, 0]} color="#2d2d4a" args={[0.15, 0.4, 0.15]} />
      {/* Body */}
      <Block position={[0, 0.6, 0]} color={bot.shirtColor} args={[0.35, 0.4, 0.2]} />
      {/* Arms */}
      <Block position={[-0.25, 0.6, 0]} color={bot.skinColor} args={[0.12, 0.35, 0.12]} />
      <Block position={[0.25, 0.6, 0]} color={bot.skinColor} args={[0.12, 0.35, 0.12]} />
      {/* Head */}
      <Block position={[0, 1.0, 0]} color={bot.skinColor} args={[0.3, 0.3, 0.3]} />
      {/* Hair */}
      <Block position={[0, 1.15, 0]} color={bot.hairColor} args={[0.32, 0.12, 0.32]} />
      <Block position={[0, 1.05, -0.14]} color={bot.hairColor} args={[0.32, 0.25, 0.05]} />
      {/* Eyes */}
      <Block position={[-0.08, 1.0, 0.16]} color="#1a1a2e" args={[0.05, 0.05, 0.01]} />
      <Block position={[0.08, 1.0, 0.16]} color="#1a1a2e" args={[0.05, 0.05, 0.01]} />

      {/* Name tag */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {bot.name}
      </Text>
      <Text
        position={[0, 1.35, 0]}
        fontSize={0.08}
        color="#aaaaaa"
        anchorX="center"
        anchorY="bottom"
      >
        {bot.role}
      </Text>

      {/* Interaction glow */}
      {(isNear || hover) && (
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.6, 1.4, 0.5]} />
          <meshStandardMaterial color="#c084fc" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

// ─── PLAYER CONTROLLER (WASD + Mouse) ───
function PlayerController({ onNearBot, botPositions, bots, onInteract }: {
  onNearBot: (bot: AiBot | null) => void;
  botPositions: [number, number, number][];
  bots: AiBot[];
  onInteract: (bot: AiBot) => void;
}) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef<Set<string>>(new Set());
  const nearBotRef = useRef<AiBot | null>(null);

  useEffect(() => {
    camera.position.set(6, 1.7, 10);

    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "e" && nearBotRef.current) {
        onInteract(nearBotRef.current);
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [camera, onInteract]);

  useFrame(() => {
    const speed = 0.08;
    const k = keys.current;

    direction.current.set(0, 0, 0);
    if (k.has("w") || k.has("arrowup")) direction.current.z = -1;
    if (k.has("s") || k.has("arrowdown")) direction.current.z = 1;
    if (k.has("a") || k.has("arrowleft")) direction.current.x = -1;
    if (k.has("d") || k.has("arrowright")) direction.current.x = 1;

    if (direction.current.length() > 0) {
      direction.current.normalize();
      // Move relative to camera direction
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

      velocity.current.copy(forward).multiplyScalar(-direction.current.z * speed);
      velocity.current.add(right.clone().multiplyScalar(direction.current.x * speed));

      camera.position.add(velocity.current);
    }

    // Clamp to room bounds
    camera.position.x = Math.max(1, Math.min(11, camera.position.x));
    camera.position.z = Math.max(1, Math.min(11, camera.position.z));
    camera.position.y = 1.7; // Eye height

    // Check near bots
    let nearest: AiBot | null = null;
    let nearestDist = 2.5;
    for (let i = 0; i < botPositions.length; i++) {
      const [bx, , bz] = botPositions[i];
      const dx = camera.position.x - bx;
      const dz = camera.position.z - bz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = bots[i];
      }
    }
    nearBotRef.current = nearest;
    onNearBot(nearest);
  });

  return <PointerLockControls />;
}

// ─── ROOM ───
function Room() {
  return (
    <group>
      {/* Floor */}
      {Array.from({ length: 12 }, (_, x) =>
        Array.from({ length: 12 }, (_, z) => (
          <Block key={`f-${x}-${z}`} position={[x, 0, z]} color={(x + z) % 2 === 0 ? "#3d3524" : "#352e1f"} />
        ))
      )}

      {/* Walls - Back */}
      {Array.from({ length: 12 }, (_, x) =>
        Array.from({ length: 3 }, (_, y) => (
          <Block key={`wb-${x}-${y}`} position={[x, y + 1, -0.5]} color={y === 2 ? "#374151" : "#4a5568"} />
        ))
      )}

      {/* Walls - Left */}
      {Array.from({ length: 12 }, (_, z) =>
        Array.from({ length: 3 }, (_, y) => (
          <Block key={`wl-${z}-${y}`} position={[-0.5, y + 1, z]} color={y === 2 ? "#374151" : "#4a5568"} />
        ))
      )}

      {/* Walls - Right */}
      {Array.from({ length: 12 }, (_, z) =>
        Array.from({ length: 3 }, (_, y) => (
          <Block key={`wr-${z}-${y}`} position={[11.5, y + 1, z]} color={y === 2 ? "#374151" : "#4a5568"} />
        ))
      )}

      {/* Windows (holes in back wall) */}
      {[2, 5, 8].map(x => (
        <group key={`win-${x}`}>
          <Block position={[x, 2, -0.5]} color="#1e3a5f" args={[1.5, 1, 0.1]} />
          <mesh position={[x, 2, -0.45]}>
            <planeGeometry args={[1.3, 0.8]} />
            <meshStandardMaterial color="#2a5a8f" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}

      {/* Carpet (meeting area) */}
      <Block position={[6, 0.01, 6]} color="#7b3060" args={[3, 0.02, 2.5]} />

      {/* Couch */}
      <Block position={[6, 0.35, 8]} color="#6b3090" args={[2.5, 0.5, 0.7]} />
      <Block position={[6, 0.7, 8.3]} color="#5a2878" args={[2.5, 0.5, 0.15]} />

      {/* Plants */}
      {[[1, 1], [10, 1]].map(([x, z], i) => (
        <group key={`plant-${i}`}>
          <Block position={[x, 0.6, z]} color="#8b4513" args={[0.3, 0.4, 0.3]} />
          <Block position={[x, 1.0, z]} color="#2d8b4e" args={[0.5, 0.5, 0.5]} />
          <Block position={[x, 1.3, z]} color="#4ec870" args={[0.3, 0.3, 0.3]} />
        </group>
      ))}

      {/* Coffee machine */}
      <Block position={[10, 0.5, 10]} color="#5c3a1e" args={[0.4, 0.8, 0.4]} />
      <Block position={[10, 0.9, 10]} color="#7c5a3e" args={[0.35, 0.1, 0.35]} />

      {/* Ceiling light */}
      <pointLight position={[6, 3.5, 6]} intensity={1.5} color="#ffeedd" distance={15} />
    </group>
  );
}

// ─── MAIN COMPONENT ───
export function VirtualOffice3D({ bots, selectedBotId, onSelectBot }: Props) {
  const [nearBot, setNearBot] = useState<AiBot | null>(null);
  const [chatBot, setChatBot] = useState<AiBot | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { projectId } = useCurrentProject();
  const { currentOrganization } = useOrganizations();
  const { user } = useAuth();

  // Bot desk positions
  const botPositions = useMemo<[number, number, number][]>(() => [
    [2, 0, 2], [5, 0, 2], [8, 0, 2],
    [2, 0, 5], [5, 0, 5], [8, 0, 5],
  ], []);

  const deskPositions = useMemo<[number, number, number][]>(() => [
    [2, 0, 1.5], [5, 0, 1.5], [8, 0, 1.5],
    [2, 0, 4.5], [5, 0, 4.5], [8, 0, 4.5],
  ], []);

  const openChat = useCallback((bot: AiBot) => {
    setChatBot(bot);
    setChatMessages([{
      role: "assistant",
      content: `Здравейте! Аз съм ${bot.name} — ${bot.role}.\n\nМога да помогна с: ${(bot.skills || []).join(", ")}.\n\nКакво да направя?`
    }]);
    setChatInput("");
    // Exit pointer lock
    document.exitPointerLock?.();
    setTimeout(() => chatInputRef.current?.focus(), 100);
  }, []);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !chatBot || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);

    try {
      const systemPrompt = `Ти си ${chatBot.name}, ${chatBot.role}. Умения: ${(chatBot.skills || []).join(", ")}. Отговаряй кратко на български.`;
      const history = chatMessages.slice(-8);

      const { data } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: [...history, { role: "user", content: msg }],
          projectId,
          organizationId: currentOrganization?.id,
          context: "business",
          userId: user?.id,
          moduleSystemPrompt: systemPrompt,
        },
      });

      setChatMessages(prev => [...prev, { role: "assistant", content: data?.content || "Грешка." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "⚠️ Грешка при връзката." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatInput, chatBot, chatLoading, chatMessages, projectId, currentOrganization, user]);

  const working = bots.filter(b => b.state === "working").length;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1a1a2e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a] border-b border-[#2a2a4a]">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-purple-400">
          Виртуален Офис 3D
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-[11px] text-gray-500">
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
              {working} работят
            </span>
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1" />
              {bots.length - working} чакат
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white">
            <Gamepad2 className="h-3.5 w-3.5" />
            3D Mode
          </div>
        </div>
      </div>

      {/* 3D Canvas + Chat */}
      <div className="flex relative" style={{ height: "500px" }}>
        <div className={`${chatBot ? "flex-1" : "w-full"} relative`}>
          <Canvas shadows camera={{ fov: 70, near: 0.1, far: 100 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[8, 10, 5]} intensity={0.8} castShadow />
            <Sky sunPosition={[100, 20, 100]} />

            <Room />

            {/* Desks */}
            {deskPositions.slice(0, bots.length).map((pos, i) => (
              <Desk key={`desk-${i}`} position={pos} />
            ))}

            {/* Bots */}
            {bots.map((bot, i) => {
              if (i >= botPositions.length) return null;
              return (
                <BotCharacter
                  key={bot.id}
                  bot={bot}
                  position={botPositions[i]}
                  isNear={nearBot?.id === bot.id}
                  onClick={() => openChat(bot)}
                />
              );
            })}

            <PlayerController
              onNearBot={setNearBot}
              botPositions={botPositions}
              bots={bots}
              onInteract={openChat}
            />
          </Canvas>

          {/* HUD overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="w-1 h-1 bg-white rounded-full opacity-60" />
          </div>

          {/* Interaction hint */}
          {nearBot && !chatBot && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0f0f1aEE] border border-[#c084fc55] px-4 py-2 rounded-xl">
              <p className="text-sm text-white font-medium">
                [E] Говори с <span className="text-purple-400">{nearBot.name}</span>
              </p>
            </div>
          )}

          {/* Instructions */}
          {!chatBot && !nearBot && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500">
              Кликни за да управляваш камерата | WASD = Движение | E = Говори | ESC = Освободи мишката
            </div>
          )}
        </div>

        {/* In-game chat panel */}
        {chatBot && (
          <div className="w-[340px] shrink-0 flex flex-col bg-[#0f0f1a] border-l border-[#2a2a4a]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a4a]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: chatBot.shirtColor }} />
                <div>
                  <p className="text-sm font-semibold text-white">{chatBot.name}</p>
                  <p className="text-[10px] text-gray-500">{chatBot.role}</p>
                </div>
              </div>
              <button onClick={() => setChatBot(null)} className="text-gray-500 hover:text-white p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-md"
                      : "bg-[#1a1a2e] text-gray-200 border border-[#2a2a4a] rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl rounded-bl-md px-3 py-2 flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-2 border-t border-[#2a2a4a]">
              <div className="flex items-center gap-2 bg-[#1a1a2e] rounded-full px-3 py-1.5 border border-[#2a2a4a] focus-within:border-purple-500/50">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendChatMessage(); }}
                  placeholder={`Говори с ${chatBot.name}...`}
                  className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none"
                />
                <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading}
                  className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${chatInput.trim() ? "bg-purple-600 text-white" : "text-gray-600"}`}>
                  {chatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
