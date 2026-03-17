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

function Block({ position, color, args }: { position: [number, number, number]; color: string; args?: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args || [1, 1, 1]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// ─── ONE BIG ROOM ───
const RW = 16, RD = 12; // room width, depth

function Room() {
  const wallH = 3;
  return (
    <group>
      {/* Floor */}
      {Array.from({ length: RW }, (_, x) =>
        Array.from({ length: RD }, (_, z) => (
          <Block key={`f${x}${z}`} position={[x, 0, z]} color={(x + z) % 2 === 0 ? "#3d3524" : "#352e1f"} />
        ))
      )}
      {/* Back wall */}
      {Array.from({ length: RW }, (_, x) =>
        Array.from({ length: wallH }, (_, y) => (
          <Block key={`wb${x}${y}`} position={[x, y + 1, -0.5]} color="#4a5568" />
        ))
      )}
      {/* Front wall */}
      {Array.from({ length: RW }, (_, x) =>
        Array.from({ length: wallH }, (_, y) => (
          <Block key={`wf${x}${y}`} position={[x, y + 1, RD - 0.5]} color="#4a5568" />
        ))
      )}
      {/* Left wall */}
      {Array.from({ length: RD }, (_, z) =>
        Array.from({ length: wallH }, (_, y) => (
          <Block key={`wl${z}${y}`} position={[-0.5, y + 1, z]} color="#4a5568" />
        ))
      )}
      {/* Right wall */}
      {Array.from({ length: RD }, (_, z) =>
        Array.from({ length: wallH }, (_, y) => (
          <Block key={`wr${z}${y}`} position={[RW - 0.5, y + 1, z]} color="#4a5568" />
        ))
      )}
      {/* Ceiling */}
      <Block position={[RW / 2 - 0.5, wallH + 0.5, RD / 2 - 0.5]} color="#374151" args={[RW, 0.1, RD]} />
      {/* Windows on back wall */}
      {[3, 8, 13].map(x => (
        <mesh key={`win${x}`} position={[x, 2, -0.35]}>
          <planeGeometry args={[2, 1.5]} />
          <meshBasicMaterial color="#2a5a8f" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Room label */}
      <Block position={[RW / 2 - 0.5, 3, -0.3]} color="#c084fc" args={[6, 0.5, 0.1]} />
      {/* Lights */}
      <pointLight position={[4, 3, 3]} intensity={2} distance={12} color="#ffeedd" />
      <pointLight position={[12, 3, 3]} intensity={2} distance={12} color="#ffeedd" />
      <pointLight position={[4, 3, 9]} intensity={2} distance={12} color="#ffeedd" />
      <pointLight position={[12, 3, 9]} intensity={2} distance={12} color="#ffeedd" />
      {/* Plants */}
      <Block position={[0.5, 0.4, 0.5]} color="#8b4513" args={[0.3, 0.5, 0.3]} />
      <Block position={[0.5, 0.8, 0.5]} color="#2d8b4e" args={[0.5, 0.5, 0.5]} />
      <Block position={[RW - 1.5, 0.4, 0.5]} color="#8b4513" args={[0.3, 0.5, 0.3]} />
      <Block position={[RW - 1.5, 0.8, 0.5]} color="#4ec870" args={[0.5, 0.5, 0.5]} />
      {/* Couch */}
      <Block position={[RW / 2 - 0.5, 0.3, RD - 2]} color="#6b3090" args={[3, 0.5, 0.8]} />
      <Block position={[RW / 2 - 0.5, 0.6, RD - 1.7]} color="#5a2878" args={[3, 0.5, 0.2]} />
    </group>
  );
}

function Desk({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group>
      <Block position={[x, y + 0.75, z]} color="#8b7050" args={[1.2, 0.08, 0.6]} />
      <Block position={[x - 0.5, y + 0.37, z]} color="#6b5030" args={[0.06, 0.74, 0.06]} />
      <Block position={[x + 0.5, y + 0.37, z]} color="#6b5030" args={[0.06, 0.74, 0.06]} />
      <Block position={[x, y + 1.05, z - 0.15]} color="#1f2937" args={[0.5, 0.35, 0.04]} />
      <Block position={[x, y + 0.82, z + 0.1]} color="#4b5563" args={[0.3, 0.02, 0.12]} />
    </group>
  );
}

function BotChar({ bot, position, isSelected, onClick }: { bot: AiBot; position: [number, number, number]; isSelected: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 1.5 + position[0]) * 0.02; });
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <Block position={[-0.08, 0.15, 0]} color="#2d2d4a" args={[0.12, 0.3, 0.12]} />
      <Block position={[0.08, 0.15, 0]} color="#2d2d4a" args={[0.12, 0.3, 0.12]} />
      <Block position={[0, 0.5, 0]} color={bot.shirtColor} args={[0.35, 0.4, 0.2]} />
      <Block position={[-0.25, 0.5, 0]} color={bot.skinColor} args={[0.12, 0.35, 0.12]} />
      <Block position={[0.25, 0.5, 0]} color={bot.skinColor} args={[0.12, 0.35, 0.12]} />
      <Block position={[0, 0.85, 0]} color={bot.skinColor} args={[0.3, 0.3, 0.3]} />
      <Block position={[0, 0.97, 0]} color={bot.hairColor} args={[0.32, 0.12, 0.32]} />
      <Block position={[-0.06, 0.85, 0.16]} color="#1a1a2e" args={[0.05, 0.05, 0.01]} />
      <Block position={[0.06, 0.85, 0.16]} color="#1a1a2e" args={[0.05, 0.05, 0.01]} />
      {isSelected && <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.6, 1.4, 0.5]} /><meshBasicMaterial color="#c084fc" transparent opacity={0.15} /></mesh>}
    </group>
  );
}

// ─── BOT LABELS (HTML overlay projected from 3D) ───
function BotLabels({ bots, positions, canvasRef }: { bots: AiBot[]; positions: [number, number, number][]; canvasRef: React.RefObject<HTMLDivElement> }) {
  const [labels, setLabels] = useState<{ name: string; role: string; x: number; y: number; visible: boolean; color: string }[]>([]);

  // We need camera from parent - use a shared ref
  return (
    <>
      {labels.map((l, i) => l.visible && (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%, -100%)" }}>
          <div className="text-center">
            <span className="text-[11px] font-bold text-white bg-[#0f0f1aDD] px-2 py-0.5 rounded" style={{ borderBottom: `2px solid ${l.color}` }}>{l.name}</span>
            <br />
            <span className="text-[9px] text-gray-400 bg-[#0f0f1a99] px-1.5 py-0.5 rounded">{l.role}</span>
          </div>
        </div>
      ))}
    </>
  );
}

// Component inside Canvas that projects bot positions to screen coords
function LabelProjector({ bots, positions, onUpdate }: {
  bots: AiBot[]; positions: [number, number, number][];
  onUpdate: (labels: { name: string; role: string; x: number; y: number; visible: boolean; color: string }[]) => void;
}) {
  const { camera, size } = useThree();
  const vec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const result = bots.map((bot, i) => {
      if (i >= positions.length) return { name: bot.name, role: bot.role, x: -100, y: -100, visible: false, color: bot.shirtColor };
      vec.set(positions[i][0], 1.5, positions[i][2]);
      vec.project(camera);
      const x = (vec.x * 0.5 + 0.5) * 100;
      const y = (-vec.y * 0.5 + 0.5) * 100;
      const behind = vec.z > 1;
      return { name: bot.name, role: bot.role, x, y, visible: !behind && x > -10 && x < 110 && y > -10 && y < 110, color: bot.shirtColor };
    });
    onUpdate(result);
  });

  return null;
}

// ─── FIRST PERSON: WASD walk + mouse look ───
function FPController({ chatOpen, onNearBot, botPositions, bots, onInteract }: {
  chatOpen: boolean; onNearBot: (b: AiBot | null) => void;
  botPositions: [number, number, number][]; bots: AiBot[]; onInteract: (b: AiBot) => void;
}) {
  const pos = useRef(new THREE.Vector3(RW / 2, 1.6, RD - 3));
  const rotY = useRef(Math.PI); // face forward (toward bots)
  const rotX = useRef(0);
  const keys = useRef<Set<string>>(new Set());
  const nearRef = useRef<AiBot | null>(null);
  const isDrag = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const { camera, gl } = useThree();

  useEffect(() => {
    camera.position.copy(pos.current);
    const euler = new THREE.Euler(0, rotY.current, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);
  }, [camera]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (chatOpen || document.activeElement?.tagName === "INPUT") return;
      // Support both latin and cyrillic keyboard layouts
      const keyMap: Record<string, string> = { "ц": "w", "ф": "a", "ы": "s", "в": "d", "у": "e", "і": "s", "ь": "s" };
      const k = keyMap[e.key.toLowerCase()] || e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(k)) { e.preventDefault(); keys.current.add(k); }
      if (k === "e" && nearRef.current) onInteract(nearRef.current);
    };
    const onUp = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = { "ц": "w", "ф": "a", "ы": "s", "в": "d" };
      keys.current.delete(keyMap[e.key.toLowerCase()] || e.key.toLowerCase());
    };

    // Mouse drag to look around
    const canvas = gl.domElement;
    const onMouseDown = (e: MouseEvent) => { isDrag.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag.current || chatOpen) return;
      rotY.current -= (e.clientX - lastMouse.current.x) * 0.004;
      rotX.current = Math.max(-0.8, Math.min(0.8, rotX.current - (e.clientY - lastMouse.current.y) * 0.004));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDrag.current = false; };

    // Focus canvas on click so keyboard works
    const onClick = () => { canvas.focus(); };
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.focus();

    canvas.addEventListener("keydown", onDown);
    canvas.addEventListener("keyup", onUp);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("click", onClick);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      canvas.removeEventListener("keydown", onDown);
      canvas.removeEventListener("keyup", onUp);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [chatOpen, onInteract, gl]);

  useFrame(() => {
    if (chatOpen) return;
    const speed = 0.08;
    const k = keys.current;
    const p = pos.current;

    // Movement relative to camera direction
    const forward = new THREE.Vector3(-Math.sin(rotY.current), 0, -Math.cos(rotY.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    let dx = 0, dz = 0;
    if (k.has("w")) { dx += forward.x * speed; dz += forward.z * speed; }
    if (k.has("s")) { dx -= forward.x * speed; dz -= forward.z * speed; }
    if (k.has("a")) { dx -= right.x * speed; dz -= right.z * speed; }
    if (k.has("d")) { dx += right.x * speed; dz += right.z * speed; }

    // Wall collision
    const nx = p.x + dx, nz = p.z + dz;
    if (nx > 0.5 && nx < RW - 1.5) p.x = nx;
    if (nz > 0.5 && nz < RD - 1.5) p.z = nz;

    p.y = 1.6;
    camera.position.copy(p);
    const euler = new THREE.Euler(rotX.current, rotY.current, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);

    // Near bots
    let nearest: AiBot | null = null, nd = 2.5;
    for (let i = 0; i < botPositions.length && i < bots.length; i++) {
      const d = Math.sqrt((p.x - botPositions[i][0]) ** 2 + (p.z - botPositions[i][2]) ** 2);
      if (d < nd) { nd = d; nearest = bots[i]; }
    }
    nearRef.current = nearest;
    onNearBot(nearest);
  });

  return null;
}

// ─── MAIN ───
export function VirtualOffice3D({ bots, selectedBotId, onSelectBot }: Props) {
  const [nearBot, setNearBot] = useState<AiBot | null>(null);
  const [chatBot, setChatBot] = useState<AiBot | null>(null);
  const [botLabels, setBotLabels] = useState<{ name: string; role: string; x: number; y: number; visible: boolean; color: string }[]>([]);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { projectId } = useCurrentProject();
  const { currentOrganization } = useOrganizations();
  const { user } = useAuth();

  // Bot positions: 2 rows of 3
  const botPositions = useMemo<[number, number, number][]>(() => [
    [3, 0, 3], [7, 0, 3], [11, 0, 3],
    [3, 0, 7], [7, 0, 7], [11, 0, 7],
  ], []);

  const deskPositions = useMemo<[number, number, number][]>(() => [
    [3, 0, 2], [7, 0, 2], [11, 0, 2],
    [3, 0, 6], [7, 0, 6], [11, 0, 6],
  ], []);

  const openChat = useCallback((bot: AiBot) => {
    setChatBot(bot);
    setChatMessages([{ role: "assistant", content: `Здравейте! Аз съм ${bot.name} — ${bot.role}.\nМога да помогна с: ${(bot.skills || []).join(", ")}.\n\nКакво да направя?` }]);
    setChatInput("");
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
        body: { messages: [...chatMessages.slice(-8), { role: "user", content: msg }], projectId, organizationId: currentOrganization?.id, context: "business", userId: user?.id,
          moduleSystemPrompt: `Ти си ${chatBot.name}, ${chatBot.role}. Умения: ${(chatBot.skills || []).join(", ")}. Кратко на български.` },
      });
      setChatMessages(p => [...p, { role: "assistant", content: data?.content || "Грешка." }]);
    } catch { setChatMessages(p => [...p, { role: "assistant", content: "⚠️ Грешка." }]); }
    finally { setChatLoading(false); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }
  }, [chatInput, chatBot, chatLoading, chatMessages, projectId, currentOrganization, user]);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a] border-b border-[#2a2a4a]">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-purple-400">Virtual Office 3D</h3>
        <div className="flex gap-4 text-[11px] text-gray-500">
          <span>{bots.length} bots</span>
        </div>
      </div>

      <div className="flex relative" style={{ height: "500px" }}>
        <div className={`${chatBot ? "flex-1" : "w-full"} relative`}>
          <Canvas camera={{ fov: 70, near: 0.1, far: 50 }}>
            <ambientLight intensity={0.5} />
            <color attach="background" args={["#1a1a2e"]} />
            <Room />
            {deskPositions.slice(0, bots.length).map((p, i) => <Desk key={i} position={p} />)}
            {bots.map((bot, i) => i < botPositions.length ? (
              <BotChar key={bot.id} bot={bot} position={botPositions[i]} isSelected={chatBot?.id === bot.id} onClick={() => openChat(bot)} />
            ) : null)}
            <FPController chatOpen={!!chatBot} onNearBot={setNearBot} botPositions={botPositions} bots={bots} onInteract={openChat} />
            <LabelProjector bots={bots} positions={botPositions} onUpdate={setBotLabels} />
          </Canvas>

          {/* Bot name labels */}
          {botLabels.map((l, i) => l.visible && (
            <div key={i} className="absolute pointer-events-none" style={{ left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%, -100%)" }}>
              <div className="text-center whitespace-nowrap">
                <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded" style={{ background: "#0f0f1aDD", borderBottom: `2px solid ${l.color}` }}>{l.name}</span>
                <br />
                <span className="text-[9px] text-gray-400 px-1.5 rounded" style={{ background: "#0f0f1a99" }}>{l.role}</span>
              </div>
            </div>
          ))}

          {nearBot && !chatBot && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#0f0f1aEE] border border-purple-500/30 px-4 py-2 rounded-xl pointer-events-none">
              <p className="text-sm text-white">[E] Talk to <span className="text-purple-400 font-semibold">{nearBot.name}</span></p>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-gray-500 pointer-events-none">
            WASD=Walk | Drag=Look around | E=Talk | Click=Chat
          </div>
        </div>

        {chatBot && (
          <div className="w-[340px] shrink-0 flex flex-col bg-[#0f0f1a] border-l border-[#2a2a4a]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a4a]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: chatBot.shirtColor }} />
                <div><p className="text-sm font-semibold text-white">{chatBot.name}</p><p className="text-[10px] text-gray-500">{chatBot.role}</p></div>
              </div>
              <button onClick={() => setChatBot(null)} className="text-gray-500 hover:text-white p-1"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-purple-600 text-white rounded-br-md" : "bg-[#1a1a2e] text-gray-200 border border-[#2a2a4a] rounded-bl-md"}`}>{m.content}</div>
                </div>
              ))}
              {chatLoading && <div className="flex justify-start"><div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl px-3 py-2 flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" /><span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} /><span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2 border-t border-[#2a2a4a]">
              <div className="flex items-center gap-2 bg-[#1a1a2e] rounded-full px-3 py-1.5 border border-[#2a2a4a] focus-within:border-purple-500/50">
                <input ref={chatInputRef} type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMsg(); }}
                  placeholder={`Talk to ${chatBot.name}...`} className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none" />
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
