import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AiBot } from "./VirtualOffice";
import { useNavigate } from "react-router-dom";
import { X, Send, Loader2, Settings2 } from "lucide-react";
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
      {/* Long couch */}
      <Block position={[9, 0.3, RD - 2]} color="#6b3090" args={[10, 0.5, 0.8]} />
      <Block position={[9, 0.6, RD - 1.7]} color="#5a2878" args={[10, 0.5, 0.2]} />
      {/* Couch arms */}
      <Block position={[4.1, 0.5, RD - 2]} color="#5a2878" args={[0.3, 0.7, 0.8]} />
      <Block position={[13.9, 0.5, RD - 2]} color="#5a2878" args={[0.3, 0.7, 0.8]} />
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

interface BotIssue {
  type: "api" | "plan" | "task";
  message: string;
  action: string; // button label
  link?: string; // navigate to
}

function getBotIssues(bot: AiBot, hasResendApi: boolean, hasWebsiteApi: boolean, hasMetaApi: boolean, hasPlanSteps: boolean, hasBusinessPlan: boolean): BotIssue[] {
  const issues: BotIssue[] = [];
  const role = bot.role.toLowerCase();
  const skills = (bot.skills || []).join(" ").toLowerCase();

  // API checks per bot role
  if ((role.includes("email") || skills.includes("имейл") || skills.includes("newsletter")) && !hasResendApi) {
    issues.push({ type: "api", message: "Няма свързано API за имейли (Resend)", action: "Свържи Resend API", link: "/settings" });
  }
  if ((role.includes("уеб") || skills.includes("seo") || skills.includes("web")) && !hasWebsiteApi) {
    issues.push({ type: "api", message: "Няма свързан уебсайт за редакция", action: "Свържи сайт", link: "/settings" });
  }
  if ((skills.includes("meta ads") || skills.includes("реклам") || skills.includes("instagram")) && !hasMetaApi) {
    issues.push({ type: "api", message: "Няма свързан Meta Ads акаунт", action: "Свържи Meta Ads", link: "/settings" });
  }

  // Plan checks
  if (!hasPlanSteps) {
    issues.push({ type: "plan", message: "Маркетинг планът не е започнат", action: "Направи маркетинг план", link: "/plan" });
  }
  if (!hasBusinessPlan) {
    issues.push({ type: "plan", message: "Бизнес планът не е готов", action: "Направи бизнес план", link: "/business-plan" });
  }

  return issues;
}

function BotChar({ bot, position, isSelected, onClick, hasIssues }: { bot: AiBot; position: [number, number, number]; isSelected: boolean; onClick: () => void; hasIssues: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const currentPos = useRef(new THREE.Vector3(...position));
  const bodyColor = hasIssues ? "#ef4444" : bot.shirtColor;

  useFrame((s) => {
    if (!ref.current) return;
    currentPos.current.lerp(new THREE.Vector3(...position), 0.02);
    ref.current.position.copy(currentPos.current);
    ref.current.position.y += Math.sin(s.clock.elapsedTime * 1.5 + position[0]) * 0.02;
  });

  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <Block position={[-0.08, 0.15, 0]} color="#2d2d4a" args={[0.12, 0.3, 0.12]} />
      <Block position={[0.08, 0.15, 0]} color="#2d2d4a" args={[0.12, 0.3, 0.12]} />
      <Block position={[0, 0.5, 0]} color={bodyColor} args={[0.35, 0.4, 0.2]} />
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
  onUpdate: (labels: { name: string; role: string; x: number; y: number; visible: boolean; color: string; needsAttention: boolean }[]) => void;
}) {
  const { camera } = useThree();
  const vec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const result = bots.map((bot, i) => {
      if (i >= positions.length) return { name: bot.name, role: bot.role, x: -100, y: -100, visible: false, color: bot.shirtColor, needsAttention: false };
      vec.set(positions[i][0], 1.5, positions[i][2]);
      vec.project(camera);
      const x = (vec.x * 0.5 + 0.5) * 100;
      const y = (-vec.y * 0.5 + 0.5) * 100;
      const behind = vec.z > 1;
      return { name: bot.name, role: bot.role, x, y, visible: !behind && x > -10 && x < 110 && y > -10 && y < 110, color: bot.shirtColor, needsAttention: false };
    });
    onUpdate(result);
  });

  return null;
}

// ─── FIRST PERSON: WASD walk + mouse look ───
function FPController({ chatOpen, onNearBot, botPositions, bots, onInteract, keybinds, playerPosRef }: {
  chatOpen: boolean; onNearBot: (b: AiBot | null) => void;
  botPositions: [number, number, number][]; bots: AiBot[]; onInteract: (b: AiBot) => void;
  keybinds: { forward: string; back: string; left: string; right: string; talk: string };
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const pos = useRef(new THREE.Vector3(RW / 2, 1.6, RD - 3));
  const rotY = useRef(0); // face toward bots (negative Z)
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

  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;
  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;
  const keybindsRef = useRef(keybinds);
  keybindsRef.current = keybinds;

  useEffect(() => {
    const codeToKey: Record<string, string> = { "KeyW": "w", "KeyA": "a", "KeyS": "s", "KeyD": "d", "KeyE": "e", "KeyQ": "q", "KeyR": "r", "KeyF": "f", "Space": "space", "ArrowUp": "arrowup", "ArrowDown": "arrowdown", "ArrowLeft": "arrowleft", "ArrowRight": "arrowright" };

    const mapKey = (e: KeyboardEvent): string => {
      // Use e.code for physical key position (works with any language)
      const physicalKey = codeToKey[e.code] || e.key.toLowerCase();
      const kb = keybindsRef.current;
      if (physicalKey === kb.forward || physicalKey === "arrowup") return "w";
      if (physicalKey === kb.back || physicalKey === "arrowdown") return "s";
      if (physicalKey === kb.left || physicalKey === "arrowleft") return "a";
      if (physicalKey === kb.right || physicalKey === "arrowright") return "d";
      if (physicalKey === kb.talk) return "e";
      return physicalKey;
    };

    const onDown = (e: KeyboardEvent) => {
      if (chatOpenRef.current || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      const k = mapKey(e);
      if (["w", "a", "s", "d"].includes(k)) { e.preventDefault(); keys.current.add(k); }
      if (k === "e" && nearRef.current) onInteractRef.current(nearRef.current);
    };
    const onUp = (e: KeyboardEvent) => {
      const k = mapKey(e);
      keys.current.delete(k);
    };

    const canvas = gl.domElement;
    const onMouseDown = (e: MouseEvent) => { isDrag.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag.current || chatOpenRef.current) return;
      rotY.current -= (e.clientX - lastMouse.current.x) * 0.004;
      rotX.current = Math.max(-0.8, Math.min(0.8, rotX.current - (e.clientY - lastMouse.current.y) * 0.004));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDrag.current = false; };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [gl]); // Only depends on gl, uses refs for everything else

  useFrame(() => {
    if (chatOpenRef.current) return;
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
    playerPosRef.current.set(p.x, 0, p.z);
    const euler = new THREE.Euler(rotX.current, rotY.current, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);

    // Near bots
    let nearest: AiBot | null = null, nd = 2.5;
    for (let i = 0; i < botPositions.length && i < bots.length; i++) {
      const d = Math.sqrt((p.x - botPositions[i][0]) ** 2 + (p.z - botPositions[i][2]) ** 2);
      if (d < nd) { nd = d; nearest = bots[i]; }
    }
    if (nearRef.current?.id !== nearest?.id) {
      nearRef.current = nearest;
      onNearBot(nearest);
    }
  });

  return null;
}

// ─── MAIN ───
export function VirtualOffice3D({ bots, selectedBotId, onSelectBot }: Props) {
  const [nearBot, setNearBot] = useState<AiBot | null>(null);
  const [chatBot, setChatBot] = useState<AiBot | null>(null);
  const [showKeybinds, setShowKeybinds] = useState(false);
  const [keybinds, setKeybinds] = useState(() => {
    try {
      const saved = localStorage.getItem("simora_keybinds");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { forward: "w", back: "s", left: "a", right: "d", talk: "e" };
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [botLabels, setBotLabels] = useState<{ name: string; role: string; x: number; y: number; visible: boolean; color: string; needsAttention: boolean }[]>([]);

  // Per-bot message history (persists when closing chat)
  const botMessagesRef = useRef<Record<string, { role: "user" | "assistant"; content: string }[]>>({});
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { projectId } = useCurrentProject();
  const { currentOrganization } = useOrganizations();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check integrations & plans status
  const [hasResendApi, setHasResendApi] = useState(false);
  const [hasWebsiteApi, setHasWebsiteApi] = useState(false);
  const [hasMetaApi, setHasMetaApi] = useState(false);
  const [hasPlanSteps, setHasPlanSteps] = useState(false);
  const [hasBusinessPlan, setHasBusinessPlan] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("resend_integrations").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => setHasResendApi(!!data));
    supabase.from("website_integrations").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => setHasWebsiteApi(!!data));
    supabase.from("website_integrations").select("metadata").eq("user_id", user.id).then(({ data }) => {
      setHasMetaApi(!!(data || []).find((d: any) => d.metadata?.meta_token));
    });
    supabase.from("plan_steps").select("id").limit(1).then(({ data }) => setHasPlanSteps(!!(data && data.length > 0)));
    supabase.from("business_plans").select("id").limit(1).then(({ data }) => setHasBusinessPlan(!!(data && data.length > 0)));
  }, [user]);

  // Bot activity state: idle=couch, working=desk, done=follow player
  const [botActivity, setBotActivity] = useState<Record<string, "idle" | "working" | "done">>({});

  // Desk positions
  const deskPositions = useMemo<[number, number, number][]>(() => [
    [3, 0, 2], [6, 0, 2], [9, 0, 2],
    [3, 0, 5], [6, 0, 5], [9, 0, 5],
  ], []);

  // Couch positions
  const couchPositions = useMemo<[number, number, number][]>(() => [
    [5.5, 0.3, RD - 2.2], [7, 0.3, RD - 2.2], [8.5, 0.3, RD - 2.2],
    [10, 0.3, RD - 2.2], [11.5, 0.3, RD - 2.2], [13, 0.3, RD - 2.2],
  ], []);

  // Player position ref for "follow" behavior
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(RW / 2, 0, RD - 3));

  // Bot positions based on activity
  const botPositions = useMemo<[number, number, number][]>(() => {
    return bots.map((bot, i) => {
      if (i >= deskPositions.length) return couchPositions[i % couchPositions.length];
      const activity = botActivity[bot.id] || "idle";
      if (activity === "working") {
        return [deskPositions[i][0], 0, deskPositions[i][2] + 1];
      }
      if (activity === "done") {
        // Follow player - offset to side
        const px = playerPosRef.current?.x || RW / 2;
        const pz = playerPosRef.current?.z || RD - 3;
        return [px + (i % 3 - 1) * 1.5, 0, pz + 1.5] as [number, number, number];
      }
      return couchPositions[i % couchPositions.length];
    });
  }, [bots, deskPositions, couchPositions, botActivity]);

  const openChat = useCallback((bot: AiBot) => {
    setChatBot(bot);

    // Restore previous messages or create greeting
    const prev = botMessagesRef.current[bot.id];
    if (prev && prev.length > 0) {
      setChatMessages(prev);
    } else {
      const issues = getBotIssues(bot, hasResendApi, hasWebsiteApi, hasMetaApi, hasPlanSteps, hasBusinessPlan);
      let greeting: string;
      if (issues.length > 0) {
        const issueList = issues.map((iss, i) => `${i + 1}. ${iss.type === "api" ? "🔌" : "📋"} ${iss.message}`).join("\n");
        greeting = `⚠️ Аз съм ${bot.name} — ${bot.role}.\n\n**Преди да мога да работя, трябва:**\n${issueList}\n\nНатисни бутон отдолу за да оправиш проблема.`;
      } else {
        greeting = `✅ Аз съм ${bot.name} — ${bot.role}.\nМога да помогна с: ${(bot.skills || []).join(", ")}.\n\nКакво да направя?`;
      }
      const msgs = [{ role: "assistant" as const, content: greeting }];
      setChatMessages(msgs);
      botMessagesRef.current[bot.id] = msgs;
    }

    setChatInput("");
    setTimeout(() => chatInputRef.current?.focus(), 100);
  }, [hasResendApi, hasWebsiteApi, hasMetaApi, hasPlanSteps, hasBusinessPlan]);

  const sendMsg = useCallback(async () => {
    if (!chatInput.trim() || !chatBot || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    const userMsg = { role: "user" as const, content: msg };
    setChatMessages(p => { const n = [...p, userMsg]; botMessagesRef.current[chatBot.id] = n; return n; });
    setChatLoading(true);
    setBotActivity(prev => ({ ...prev, [chatBot.id]: "working" }));
    try {
      const { data } = await supabase.functions.invoke("assistant-chat", {
        body: { messages: [...chatMessages.slice(-8), { role: "user", content: msg }], projectId, organizationId: currentOrganization?.id, context: "business", userId: user?.id,
          moduleSystemPrompt: `Ти си ${chatBot.name}, ${chatBot.role}. Умения: ${(chatBot.skills || []).join(", ")}. Кратко на български.` },
      });
      const reply = { role: "assistant" as const, content: data?.content || "Грешка." };
      setChatMessages(p => { const n = [...p, reply]; botMessagesRef.current[chatBot.id] = n; return n; });
      setBotActivity(prev => ({ ...prev, [chatBot.id]: "done" }));
    } catch {
      const err = { role: "assistant" as const, content: "⚠️ Грешка." };
      setChatMessages(p => { const n = [...p, err]; botMessagesRef.current[chatBot.id] = n; return n; });
      setBotActivity(prev => ({ ...prev, [chatBot.id]: "idle" }));
    }
    finally { setChatLoading(false); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }
  }, [chatInput, chatBot, chatLoading, chatMessages, projectId, currentOrganization, user]);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a] border-b border-[#2a2a4a]">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-purple-400">Virtual Office 3D</h3>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500">{bots.length} bots</span>
          <button onClick={() => setShowKeybinds(true)} className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-[#2a2a4a]" title="Настройки на бутоните">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Keybindings popup */}
      {showKeybinds && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowKeybinds(false); setEditingKey(null); }}>
          <div className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl p-5 w-[300px] space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Бутони за ходене</h3>
              <button onClick={() => setShowKeybinds(false)} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {[
              { key: "forward", label: "Напред" },
              { key: "back", label: "Назад" },
              { key: "left", label: "Ляво" },
              { key: "right", label: "Дясно" },
              { key: "talk", label: "Говори" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <button
                  className={`px-3 py-1 rounded text-sm font-mono font-bold min-w-[50px] text-center transition-colors ${
                    editingKey === key ? "bg-purple-600 text-white animate-pulse" : "bg-[#1a1a2e] text-white border border-[#2a2a4a] hover:border-purple-500"
                  }`}
                  onClick={() => setEditingKey(key)}
                  onKeyDown={(e) => {
                    if (editingKey === key) {
                      e.preventDefault();
                      // Use e.code to get physical key regardless of language
                      const codeMap: Record<string, string> = { "KeyW": "w", "KeyA": "a", "KeyS": "s", "KeyD": "d", "KeyE": "e", "KeyQ": "q", "KeyR": "r", "KeyF": "f", "Space": "space", "ArrowUp": "arrowup", "ArrowDown": "arrowdown", "ArrowLeft": "arrowleft", "ArrowRight": "arrowright" };
                      const newKey = codeMap[e.code] || e.key.toLowerCase();
                      if (newKey !== "escape" && newKey !== "shift" && newKey !== "control" && newKey !== "alt") {
                        const updated = { ...keybinds, [key]: newKey };
                        setKeybinds(updated);
                        localStorage.setItem("simora_keybinds", JSON.stringify(updated));
                      }
                      setEditingKey(null);
                    }
                  }}
                >
                  {editingKey === key ? "..." : (() => {
                    const v = keybinds[key as keyof typeof keybinds];
                    const cyrToLat: Record<string, string> = { "ц": "W", "ф": "A", "ы": "S", "в": "W", "і": "S", "д": "D", "у": "E", "с": "S" };
                    return cyrToLat[v] || v.toUpperCase();
                  })()}
                </button>
              </div>
            ))}
            <p className="text-[10px] text-gray-600 mt-2">Кликни на бутон, после натисни новия клавиш</p>
          </div>
        </div>
      )}

      <div className="flex relative" style={{ height: "500px" }}>
        <div className={`${chatBot ? "flex-1" : "w-full"} relative`}>
          <Canvas camera={{ fov: 70, near: 0.1, far: 50 }}>
            <ambientLight intensity={0.5} />
            <color attach="background" args={["#1a1a2e"]} />
            <Room />
            {/* Always show all desks */}
            {deskPositions.map((p, i) => <Desk key={`desk${i}`} position={p} />)}
            {bots.map((bot, i) => {
              if (i >= botPositions.length) return null;
              const issues = getBotIssues(bot, hasResendApi, hasWebsiteApi, hasMetaApi, hasPlanSteps, hasBusinessPlan);
              return <BotChar key={bot.id} bot={bot} position={botPositions[i]} isSelected={chatBot?.id === bot.id} onClick={() => openChat(bot)} hasIssues={issues.length > 0} />;
            })}
            <FPController chatOpen={!!chatBot} onNearBot={setNearBot} botPositions={botPositions} bots={bots} onInteract={openChat} keybinds={keybinds} playerPosRef={playerPosRef} />
            <LabelProjector bots={bots} positions={botPositions} onUpdate={(labels) => {
              // Inject needsAttention from issues
              setBotLabels(labels.map((l, i) => {
                const issues = i < bots.length ? getBotIssues(bots[i], hasResendApi, hasWebsiteApi, hasMetaApi, hasPlanSteps, hasBusinessPlan) : [];
                return { ...l, needsAttention: issues.length > 0, color: issues.length > 0 ? "#ef4444" : bots[i]?.shirtColor || l.color };
              }));
            }} />
          </Canvas>

          {/* Bot name labels */}
          {botLabels.map((l, i) => l.visible && (
            <div key={i} className="absolute pointer-events-none" style={{ left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%, -100%)" }}>
              <div className="text-center whitespace-nowrap">
                {l.needsAttention && <span className="text-[9px] text-red-400 block mb-0.5">⚠ Needs action</span>}
                <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded" style={{ background: l.needsAttention ? "#991b1bDD" : "#0f0f1aDD", borderBottom: `2px solid ${l.color}` }}>{l.name}</span>
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
              <button onClick={() => setChatBot(null)} className="text-gray-500 hover:text-white p-1" title="Затвори (ботът продължава работа)"><X className="h-4 w-4" /></button>
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
            {/* Action buttons for issues */}
            {chatBot && (() => {
              const issues = getBotIssues(chatBot, hasResendApi, hasWebsiteApi, hasMetaApi, hasPlanSteps, hasBusinessPlan);
              if (issues.length === 0) return null;
              return (
                <div className="px-2 py-1.5 border-t border-[#2a2a4a] flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {issues.map((iss, i) => (
                    <button key={i} onClick={() => { if (iss.link) navigate(iss.link); }}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                        iss.type === "api"
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                      }`}>
                      {iss.type === "api" ? "🔌" : "📋"} {iss.action}
                    </button>
                  ))}
                </div>
              );
            })()}
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
