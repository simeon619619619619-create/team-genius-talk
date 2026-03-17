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
function Block({ position, color, args }: {
  position: [number, number, number]; color: string; args?: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args || [1, 1, 1]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// ─── ROOM (4 rooms with labels) ───
const ROOMS = [
  { name: "MARKETING", color: "#34d399", x: 0, z: 0 },
  { name: "SALES", color: "#fb923c", x: 12, z: 0 },
  { name: "ACCOUNTING", color: "#60a5fa", x: 0, z: 10 },
  { name: "WEB DEV", color: "#a78bfa", x: 12, z: 10 },
];

function Office() {
  // Room dimensions: 10 wide (x) × 8 deep (z), door at x+4..x+6
  const W = 10, D = 8;
  const wallH = 3;

  const wallBlock = (x: number, y: number, z: number, key: string) => (
    <Block key={key} position={[x, y, z]} color="#4a5568" args={[1, 1, 1]} />
  );

  return (
    <group>
      {ROOMS.map((room, ri) => {
        const rx = room.x, rz = room.z;
        const walls: JSX.Element[] = [];

        // Back wall (z = rz - 0.5) — full
        for (let x = 0; x < W; x++)
          for (let y = 1; y <= wallH; y++)
            walls.push(wallBlock(rx + x, y, rz - 0.5, `wb${ri}${x}${y}`));

        // Left wall (x = rx - 0.5) — door opening at z+3..z+5
        for (let z = 0; z < D; z++)
          for (let y = 1; y <= wallH; y++)
            if (z < 3 || z > 4 || y > 2)
              walls.push(wallBlock(rx - 0.5, y, rz + z, `wl${ri}${z}${y}`));

        // Right wall (x = rx + W - 0.5) — door at z+3..z+5
        for (let z = 0; z < D; z++)
          for (let y = 1; y <= wallH; y++)
            if (z < 3 || z > 4 || y > 2)
              walls.push(wallBlock(rx + W - 0.5, y, rz + z, `wr${ri}${z}${y}`));

        // Front wall (z = rz + D - 0.5) — door at x+4..x+6
        for (let x = 0; x < W; x++)
          for (let y = 1; y <= wallH; y++)
            if (x < 4 || x > 5 || y > 2)
              walls.push(wallBlock(rx + x, y, rz + D - 0.5, `wf${ri}${x}${y}`));

        return (
          <group key={ri}>
            {/* Floor */}
            {Array.from({ length: W }, (_, x) =>
              Array.from({ length: D }, (_, z) => (
                <Block key={`f${ri}${x}${z}`} position={[rx + x, 0, rz + z]}
                  color={(x + z) % 2 === 0 ? "#3d3524" : "#352e1f"} />
              ))
            )}
            {/* Walls */}
            {walls}
            {/* Colored floor strip */}
            <Block position={[rx + 4.5, 0.02, rz + 0.5]} color={room.color} args={[9, 0.04, 1]} />
            {/* Room label block on back wall */}
            <Block position={[rx + 4.5, 2.8, rz - 0.3]} color={room.color} args={[4, 0.5, 0.1]} />
            {/* Window */}
            <mesh position={[rx + 4.5, 1.8, rz - 0.3]}>
              <planeGeometry args={[3, 1.2]} />
              <meshBasicMaterial color="#1e3a5f" transparent opacity={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* Hallway floors connecting rooms */}
      {Array.from({ length: 4 }, (_, x) =>
        Array.from({ length: 20 }, (_, z) => (
          <Block key={`hv${x}${z}`} position={[9 + x, 0, z - 1]} color={(x + z) % 2 === 0 ? "#2a2418" : "#252015"} />
        ))
      )}
      {Array.from({ length: 24 }, (_, x) =>
        Array.from({ length: 4 }, (_, z) => (
          <Block key={`hh${x}${z}`} position={[x - 1, 0, 7 + z]} color={(x + z) % 2 === 0 ? "#2a2418" : "#252015"} />
        ))
      )}

      {/* Ceiling for rooms */}
      {ROOMS.map((room, ri) => (
        <Block key={`ceil${ri}`} position={[room.x + 4.5, wallH + 0.5, room.z + 3.5]} color="#374151" args={[W, 0.1, D]} />
      ))}
      {/* Corridor ceilings */}
      <Block position={[11, wallH + 0.5, 9]} color="#374151" args={[5, 0.1, 20]} />
      <Block position={[11, wallH + 0.5, 9]} color="#374151" args={[24, 0.1, 5]} />
      {/* Corridor walls (outer edges) */}
      {Array.from({ length: 20 }, (_, z) => (
        <group key={`cw${z}`}>
          {z < 7 || z > 11 ? <>
            <Block position={[8.5, 1.5, z - 1]} color="#3d4556" args={[1, 3, 1]} />
            <Block position={[13.5, 1.5, z - 1]} color="#3d4556" args={[1, 3, 1]} />
          </> : null}
        </group>
      ))}
      {Array.from({ length: 24 }, (_, x) => (
        <group key={`ch${x}`}>
          {x < 9 || x > 13 ? <>
            <Block position={[x - 1, 1.5, 6.5]} color="#3d4556" args={[1, 3, 1]} />
            <Block position={[x - 1, 1.5, 11.5]} color="#3d4556" args={[1, 3, 1]} />
          </> : null}
        </group>
      ))}

      {/* Lights — brighter */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 4, 4]} intensity={2} distance={15} color="#ffeedd" />
      <pointLight position={[17, 4, 4]} intensity={2} distance={15} color="#ffeedd" />
      <pointLight position={[5, 4, 14]} intensity={2} distance={15} color="#ffeedd" />
      <pointLight position={[17, 4, 14]} intensity={2} distance={15} color="#ffeedd" />
      <pointLight position={[11, 4, 9]} intensity={2} distance={15} color="#ffeedd" />
    </group>
  );
}

// ─── DESK ───
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

// ─── BOT CHARACTER ───
function BotChar({ bot, position, isSelected, onClick }: {
  bot: AiBot; position: [number, number, number]; isSelected: boolean; onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 1.5 + position[0]) * 0.02;
  });

  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Legs */}
      <Block position={[-0.08, 0.15, 0]} color="#2d2d4a" args={[0.12, 0.3, 0.12]} />
      <Block position={[0.08, 0.15, 0]} color="#2d2d4a" args={[0.12, 0.3, 0.12]} />
      {/* Body */}
      <Block position={[0, 0.5, 0]} color={bot.shirtColor} args={[0.3, 0.35, 0.18]} />
      {/* Arms */}
      <Block position={[-0.22, 0.5, 0]} color={bot.skinColor} args={[0.1, 0.3, 0.1]} />
      <Block position={[0.22, 0.5, 0]} color={bot.skinColor} args={[0.1, 0.3, 0.1]} />
      {/* Head */}
      <Block position={[0, 0.85, 0]} color={bot.skinColor} args={[0.25, 0.25, 0.25]} />
      {/* Hair */}
      <Block position={[0, 0.97, 0]} color={bot.hairColor} args={[0.27, 0.08, 0.27]} />
      {/* Eyes */}
      <Block position={[-0.06, 0.85, 0.13]} color="#1a1a2e" args={[0.04, 0.04, 0.01]} />
      <Block position={[0.06, 0.85, 0.13]} color="#1a1a2e" args={[0.04, 0.04, 0.01]} />
      {/* Selection glow */}
      {isSelected && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.5, 1.2, 0.4]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.2} />
        </mesh>
      )}
      {/* Name plate */}
      <Block position={[0, 1.25, 0]} color="#0f0f1aCC" args={[0.6, 0.15, 0.02]} />
      <Block position={[0, 1.25, 0.02]} color={bot.shirtColor} args={[0.58, 0.02, 0.01]} />
    </group>
  );
}

// ─── BOT LAYOUT per room ───
const BOT_SLOTS: Record<string, [number, number, number][]> = {
  MARKETING: [[1.5, 0, 2], [4, 0, 2], [6.5, 0, 2], [1.5, 0, 5], [4, 0, 5], [6.5, 0, 5]],
  SALES: [[13.5, 0, 2], [16, 0, 2], [18.5, 0, 2], [13.5, 0, 5], [16, 0, 5], [18.5, 0, 5]],
  ACCOUNTING: [[1.5, 0, 12], [4, 0, 12], [6.5, 0, 12], [1.5, 0, 15], [4, 0, 15], [6.5, 0, 15]],
  "WEB DEV": [[13.5, 0, 12], [16, 0, 12], [18.5, 0, 12], [13.5, 0, 15], [16, 0, 15], [18.5, 0, 15]],
};

// ─── COLLISION: build walkable map ───
// Rooms: MARKETING(0,0) SALES(12,0) ACCOUNTING(0,10) WEBDEV(12,10)
// Each room: 10x8 tiles. Corridors: 2 tiles wide
function canWalk(x: number, z: number): boolean {
  const margin = 0.35;

  // Room interiors (with margin from walls)
  for (const room of ROOMS) {
    const rx = room.x, rz = room.z;
    if (x > rx + margin && x < rx + 9 - margin && z > rz + margin && z < rz + 7 - margin) {
      return true;
    }
  }

  // Vertical corridor (between left and right rooms): x = 9.5 to 12.5
  if (x > 9.5 + margin && x < 12.5 - margin) {
    // Full vertical length
    if (z > -0.5 && z < 18.5) return true;
  }

  // Horizontal corridor (between top and bottom rooms): z = 7.5 to 10.5
  if (z > 7.5 + margin && z < 10.5 - margin) {
    // Full horizontal length
    if (x > -0.5 && x < 22.5) return true;
  }

  // Door openings from rooms to corridors
  for (const room of ROOMS) {
    const rx = room.x, rz = room.z;
    // Right door (connecting to vertical corridor)
    if (x > rx + 8.5 && x < rx + 10.5 && z > rz + 2.8 && z < rz + 5.2) return true;
    // Left door (if room is on right side)
    if (rx > 5 && x > rx - 1.5 && x < rx + 0.5 && z > rz + 2.8 && z < rz + 5.2) return true;
    // Front door (connecting to horizontal corridor)
    if (z > rz + 6.5 && z < rz + 8.5 && x > rx + 3.8 && x < rx + 6.2) return true;
    // Back door (if room is on bottom row)
    if (rz > 5 && z > rz - 1.5 && z < rz + 0.5 && x > rx + 3.8 && x < rx + 6.2) return true;
  }

  return false;
}

// ─── FIRST PERSON CAMERA + WASD + COLLISION ───
function FirstPersonController({ chatOpen, onNearBot, botAssignments, onInteract }: {
  chatOpen: boolean;
  onNearBot: (bot: AiBot | null) => void;
  botAssignments: { bot: AiBot; position: [number, number, number] }[];
  onInteract: (bot: AiBot) => void;
}) {
  const pos = useRef(new THREE.Vector3(11, 1.6, 9));
  const rotY = useRef(0);
  const rotX = useRef(0);
  const keys = useRef<Set<string>>(new Set());
  const nearRef = useRef<AiBot | null>(null);
  const isDrag = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const { camera, gl } = useThree();

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (chatOpen || document.activeElement?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
        e.preventDefault();
        keys.current.add(k);
      }
      if (k === "e" && nearRef.current) onInteract(nearRef.current);
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

    const canvas = gl.domElement;
    const onMouseDown = (e: MouseEvent) => { isDrag.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag.current) return;
      rotY.current -= (e.clientX - lastMouse.current.x) * 0.003;
      rotX.current = Math.max(-1, Math.min(1, rotX.current - (e.clientY - lastMouse.current.y) * 0.003));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDrag.current = false; };
    const onCtx = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", onCtx);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("contextmenu", onCtx);
    };
  }, [chatOpen, gl, onInteract]);

  useFrame(() => {
    if (chatOpen) return;
    const speed = 0.08;
    const k = keys.current;
    const p = pos.current;

    const forward = new THREE.Vector3(-Math.sin(rotY.current), 0, -Math.cos(rotY.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    let dx = 0, dz = 0;
    if (k.has("w") || k.has("arrowup")) { dx += forward.x * speed; dz += forward.z * speed; }
    if (k.has("s") || k.has("arrowdown")) { dx -= forward.x * speed; dz -= forward.z * speed; }
    if (k.has("a") || k.has("arrowleft")) { dx -= right.x * speed; dz -= right.z * speed; }
    if (k.has("d") || k.has("arrowright")) { dx += right.x * speed; dz += right.z * speed; }

    // Collision: try X and Z separately
    if (canWalk(p.x + dx, p.z)) p.x += dx;
    if (canWalk(p.x, p.z + dz)) p.z += dz;

    // First-person camera at eye height
    p.y = 1.6;
    camera.position.copy(p);
    const euler = new THREE.Euler(rotX.current, rotY.current, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);

    // Near bots
    let nearest: AiBot | null = null;
    let nd = 2.5;
    for (const { bot, position } of botAssignments) {
      const bx = p.x - position[0];
      const bz = p.z - position[2];
      const d = Math.sqrt(bx * bx + bz * bz);
      if (d < nd) { nd = d; nearest = bot; }
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
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { projectId } = useCurrentProject();
  const { currentOrganization } = useOrganizations();
  const { user } = useAuth();

  // Assign bots to rooms
  const botRoomAssignments = useMemo(() => {
    const assignments: { bot: AiBot; room: string; position: [number, number, number]; deskPos: [number, number, number] }[] = [];
    const roomBots: Record<string, AiBot[]> = { MARKETING: [], SALES: [], ACCOUNTING: [], "WEB DEV": [] };

    for (const bot of bots) {
      const skills = (bot.skills || []).join(" ").toLowerCase() + " " + bot.role.toLowerCase();
      if (skills.includes("контент") || skills.includes("реклам") || skills.includes("соц") || skills.includes("market") || skills.includes("copywriting")) {
        roomBots.MARKETING.push(bot);
      } else if (skills.includes("продажб") || skills.includes("клиент") || skills.includes("crm") || skills.includes("sales") || skills.includes("lead")) {
        roomBots.SALES.push(bot);
      } else if (skills.includes("финанс") || skills.includes("kpi") || skills.includes("стратег") || skills.includes("анализ") || skills.includes("account")) {
        roomBots.ACCOUNTING.push(bot);
      } else if (skills.includes("уеб") || skills.includes("seo") || skills.includes("web") || skills.includes("dev") || skills.includes("проджект")) {
        roomBots["WEB DEV"].push(bot);
      } else {
        // Default to marketing
        roomBots.MARKETING.push(bot);
      }
    }

    for (const [room, roomBotList] of Object.entries(roomBots)) {
      const slots = BOT_SLOTS[room] || [];
      roomBotList.forEach((bot, i) => {
        if (i < slots.length) {
          const [sx, sy, sz] = slots[i];
          assignments.push({
            bot,
            room,
            position: [sx, 0, sz + 1],
            deskPos: [sx, 0, sz],
          });
        }
      });
    }
    return assignments;
  }, [bots]);

  const openChat = useCallback((bot: AiBot) => {
    setChatBot(bot);
    setChatMessages([{
      role: "assistant",
      content: `Hi! I'm ${bot.name} — ${bot.role}.\nI can help with: ${(bot.skills || []).join(", ")}.\n\nWhat should I do?`
    }]);
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
        body: {
          messages: [...chatMessages.slice(-8), { role: "user", content: msg }],
          projectId, organizationId: currentOrganization?.id, context: "business", userId: user?.id,
          moduleSystemPrompt: `You are ${chatBot.name}, ${chatBot.role}. Skills: ${(chatBot.skills || []).join(", ")}. Answer in Bulgarian, be concise.`,
        },
      });
      setChatMessages(p => [...p, { role: "assistant", content: data?.content || "Error." }]);
    } catch {
      setChatMessages(p => [...p, { role: "assistant", content: "⚠️ Connection error." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatInput, chatBot, chatLoading, chatMessages, projectId, currentOrganization, user]);

  const working = bots.filter(b => b.state === "working").length;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a] border-b border-[#2a2a4a]">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-purple-400">Virtual Office 3D</h3>
        <div className="flex gap-4 text-[11px] text-gray-500">
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />{working} working</span>
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1" />{bots.length - working} idle</span>
          <span>{bots.length} total</span>
        </div>
      </div>

      <div className="flex relative" style={{ height: "520px" }}>
        <div className={`${chatBot ? "flex-1" : "w-full"} relative`}>
          <Canvas camera={{ position: [11, 18, 25], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[15, 20, 10]} intensity={0.8} />
            <color attach="background" args={["#1a1a2e"]} />
            <fog attach="fog" args={["#1a1a2e", 30, 60]} />

            <Office />

            {botRoomAssignments.map(({ bot, deskPos, position }) => (
              <group key={bot.id}>
                <Desk position={deskPos} />
                <BotChar
                  bot={bot}
                  position={position}
                  isSelected={selectedBotId === bot.id || chatBot?.id === bot.id}
                  onClick={() => openChat(bot)}
                />
              </group>
            ))}

            <FirstPersonController
              chatOpen={!!chatBot}
              onNearBot={setNearBot}
              botAssignments={botRoomAssignments}
              onInteract={openChat}
            />
          </Canvas>

          {/* Room labels overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
            {ROOMS.map(r => (
              <span key={r.name} className="px-2 py-1 rounded text-[10px] font-bold tracking-wider" style={{ background: r.color + "33", color: r.color, border: `1px solid ${r.color}44` }}>
                {r.name}
              </span>
            ))}
          </div>

          {/* Near bot hint */}
          {nearBot && !chatBot && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#0f0f1aEE] border border-purple-500/30 px-4 py-2 rounded-xl pointer-events-none">
              <p className="text-sm text-white">[E] Talk to <span className="text-purple-400 font-semibold">{nearBot.name}</span> — {nearBot.role}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-gray-500 pointer-events-none">
            WASD = Walk | Drag = Rotate camera | E = Talk | Click bot = Chat
          </div>
        </div>

        {/* Chat panel */}
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
                  placeholder={`Talk to ${chatBot.name}...`}
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
