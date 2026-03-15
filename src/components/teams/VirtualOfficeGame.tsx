import { useRef, useEffect, useCallback, useState } from "react";
import type { AiBot } from "./VirtualOffice";
import { Gamepad2, MessageSquare } from "lucide-react";

interface Props {
  bots: AiBot[];
  selectedBotId?: string | null;
  onSelectBot?: (id: string | null) => void;
  onOpenChat?: (bot: AiBot) => void;
}

const SCALE = 3;
const S = SCALE;
const PX = 16 * SCALE;
const ROOM_W = 24;
const ROOM_H = 16;
const MOVE_SPEED = 2;
const INTERACT_DIST = 2.8;

// Desks - 2 rows of 4
const DESKS = [
  { x: 3, y: 3 }, { x: 7, y: 3 }, { x: 17, y: 3 }, { x: 21, y: 3 },
  { x: 3, y: 10 }, { x: 7, y: 10 }, { x: 17, y: 10 }, { x: 21, y: 10 },
];

interface BotState {
  bot: AiBot;
  tx: number;
  ty: number;
  targetX: number;
  targetY: number;
  deskIdx: number;
  atDesk: boolean;
  walkingToPlayer: boolean;
  dir: 0 | 1 | 2 | 3;
  animFrame: number;
  bubble: string;
  bubbleTimer: number;
  taskDone: boolean;
}

export function VirtualOfficeGame({ bots, selectedBotId, onSelectBot, onOpenChat }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const [gameMode, setGameMode] = useState(true);
  const [nearBotName, setNearBotName] = useState<string | null>(null);
  const nearBotRef = useRef<AiBot | null>(null);
  const gameModeRef = useRef(true);

  // Player state - start in center
  const playerRef = useRef({
    x: 12, y: 8, targetX: 12, targetY: 8, dir: 0 as 0 | 1 | 2 | 3, animFrame: 0, moving: false,
  });

  // Bot states
  const botStatesRef = useRef<BotState[]>([]);

  // Initialize bot states
  useEffect(() => {
    const states: BotState[] = bots.map((bot, i) => {
      const existing = botStatesRef.current.find(s => s.bot.id === bot.id);
      const deskIdx = i % DESKS.length;
      const desk = DESKS[deskIdx];

      if (existing) {
        return { ...existing, bot, deskIdx };
      }

      return {
        bot, tx: desk.x + 0.3, ty: desk.y + 1.5,
        targetX: desk.x + 0.3, targetY: desk.y + 1.5,
        deskIdx, atDesk: true, walkingToPlayer: false,
        dir: 0, animFrame: 0, bubble: "", bubbleTimer: 0, taskDone: false,
      };
    });
    botStatesRef.current = states;
  }, [bots]);

  // Sync gameMode to ref
  useEffect(() => {
    gameModeRef.current = gameMode;
    if (gameMode && canvasRef.current) {
      canvasRef.current.focus();
    }
  }, [gameMode]);

  // Store onOpenChat in ref to avoid re-creating listener
  const onOpenChatRef = useRef(onOpenChat);
  onOpenChatRef.current = onOpenChat;

  // Keyboard handling - runs once, uses refs
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
      if (key === "e" && nearBotRef.current && onOpenChatRef.current && gameModeRef.current) {
        onOpenChatRef.current(nearBotRef.current);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frame = frameRef.current++;
    const player = playerRef.current;
    const keys = keysRef.current;
    const botStates = botStatesRef.current;

    // ─── UPDATE PLAYER ───
    if (gameModeRef.current) {
      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("arrowup")) { dy = -MOVE_SPEED; player.dir = 1; }
      if (keys.has("s") || keys.has("arrowdown")) { dy = MOVE_SPEED; player.dir = 0; }
      if (keys.has("a") || keys.has("arrowleft")) { dx = -MOVE_SPEED; player.dir = 2; }
      if (keys.has("d") || keys.has("arrowright")) { dx = MOVE_SPEED; player.dir = 3; }

      const keyMoving = dx !== 0 || dy !== 0;

      // Also move towards click target
      if (!keyMoving) {
        const cdx = player.targetX - player.x;
        const cdy = player.targetY - player.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cdist > 0.15) {
          dx = (cdx / cdist) * MOVE_SPEED;
          dy = (cdy / cdist) * MOVE_SPEED;
          if (Math.abs(cdx) > Math.abs(cdy)) player.dir = cdx > 0 ? 3 : 2;
          else player.dir = cdy > 0 ? 0 : 1;
        }
      }

      player.moving = dx !== 0 || dy !== 0;
      if (player.moving) player.animFrame++;

      if (dx && dy) { dx *= 0.707; dy *= 0.707; }

      const nx = player.x + dx * 0.055;
      const ny = player.y + dy * 0.055;

      if (nx > 1.5 && nx < ROOM_W - 2) player.x = nx;
      if (ny > 2.5 && ny < ROOM_H - 1.5) player.y = ny;
    }

    // ─── UPDATE BOTS ───
    let closestBot: AiBot | null = null;
    let closestDist = INTERACT_DIST;

    for (const bs of botStates) {
      const ddx = bs.targetX - bs.tx;
      const ddy = bs.targetY - bs.ty;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      if (dist > 0.1) {
        bs.tx += (ddx / dist) * 0.03;
        bs.ty += (ddy / dist) * 0.03;
        bs.animFrame++;
        if (Math.abs(ddx) > Math.abs(ddy)) bs.dir = ddx > 0 ? 3 : 2;
        else bs.dir = ddy > 0 ? 0 : 1;
      } else {
        bs.atDesk = true;
      }

      if (bs.taskDone && !bs.walkingToPlayer) {
        bs.walkingToPlayer = true;
        bs.targetX = player.x - 1;
        bs.targetY = player.y;
        bs.bubble = "Готово!";
        bs.bubbleTimer = 300;
      }

      if (bs.bubbleTimer > 0) bs.bubbleTimer--;
      if (bs.bubbleTimer === 0) bs.bubble = "";

      if (gameModeRef.current) {
        const pdx = bs.tx - player.x;
        const pdy = bs.ty - player.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdist < closestDist) {
          closestDist = pdist;
          closestBot = bs.bot;
        }
      }
    }

    nearBotRef.current = closestBot;
    const newName = closestBot?.name || null;
    setNearBotName(prev => prev === newName ? prev : newName);

    // ─── DRAW ROOM ───
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor
    for (let y = 2; y < ROOM_H - 1; y++)
      for (let x = 1; x < ROOM_W - 1; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#3d3524" : "#352e1f";
        ctx.fillRect(x * PX, y * PX, PX, PX);
        ctx.fillStyle = "#2a2418";
        ctx.fillRect(x * PX, y * PX, PX, S);
        ctx.fillRect(x * PX, y * PX, S, PX);
      }

    // Walls
    const rect = (tx: number, ty: number, tw: number, th: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(tx * PX, ty * PX, tw * PX, th * PX);
    };
    rect(0, 0, ROOM_W, 2, "#4a5568");
    rect(0, 0, ROOM_W, 1, "#374151");
    rect(0, ROOM_H - 1, ROOM_W, 1, "#4a5568");
    rect(0, 0, 1, ROOM_H, "#4a5568");
    rect(ROOM_W - 1, 0, 1, ROOM_H, "#4a5568");
    ctx.fillStyle = "#5a6577";
    ctx.fillRect(PX, 2 * PX - 2 * S, (ROOM_W - 2) * PX, 2 * S);

    // Windows
    for (const wx of [4, 10, 16]) {
      rect(wx, 0, 3, 2, "#2d3748");
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(wx * PX + 4 * S, 2 * S, 3 * PX - 8 * S, 2 * PX - 6 * S);
      ctx.fillStyle = "#2a5a8f44";
      ctx.fillRect(wx * PX + 6 * S, 3 * S, 8 * S, 6 * S);
    }

    // Meeting carpet (smaller)
    ctx.fillStyle = "#5b2040";
    ctx.fillRect(10 * PX, 7 * PX, 4 * PX, 3 * PX);
    ctx.fillStyle = "#7b3060";
    ctx.fillRect(10 * PX + 4 * S, 7 * PX + 4 * S, 4 * PX - 8 * S, 3 * PX - 8 * S);
    ctx.fillStyle = "#9b4080";
    ctx.fillRect(10 * PX + 8 * S, 7 * PX + 8 * S, 4 * PX - 16 * S, 3 * PX - 16 * S);

    // Plants
    const drawPlant = (tx: number, ty: number) => {
      const b = tx * PX, t = ty * PX;
      ctx.fillStyle = "#8b4513"; ctx.fillRect(b + 4 * S, t + 10 * S, 8 * S, 6 * S);
      ctx.fillStyle = "#a0522d"; ctx.fillRect(b + 3 * S, t + 10 * S, 10 * S, 2 * S);
      ctx.fillStyle = "#2d8b4e"; ctx.fillRect(b + 3 * S, t + 4 * S, 10 * S, 7 * S);
      ctx.fillStyle = "#3da85e"; ctx.fillRect(b + 5 * S, t + 2 * S, 6 * S, 9 * S);
      ctx.fillStyle = "#4ec870"; ctx.fillRect(b + 6 * S, t + 3 * S, 4 * S, 5 * S);
    };
    drawPlant(2, 2);
    drawPlant(ROOM_W - 3, 2);

    // Couch
    const cb = 10 * PX, ct = 12 * PX;
    ctx.fillStyle = "#4a2060"; ctx.fillRect(cb, ct, 4 * PX, 4 * S);
    ctx.fillStyle = "#6b3090"; ctx.fillRect(cb, ct + 4 * S, 4 * PX, 10 * S);
    ctx.fillStyle = "#5a2878"; ctx.fillRect(cb - 2 * S, ct + 2 * S, 4 * S, 12 * S);
    ctx.fillRect(cb + 4 * PX - 2 * S, ct + 2 * S, 4 * S, 12 * S);
    ctx.fillStyle = "#8040b0"; ctx.fillRect(cb + 4 * S, ct + 5 * S, 2 * PX - 6 * S, 8 * S);
    ctx.fillRect(cb + 2 * PX + 2 * S, ct + 5 * S, 2 * PX - 6 * S, 8 * S);

    // Table in meeting area
    const tb = 11 * PX, tt = 8 * PX;
    ctx.fillStyle = "#5c3a1e"; ctx.fillRect(tb, tt + 4 * S, 2 * PX, 8 * S);
    ctx.fillStyle = "#7c5a3e"; ctx.fillRect(tb + 2 * S, tt + 5 * S, 2 * PX - 4 * S, 6 * S);

    // Whiteboard on left wall
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(PX, 3 * PX + 2 * S, 2 * S, 3 * PX - 4 * S);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(PX, 3 * PX + 6 * S, S, 8 * S);
    ctx.fillStyle = "#3b82f6"; ctx.fillRect(PX, 3 * PX + 18 * S, S, 6 * S);
    ctx.fillStyle = "#10b981"; ctx.fillRect(PX, 3 * PX + 28 * S, S, 10 * S);

    // Water cooler
    const wcx = 1 * PX, wcy = 8 * PX;
    ctx.fillStyle = "#9ca3af"; ctx.fillRect(wcx + 4 * S, wcy + 8 * S, 8 * S, 8 * S);
    ctx.fillStyle = "#60a5fa"; ctx.fillRect(wcx + 5 * S, wcy + S, 6 * S, 8 * S);
    ctx.fillStyle = "#93c5fd"; ctx.fillRect(wcx + 6 * S, wcy + 2 * S, 4 * S, 5 * S);

    // Coffee machine
    rect(ROOM_W - 2, ROOM_H - 2, 1, 1, "#5c3a1e");
    ctx.fillStyle = "#7c5a3e";
    ctx.fillRect((ROOM_W - 2) * PX + 2 * S, (ROOM_H - 2) * PX + 2 * S, PX - 4 * S, PX - 2 * S);

    // Clock on top wall
    const cx2 = 12 * PX + 4 * S, cy2 = 4 * S;
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(cx2, cy2, 8 * S, 8 * S);
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(cx2 + S, cy2 + S, 6 * S, 6 * S);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(cx2 + 3 * S, cy2 + 2 * S, S, 3 * S);
    ctx.fillStyle = "#fff"; ctx.fillRect(cx2 + 3 * S, cy2 + 3 * S, 2 * S, S);

    // ─── DESKS ───
    const drawDesk = (tx: number, ty: number) => {
      const b = tx * PX, t = ty * PX;
      ctx.fillStyle = "#6b5030"; ctx.fillRect(b - 2 * S, t, 2 * PX + 4 * S, PX + 4 * S);
      ctx.fillStyle = "#8b7050"; ctx.fillRect(b, t + 2 * S, 2 * PX, PX);
      ctx.fillStyle = "#5a4020";
      ctx.fillRect(b, t + PX + 2 * S, 3 * S, 4 * S);
      ctx.fillRect(b + 2 * PX - 3 * S, t + PX + 2 * S, 3 * S, 4 * S);
      // Monitor
      ctx.fillStyle = "#1f2937"; ctx.fillRect(b + 4 * S, t - 6 * S, 12 * S, 10 * S);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(b + 5 * S, t - 5 * S, 10 * S, 7 * S);
      ctx.fillStyle = "#374151"; ctx.fillRect(b + 8 * S, t + 4 * S, 4 * S, 2 * S);
      ctx.fillRect(b + 6 * S, t + 5 * S, 8 * S, S);
      // Keyboard
      ctx.fillStyle = "#4b5563"; ctx.fillRect(b + 4 * S, t + 8 * S, 10 * S, 4 * S);
      ctx.fillStyle = "#6b7280"; ctx.fillRect(b + 5 * S, t + 9 * S, 8 * S, 2 * S);
      // Mouse
      ctx.fillStyle = "#9ca3af"; ctx.fillRect(b + 18 * S, t + 9 * S, 4 * S, 3 * S);
    };

    const drawScreenActive = (tx: number, ty: number, fr: number) => {
      const b = tx * PX, t = ty * PX;
      const cols = ["#34d399", "#818cf8", "#f472b6", "#60a5fa", "#fbbf24"];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cols[(i + fr) % cols.length];
        ctx.fillRect(b + 6 * S, t + (-4 + i * 2) * S, (3 + Math.sin(fr * 0.3 + i) * 2) * S, S);
      }
      if (fr % 20 < 10) {
        ctx.fillStyle = "#34d399";
        ctx.fillRect(b + 10 * S, t + 2 * S, S, S);
      }
    };

    DESKS.slice(0, Math.max(bots.length, 6)).forEach(d => drawDesk(d.x, d.y));

    // ─── CHARACTERS (Y-sorted) ───
    const entities: { y: number; draw: () => void }[] = [];

    for (const bs of botStates) {
      const px = bs.tx * PX;
      const py = bs.ty * PX;
      const isWorking = bs.bot.state === "working" && bs.atDesk;
      const desk = DESKS[bs.deskIdx];
      const isNear = nearBotRef.current?.id === bs.bot.id;

      entities.push({
        y: py,
        draw: () => {
          if (isWorking) {
            drawScreenActive(desk.x, desk.y, frame);
            drawSitting(ctx, px, py, bs.bot, frame);
          } else if (Math.abs(bs.tx - bs.targetX) > 0.1 || Math.abs(bs.ty - bs.targetY) > 0.1) {
            drawWalking(ctx, px, py, bs.bot, bs.dir, bs.animFrame);
          } else {
            drawStanding(ctx, px, py, bs.bot, frame);
          }

          drawNameTag(ctx, px, py, bs.bot.name, isWorking ? "working" : "idle");

          if (bs.bubble && bs.bubbleTimer > 0) {
            drawBubble(ctx, px, py, bs.bubble, frame);
          }

          if (selectedBotId === bs.bot.id) {
            ctx.strokeStyle = "#c084fc";
            ctx.lineWidth = 2 * S;
            ctx.strokeRect(px - 4 * S, py - 12 * S, 14 * S, 28 * S);
          }

          // Glow when near
          if (isNear && gameModeRef.current) {
            ctx.strokeStyle = `rgba(192, 132, 252, ${0.5 + Math.sin(frame * 0.1) * 0.3})`;
            ctx.lineWidth = 2 * S;
            ctx.strokeRect(px - 6 * S, py - 14 * S, 18 * S, 32 * S);
          }
        },
      });
    }

    // Player
    if (gameModeRef.current) {
      const ppx = player.x * PX;
      const ppy = player.y * PX;
      entities.push({
        y: ppy,
        draw: () => drawPlayer(ctx, ppx, ppy, player.dir, player.moving ? player.animFrame : 0, frame),
      });
    }

    entities.sort((a, b) => a.y - b.y);
    entities.forEach(e => e.draw());

    // ─── HUD ───
    // Interaction hint
    const nb = nearBotRef.current;
    if (nb && gameModeRef.current) {
      const hx = canvas.width / 2;
      const hy = canvas.height - 22 * S;
      ctx.font = `bold ${7 * S}px monospace`;
      const text = `[ E ] Говори с ${nb.name}`;
      const m = ctx.measureText(text);
      ctx.fillStyle = "#0f0f1aEE";
      ctx.fillRect(hx - m.width / 2 - 8 * S, hy - 9 * S, m.width + 16 * S, 15 * S);
      ctx.strokeStyle = "#c084fc88";
      ctx.lineWidth = S;
      ctx.strokeRect(hx - m.width / 2 - 8 * S, hy - 9 * S, m.width + 16 * S, 15 * S);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillText(text, hx - m.width / 2, hy);
    }

    // Controls (bottom)
    if (gameModeRef.current && !nb) {
      ctx.font = `${4 * S}px monospace`;
      ctx.fillStyle = "#ffffff33";
      ctx.fillText("WASD = Движение  |  E = Говори  |  Click = Отиди", 2 * PX, (ROOM_H - 0.3) * PX);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [bots, selectedBotId]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Click handler
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.focus(); // ensure focus for keyboard
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    const mx = (e.clientX - r.left) * sx / PX;
    const my = (e.clientY - r.top) * sy / PX;

    // Check if clicked a bot — just select, don't open chat
    for (const bs of botStatesRef.current) {
      const dx = mx - bs.tx;
      const dy = my - bs.ty;
      if (Math.sqrt(dx * dx + dy * dy) < 1.8) {
        if (onSelectBot) onSelectBot(selectedBotId === bs.bot.id ? null : bs.bot.id);
        return;
      }
    }

    // Click to move player (smooth walk, not teleport)
    if (gameModeRef.current) {
      playerRef.current.targetX = Math.max(1.5, Math.min(ROOM_W - 2, mx));
      playerRef.current.targetY = Math.max(2.5, Math.min(ROOM_H - 1.5, my));
    }

    if (onSelectBot) onSelectBot(null);
  };

  const working = bots.filter(b => b.state === "working").length;
  const idle = bots.length - working;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a] border-b border-[#2a2a4a]">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-purple-400">
          Виртуален Офис
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-[11px] text-gray-500">
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
              {working} работят
            </span>
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1" />
              {idle} чакат
            </span>
            <span>{bots.length} общо</span>
          </div>
          <button
            onClick={() => setGameMode(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              gameMode
                ? "bg-purple-600 text-white"
                : "bg-[#2a2a4a] text-gray-400 hover:text-white"
            }`}
          >
            {gameMode ? <Gamepad2 className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
            {gameMode ? "Game Mode" : "View Mode"}
          </button>
        </div>
      </div>
      <div className="flex justify-center bg-[#12121f] relative">
        <canvas
          ref={canvasRef}
          width={ROOM_W * PX}
          height={ROOM_H * PX}
          onClick={handleClick}
          className="max-w-full h-auto cursor-pointer focus:outline-none"
          style={{ imageRendering: "pixelated" }}
          tabIndex={0}
          autoFocus
        />
        {/* Mobile controls */}
        {gameMode && (
          <div className="absolute bottom-4 right-4 md:hidden flex flex-col items-center gap-1 select-none">
            <button className="w-11 h-11 rounded-lg bg-purple-600/60 text-white flex items-center justify-center text-sm font-bold active:bg-purple-600"
              onTouchStart={() => keysRef.current.add("w")} onTouchEnd={() => keysRef.current.delete("w")}>W</button>
            <div className="flex gap-1">
              <button className="w-11 h-11 rounded-lg bg-purple-600/60 text-white flex items-center justify-center text-sm font-bold active:bg-purple-600"
                onTouchStart={() => keysRef.current.add("a")} onTouchEnd={() => keysRef.current.delete("a")}>A</button>
              <button className="w-11 h-11 rounded-lg bg-yellow-500/60 text-white flex items-center justify-center text-xs font-bold active:bg-yellow-500"
                onTouchStart={() => { if (nearBotRef.current && onOpenChat) onOpenChat(nearBotRef.current); }}>E</button>
              <button className="w-11 h-11 rounded-lg bg-purple-600/60 text-white flex items-center justify-center text-sm font-bold active:bg-purple-600"
                onTouchStart={() => keysRef.current.add("d")} onTouchEnd={() => keysRef.current.delete("d")}>D</button>
            </div>
            <button className="w-11 h-11 rounded-lg bg-purple-600/60 text-white flex items-center justify-center text-sm font-bold active:bg-purple-600"
              onTouchStart={() => keysRef.current.add("s")} onTouchEnd={() => keysRef.current.delete("s")}>S</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DRAWING HELPERS ───

function drawSitting(ctx: CanvasRenderingContext2D, cx: number, cy: number, bot: AiBot, fr: number) {
  ctx.fillStyle = "#374151"; ctx.fillRect(cx - 3 * S, cy + 4 * S, 10 * S, 8 * S);
  ctx.fillStyle = "#4b5563"; ctx.fillRect(cx - 2 * S, cy + 5 * S, 8 * S, 6 * S);
  ctx.fillStyle = "#374151"; ctx.fillRect(cx - 1 * S, cy + 10 * S, 6 * S, 4 * S);
  ctx.fillStyle = bot.shirtColor; ctx.fillRect(cx, cy + 4 * S, 4 * S, 5 * S);
  ctx.fillRect(cx - 2 * S, cy + 4 * S, 8 * S, 2 * S);
  ctx.fillStyle = bot.skinColor; ctx.fillRect(cx, cy, 4 * S, 4 * S);
  ctx.fillStyle = bot.hairColor;
  ctx.fillRect(cx - 1 * S, cy - 1 * S, 6 * S, 3 * S);
  ctx.fillRect(cx - 1 * S, cy, 1 * S, 4 * S);
  ctx.fillRect(cx + 4 * S, cy, 1 * S, 4 * S);
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx - 2 * S, cy + 3 * S, 2 * S, 2 * S);
  ctx.fillRect(cx + 4 * S, cy + 3 * S, 2 * S, 2 * S);
  if (fr % 8 < 4) ctx.fillRect(cx - 2 * S, cy + 2 * S, 2 * S, 2 * S);
  else ctx.fillRect(cx + 4 * S, cy + 2 * S, 2 * S, 2 * S);
}

function drawStanding(ctx: CanvasRenderingContext2D, cx: number, cy: number, bot: AiBot, fr: number) {
  const bob = Math.sin(fr * 0.08) > 0 ? S : 0;
  ctx.fillStyle = "#2d2d4a";
  ctx.fillRect(cx, cy + 12 * S, 2 * S, 4 * S);
  ctx.fillRect(cx + 3 * S, cy + 12 * S, 2 * S, 4 * S);
  ctx.fillStyle = bot.shirtColor + "88";
  ctx.fillRect(cx - 1 * S, cy + 9 * S, 7 * S, 4 * S);
  ctx.fillStyle = bot.shirtColor;
  ctx.fillRect(cx, cy + 4 * S - bob, 5 * S, 6 * S);
  ctx.fillRect(cx - 1 * S, cy + 4 * S - bob, 7 * S, 2 * S);
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx - 2 * S, cy + 5 * S - bob, 2 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 5 * S - bob, 2 * S, 5 * S);
  ctx.fillRect(cx, cy - bob, 5 * S, 5 * S);
  ctx.fillStyle = bot.hairColor;
  ctx.fillRect(cx - 1 * S, cy - 1 * S - bob, 7 * S, 3 * S);
  ctx.fillRect(cx - 1 * S, cy + 1 * S - bob, 1 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 1 * S - bob, 1 * S, 5 * S);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(cx + 1 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  ctx.fillRect(cx + 3 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  if (fr % 60 > 55) {
    ctx.fillStyle = bot.skinColor;
    ctx.fillRect(cx + 1 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 3 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  }
  ctx.fillStyle = "#d97070"; ctx.fillRect(cx + 2 * S, cy + 3 * S - bob, 1 * S, 1 * S);
}

function drawWalking(ctx: CanvasRenderingContext2D, cx: number, cy: number, bot: AiBot, dir: number, fr: number) {
  const step = Math.floor(fr / 6) % 4;
  const legOff = step % 2 === 0 ? S : -S;
  ctx.fillStyle = "#2d2d4a";
  ctx.fillRect(cx, cy + 12 * S + legOff, 2 * S, 4 * S);
  ctx.fillRect(cx + 3 * S, cy + 12 * S - legOff, 2 * S, 4 * S);
  ctx.fillStyle = bot.shirtColor;
  ctx.fillRect(cx, cy + 4 * S, 5 * S, 6 * S);
  ctx.fillRect(cx - 1 * S, cy + 4 * S, 7 * S, 2 * S);
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx - 2 * S, cy + 5 * S + legOff, 2 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 5 * S - legOff, 2 * S, 5 * S);
  ctx.fillStyle = bot.shirtColor + "88";
  ctx.fillRect(cx - 1 * S, cy + 9 * S, 7 * S, 4 * S);
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx, cy, 5 * S, 5 * S);
  ctx.fillStyle = bot.hairColor;
  ctx.fillRect(cx - 1 * S, cy - 1 * S, 7 * S, 3 * S);
  ctx.fillRect(cx - 1 * S, cy + 1 * S, 1 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 1 * S, 1 * S, 5 * S);
  ctx.fillStyle = "#1a1a2e";
  if (dir === 0) {
    ctx.fillRect(cx + 1 * S, cy + 2 * S, 1 * S, 1 * S);
    ctx.fillRect(cx + 3 * S, cy + 2 * S, 1 * S, 1 * S);
  } else if (dir === 2) {
    ctx.fillRect(cx, cy + 2 * S, 1 * S, 1 * S);
    ctx.fillRect(cx + 2 * S, cy + 2 * S, 1 * S, 1 * S);
  } else if (dir === 3) {
    ctx.fillRect(cx + 2 * S, cy + 2 * S, 1 * S, 1 * S);
    ctx.fillRect(cx + 4 * S, cy + 2 * S, 1 * S, 1 * S);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: number, walkFrame: number, fr: number) {
  const step = Math.floor(walkFrame / 6) % 4;
  const legOff = walkFrame > 0 ? (step % 2 === 0 ? S : -S) : 0;
  const bob = walkFrame > 0 ? (step % 2 === 0 ? S : 0) : 0;

  // Shadow
  ctx.fillStyle = "#00000044";
  ctx.fillRect(cx - 1 * S, cy + 15 * S, 7 * S, 2 * S);

  // Legs
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(cx, cy + 12 * S + legOff, 2 * S, 4 * S);
  ctx.fillRect(cx + 3 * S, cy + 12 * S - legOff, 2 * S, 4 * S);
  // Shoes
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(cx - S, cy + 15 * S + legOff, 3 * S, S);
  ctx.fillRect(cx + 3 * S, cy + 15 * S - legOff, 3 * S, S);
  // Body
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(cx, cy + 4 * S - bob, 5 * S, 6 * S);
  ctx.fillRect(cx - 1 * S, cy + 4 * S - bob, 7 * S, 2 * S);
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(cx + 1 * S, cy + 4 * S - bob, 3 * S, S);
  // Arms
  ctx.fillStyle = "#f5c6a0";
  if (walkFrame > 0) {
    ctx.fillRect(cx - 2 * S, cy + 5 * S - bob + legOff, 2 * S, 5 * S);
    ctx.fillRect(cx + 5 * S, cy + 5 * S - bob - legOff, 2 * S, 5 * S);
  } else {
    ctx.fillRect(cx - 2 * S, cy + 5 * S, 2 * S, 5 * S);
    ctx.fillRect(cx + 5 * S, cy + 5 * S, 2 * S, 5 * S);
  }
  // Pants
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(cx - 1 * S, cy + 9 * S - bob, 7 * S, 4 * S);
  // Head
  ctx.fillStyle = "#f5c6a0";
  ctx.fillRect(cx, cy - bob, 5 * S, 5 * S);
  // Hair
  ctx.fillStyle = "#3b2506";
  ctx.fillRect(cx - 1 * S, cy - 1 * S - bob, 7 * S, 3 * S);
  ctx.fillRect(cx - 1 * S, cy + 1 * S - bob, 1 * S, 3 * S);
  ctx.fillRect(cx + 5 * S, cy + 1 * S - bob, 1 * S, 3 * S);
  // Crown
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(cx + S, cy - 3 * S - bob, S, S);
  ctx.fillRect(cx + 3 * S, cy - 3 * S - bob, S, S);
  ctx.fillRect(cx, cy - 2 * S - bob, 5 * S, S);
  // Eyes
  ctx.fillStyle = "#1a1a2e";
  if (dir === 0) {
    ctx.fillRect(cx + 1 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 3 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillStyle = "#d97070"; ctx.fillRect(cx + 2 * S, cy + 3 * S - bob, 1 * S, 1 * S);
  } else if (dir === 2) {
    ctx.fillRect(cx, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 2 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  } else if (dir === 3) {
    ctx.fillRect(cx + 2 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 4 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  }

  // "ТИ" label
  ctx.font = `bold ${6 * S}px monospace`;
  const label = "TI";
  const lm = ctx.measureText(label);
  const lx = cx + 2.5 * S - lm.width / 2;
  ctx.fillStyle = "#fbbf2499";
  ctx.fillRect(lx - 3 * S, cy - 13 * S - bob, lm.width + 6 * S, 9 * S);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(lx - 3 * S, cy - 5 * S - bob, lm.width + 6 * S, S);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, lx, cy - 6 * S - bob);
}

function drawNameTag(ctx: CanvasRenderingContext2D, cx: number, cy: number, name: string, state: string) {
  ctx.font = `bold ${7 * S}px sans-serif`;
  const m = ctx.measureText(name);
  const tx = cx - m.width / 2 + 2 * S, ty = cy - 10 * S;
  ctx.fillStyle = "#0f0f1aDD";
  ctx.fillRect(tx - 3 * S, ty - 8 * S, m.width + 6 * S, 11 * S);
  ctx.fillStyle = state === "working" ? "#34d399" : "#fbbf24";
  ctx.fillRect(tx - 3 * S, ty + 2 * S, m.width + 6 * S, S);
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(name, tx, ty);
}

function drawBubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, fr: number) {
  const short = text.length > 22 ? text.substring(0, 22) + "..." : text;
  ctx.font = `${6 * S}px sans-serif`;
  const m = ctx.measureText(short);
  const tx = cx - m.width / 2, ty = cy - 22 * S;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#1a1a2eEE";
  ctx.fillRect(tx - 4 * S, ty - 8 * S, m.width + 8 * S, 12 * S);
  ctx.strokeStyle = "#c084fc55";
  ctx.lineWidth = S;
  ctx.strokeRect(tx - 4 * S, ty - 8 * S, m.width + 8 * S, 12 * S);
  ctx.fillStyle = "#c084fc";
  ctx.fillText(short, tx, ty);
  ctx.globalAlpha = 1;
}
