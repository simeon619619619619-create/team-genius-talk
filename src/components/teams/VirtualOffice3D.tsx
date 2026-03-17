import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AiBot } from "./VirtualOffice";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  bots: AiBot[];
  selectedBotId?: string | null;
  onSelectBot?: (id: string | null) => void;
}

// ─── BLOCK ───
function Block({ position, color, args = [1, 1, 1] as [number, number, number] }: {
  position: [number, number, number]; color: string; args?: [number, number, number];
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// ─── DESK ───
function Desk({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group>
      <Block position={[x, y + 0.75, z]} color="#8b7050" args={[1.5, 0.1, 0.8]} />
      <Block position={[x - 0.6, y + 0.35, z - 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      <Block position={[x + 0.6, y + 0.35, z - 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      <Block position={[x - 0.6, y + 0.35, z + 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      <Block position={[x + 0.6, y + 0.35, z + 0.3]} color="#6b5030" args={[0.08, 0.7, 0.08]} />
      <Block position={[x, y + 1.15, z - 0.2]} color="#1f2937" args={[0.6, 0.4, 0.05]} />
      <Block position={[x, y + 0.9, z - 0.2]} color="#374151" args={[0.1, 0.1, 0.05]} />
      <Block position={[x, y + 0.82, z + 0.1]} color="#4b5563" args={[0.4, 0.02, 0.15]} />
    </group>
  );
}

// ─── BOT ───
function BotChar({ bot, position, isNear, onClick }: {
  bot: AiBot; position: [number, number, number]; isNear: boolean; onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 2 + position[0]) * 0.03;
  });

  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <Block position={[-0.1, 0.2, 0]} color="#2d2d4a" args={[0.15, 0.4, 0.15]} />
      <Block position={[0.1, 0.2, 0]} color="#2d2d4a" args={[0.15, 0.4, 0.15]} />
      <Block position={[0, 0.6, 0]} color={bot.shirtColor} args={[0.35, 0.4, 0.2]} />
      <Block position={[-0.25, 0.6, 0]} color={bot.skinColor} args={[0.12, 0.35, 0.12]} />
      <Block position={[0.25, 0.6, 0]} color={bot.skinColor} args={[0.12, 0.35, 0.12]} />
      <Block position={[0, 1.0, 0]} color={bot.skinColor} args={[0.3, 0.3, 0.3]} />
      <Block position={[0, 1.15, 0]} color={bot.hairColor} args={[0.32, 0.12, 0.32]} />
      <Block position={[0, 1.05, -0.14]} color={bot.hairColor} args={[0.32, 0.25, 0.05]} />
      <Block position={[-0.08, 1.0, 0.16]} color="#1a1a2e" args={[0.05, 0.05, 0.01]} />
      <Block position={[0.08, 1.0, 0.16]} color="#1a1a2e" args={[0.05, 0.05, 0.01]} />
      {/* Name plate */}
      <Block position={[0, 1.45, 0]} color="#0f0f1a" args={[0.6, 0.18, 0.02]} />
      {(isNear) && (
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.6, 1.4, 0.5]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  );
}

// ─── PLAYER (first person WASD) ───
function Player({ onNearBot, botPositions, bots, onInteract, chatOpen }: {
  onNearBot: (bot: AiBot | null) => void;
  botPositions: [number, number, number][];
  bots: AiBot[];
  onInteract: (bot: AiBot) => void;
  chatOpen: boolean;
}) {
  const { camera, gl } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const nearRef = useRef<AiBot | null>(null);
  const isLocked = useRef(false);

  useEffect(() => {
    camera.position.set(6, 1.7, 10);
    camera.rotation.set(0, Math.PI, 0);

    const onDown = (e: KeyboardEvent) => {
      if (chatOpen) return;
      keys.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "e" && nearRef.current) onInteract(nearRef.current);
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= e.movementX * 0.002;
      euler.current.x -= e.movementY * 0.002;
      euler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const onLockChange = () => { isLocked.current = !!document.pointerLockElement; };

    const canvas = gl.domElement;
    const onClick = () => { if (!chatOpen) canvas.requestPointerLock(); };

    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [camera, gl, onInteract, chatOpen]);

  useFrame(() => {
    if (chatOpen) return;
    const speed = 0.07;
    const k = keys.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    if (k.has("w") || k.has("arrowup")) camera.position.add(forward.clone().multiplyScalar(speed));
    if (k.has("s") || k.has("arrowdown")) camera.position.add(forward.clone().multiplyScalar(-speed));
    if (k.has("a") || k.has("arrowleft")) camera.position.add(right.clone().multiplyScalar(-speed));
    if (k.has("d") || k.has("arrowright")) camera.position.add(right.clone().multiplyScalar(speed));

    camera.position.x = Math.max(0.5, Math.min(11.5, camera.position.x));
    camera.position.z = Math.max(0.5, Math.min(11.5, camera.position.z));
    camera.position.y = 1.7;

    let nearest: AiBot | null = null;
    let nd = 2.5;
    for (let i = 0; i < botPositions.length && i < bots.length; i++) {
      const dx = camera.position.x - botPositions[i][0];
      const dz = camera.position.z - botPositions[i][2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nd) { nd = d; nearest = bots[i]; }
    }
    nearRef.current = nearest;
    onNearBot(nearest);
  });

  return null;
}

// ─── ROOM ───
function Room() {
  return (
    <group>
      {Array.from({ length: 12 }, (_, x) =>
        Array.from({ length: 12 }, (_, z) => (
          <Block key={`f${x}${z}`} position={[x, 0, z]} color={(x + z) % 2 === 0 ? "#3d3524" : "#352e1f"} />
        ))
      )}
      {Array.from({ length: 12 }, (_, x) =>
        Array.from({ length: 3 }, (_, y) => (
          <Block key={`wb${x}${y}`} position={[x, y + 1, -0.5]} color={y === 2 ? "#374151" : "#4a5568"} />
        ))
      )}
      {Array.from({ length: 12 }, (_, z) =>
        Array.from({ length: 3 }, (_, y) => (
          <Block key={`wl${z}${y}`} position={[-0.5, y + 1, z]} color="#4a5568" />
        ))
      )}
      {Array.from({ length: 12 }, (_, z) =>
        Array.from({ length: 3 }, (_, y) => (
          <Block key={`wr${z}${y}`} position={[11.5, y + 1, z]} color="#4a5568" />
        ))
      )}
      {[2, 5, 8].map(x => (
        <mesh key={`win${x}`} position={[x, 2, -0.45]}>
          <planeGeometry args={[1.5, 1]} />
          <meshBasicMaterial color="#2a5a8f" transparent opacity={0.6} />
        </mesh>
      ))}
      <Block position={[6, 0.01, 6]} color="#7b3060" args={[3, 0.02, 2.5]} />
      <Block position={[6, 0.35, 8]} color="#6b3090" args={[2.5, 0.5, 0.7]} />
      <Block position={[6, 0.7, 8.3]} color="#5a2878" args={[2.5, 0.5, 0.15]} />
      <group>
        <Block position={[1, 0.6, 1]} color="#8b4513" args={[0.3, 0.4, 0.3]} />
        <Block position={[1, 1.0, 1]} color="#2d8b4e" args={[0.5, 0.5, 0.5]} />
        <Block position={[10, 0.6, 1]} color="#8b4513" args={[0.3, 0.4, 0.3]} />
        <Block position={[10, 1.0, 1]} color="#4ec870" args={[0.5, 0.5, 0.5]} />
      </group>
      <Block position={[10, 0.5, 10]} color="#5c3a1e" args={[0.4, 0.8, 0.4]} />
      <pointLight position={[6, 3.5, 6]} intensity={2} color="#ffeedd" distance={15} />
    </group>
  );
}

// ─── MAIN ───
export function VirtualOffice3D({ bots, selectedBotId, onSelectBot }: Props) {
  const [nearBot, setNearBot] = useState<AiBot | null>(null);
  const [chatBot, setChatBot] = useState<AiBot | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { projectId } = useCurrentProject();
  const { currentOrganization } = useOrganizations();
  const { user } = useAuth();

  const botPositions = useMemo<[number, number, number][]>(() => [
    [2, 0, 2], [5, 0, 2], [8, 0, 2], [2, 0, 5], [5, 0, 5], [8, 0, 5],
  ], []);

  const deskPositions = useMemo<[number, number, number][]>(() => [
    [2, 0, 1.3], [5, 0, 1.3], [8, 0, 1.3], [2, 0, 4.3], [5, 0, 4.3], [8, 0, 4.3],
  ], []);

  const openChat = useCallback((bot: AiBot) => {
    setChatBot(bot);
    setChatMessages([{
      role: "assistant",
      content: `Здравейте! Аз съм ${bot.name} — ${bot.role}.\nМога да помогна с: ${(bot.skills || []).join(", ")}.\n\nКакво да направя?`
    }]);
    document.exitPointerLock?.();
    setTimeout(() => chatInputRef.current?.focus(), 100);
  }, []);

  const sendMsg = useCallback(async () => {
    if (!chatInput.trim() || !chatBot || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(p => [...p, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const { data } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: [...chatMessages.slice(-8), { role: "user", content: msg }],
          projectId, organizationId: currentOrganization?.id, context: "business", userId: user?.id,
          moduleSystemPrompt: `Ти си ${chatBot.name}, ${chatBot.role}. Умения: ${(chatBot.skills || []).join(", ")}. Кратко на български.`,
        },
      });
      setChatMessages(p => [...p, { role: "assistant", content: data?.content || "Грешка." }]);
    } catch {
      setChatMessages(p => [...p, { role: "assistant", content: "⚠️ Грешка." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatInput, chatBot, chatLoading, chatMessages, projectId, currentOrganization, user]);

  const working = bots.filter(b => b.state === "working").length;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a] border-b border-[#2a2a4a]">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-purple-400">Виртуален Офис 3D</h3>
        <div className="flex gap-4 text-[11px] text-gray-500">
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />{working} работят</span>
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1" />{bots.length - working} чакат</span>
        </div>
      </div>

      <div className="flex relative" style={{ height: "520px" }}>
        <div className={`${chatBot ? "flex-1" : "w-full"} relative cursor-crosshair`}>
          <Canvas shadows camera={{ fov: 70, near: 0.1, far: 100 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[8, 10, 5]} intensity={0.6} />
            <color attach="background" args={["#87CEEB"]} />
            <fog attach="fog" args={["#87CEEB", 15, 30]} />
            <Room />
            {deskPositions.slice(0, bots.length).map((p, i) => <Desk key={i} position={p} />)}
            {bots.map((bot, i) => i < botPositions.length ? (
              <BotChar key={bot.id} bot={bot} position={botPositions[i]} isNear={nearBot?.id === bot.id} onClick={() => openChat(bot)} />
            ) : null)}
            <Player onNearBot={setNearBot} botPositions={botPositions} bots={bots} onInteract={openChat} chatOpen={!!chatBot} />
          </Canvas>

          {/* Crosshair */}
          {!chatBot && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full opacity-50 pointer-events-none" />}

          {/* Near bot hint */}
          {nearBot && !chatBot && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0f0f1aEE] border border-purple-500/30 px-4 py-2 rounded-xl pointer-events-none">
              <p className="text-sm text-white">[E] Говори с <span className="text-purple-400 font-semibold">{nearBot.name}</span> — {nearBot.role}</p>
            </div>
          )}

          {!chatBot && !nearBot && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-gray-500 pointer-events-none">
              Кликни за камера | WASD = Ходи | E = Говори | ESC = Мишка
            </div>
          )}
        </div>

        {/* Chat */}
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
              <button onClick={() => setChatBot(null)} className="text-gray-500 hover:text-white p-1"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-purple-600 text-white rounded-br-md" : "bg-[#1a1a2e] text-gray-200 border border-[#2a2a4a] rounded-bl-md"
                  }`}>{m.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl px-3 py-2 flex gap-1">
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
                <input ref={chatInputRef} type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendMsg(); }}
                  placeholder={`Говори с ${chatBot.name}...`}
                  className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none" />
                <button onClick={sendMsg} disabled={!chatInput.trim() || chatLoading}
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
