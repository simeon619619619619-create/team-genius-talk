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
const ROOM_W = 28;
const ROOM_H = 18;
const MOVE_SPEED = 1.8;
const INTERACT_DIST = 2.5;

// Desks positions (tile coords)
const DESKS = [
  { x: 4, y: 4 }, { x: 8, y: 4 },
  { x: 18, y: 4 }, { x: 22, y: 4 },
  { x: 4, y: 11 }, { x: 8, y: 11 },
  { x: 18, y: 11 }, { x: 22, y: 11 },
];

interface BotState {
  bot: AiBot;
  tx: number; // tile x
  ty: number; // tile y
  targetX: number;
  targetY: number;
  deskIdx: number;
  atDesk: boolean;
  walkingToPlayer: boolean;
  dir: 0 | 1 | 2 | 3; // 0=down 1=up 2=left 3=right
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
  const [nearBot, setNearBot] = useState<AiBot | null>(null);
  const [showInteractHint, setShowInteractHint] = useState(false);

  // Player state
  const playerRef = useRef({
    x: 14, y: 14, dir: 0 as 0 | 1 | 2 | 3, animFrame: 0, moving: false,
  });

  // Bot states
  const botStatesRef = useRef<BotState[]>([]);

  // Initialize bot states when bots change
  useEffect(() => {
    const states: BotState[] = bots.map((bot, i) => {
      const existing = botStatesRef.current.find(s => s.bot.id === bot.id);
      const deskIdx = i % DESKS.length;
      const desk = DESKS[deskIdx];
      const isWorking = bot.state === "working";

      if (existing) {
        return { ...existing, bot, deskIdx };
      }

      return {
        bot,
        tx: isWorking ? desk.x + 0.3 : desk.x + 0.3,
        ty: isWorking ? desk.y + 1.5 : desk.y + 1.5,
        targetX: desk.x + 0.3,
        targetY: desk.y + 1.5,
        deskIdx,
        atDesk: true,
        walkingToPlayer: false,
        dir: 0,
        animFrame: 0,
        bubble: "",
        bubbleTimer: 0,
        taskDone: false,
      };
    });
    botStatesRef.current = states;
  }, [bots]);

  // Handle keyboard
  useEffect(() => {
    if (!gameMode) return;
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "e" && nearBot && onOpenChat) {
        onOpenChat(nearBot);
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
  }, [gameMode, nearBot, onOpenChat]);

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
    if (gameMode) {
      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("arrowup")) { dy = -MOVE_SPEED; player.dir = 1; }
      if (keys.has("s") || keys.has("arrowdown")) { dy = MOVE_SPEED; player.dir = 0; }
      if (keys.has("a") || keys.has("arrowleft")) { dx = -MOVE_SPEED; player.dir = 2; }
      if (keys.has("d") || keys.has("arrowright")) { dx = MOVE_SPEED; player.dir = 3; }

      player.moving = dx !== 0 || dy !== 0;
      if (player.moving) player.animFrame++;

      // Normalize diagonal
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }

      const nx = player.x + dx * 0.06;
      const ny = player.y + dy * 0.06;

      // Bounds
      if (nx > 1.5 && nx < ROOM_W - 2.5) player.x = nx;
      if (ny > 2.5 && ny < ROOM_H - 1.5) player.y = ny;
    }

    // ─── UPDATE BOTS ───
    let closestBot: AiBot | null = null;
    let closestDist = INTERACT_DIST;

    for (const bs of botStates) {
      // Move towards target
      const ddx = bs.targetX - bs.tx;
      const ddy = bs.targetY - bs.ty;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      if (dist > 0.1) {
        const speed = 0.03;
        bs.tx += (ddx / dist) * speed;
        bs.ty += (ddy / dist) * speed;
        bs.animFrame++;
        if (Math.abs(ddx) > Math.abs(ddy)) bs.dir = ddx > 0 ? 3 : 2;
        else bs.dir = ddy > 0 ? 0 : 1;
      } else {
        bs.atDesk = true;
      }

      // When task is done, walk to player
      if (bs.taskDone && !bs.walkingToPlayer) {
        bs.walkingToPlayer = true;
        bs.targetX = player.x - 1;
        bs.targetY = player.y;
        bs.bubble = "Готово! Имам резултати";
        bs.bubbleTimer = 300;
      }

      if (bs.bubbleTimer > 0) bs.bubbleTimer--;
      if (bs.bubbleTimer === 0) bs.bubble = "";

      // Check distance to player
      const pdx = bs.tx - player.x;
      const pdy = bs.ty - player.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < closestDist) {
        closestDist = pdist;
        closestBot = bs.bot;
      }
    }

    setNearBot(closestBot);
    setShowInteractHint(!!closestBot);

    // ─── DRAW ───
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
    for (const wx of [4, 11, 18]) {
      rect(wx, 0, 3, 2, "#2d3748");
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(wx * PX + 4 * S, 2 * S, 3 * PX - 8 * S, 2 * PX - 6 * S);
      ctx.fillStyle = "#2a5a8f44";
      ctx.fillRect(wx * PX + 6 * S, 3 * S, 8 * S, 6 * S);
    }

    // Meeting area
    ctx.fillStyle = "#5b2040";
    ctx.fillRect(11 * PX, 8 * PX, 6 * PX, 4 * PX);
    ctx.fillStyle = "#7b3060";
    ctx.fillRect(11 * PX + 4 * S, 8 * PX + 4 * S, 6 * PX - 8 * S, 4 * PX - 8 * S);
    ctx.fillStyle = "#9b4080";
    ctx.fillRect(11 * PX + 8 * S, 8 * PX + 8 * S, 6 * PX - 16 * S, 4 * PX - 16 * S);

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
    drawPlant(13, 13);

    // Couch
    const cb = 12 * PX, ct = 13 * PX;
    ctx.fillStyle = "#4a2060"; ctx.fillRect(cb, ct, 4 * PX, 4 * S);
    ctx.fillStyle = "#6b3090"; ctx.fillRect(cb, ct + 4 * S, 4 * PX, 10 * S);
    ctx.fillStyle = "#5a2878"; ctx.fillRect(cb - 2 * S, ct + 2 * S, 4 * S, 12 * S);
    ctx.fillRect(cb + 4 * PX - 2 * S, ct + 2 * S, 4 * S, 12 * S);
    ctx.fillStyle = "#8040b0"; ctx.fillRect(cb + 4 * S, ct + 5 * S, 2 * PX - 6 * S, 8 * S);
    ctx.fillRect(cb + 2 * PX + 2 * S, ct + 5 * S, 2 * PX - 6 * S, 8 * S);

    // Whiteboard
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(PX, 3 * PX + 2 * S, 2 * S, 3 * PX - 4 * S);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(PX, 3 * PX + 6 * S, S, 8 * S);
    ctx.fillStyle = "#3b82f6"; ctx.fillRect(PX, 3 * PX + 18 * S, S, 6 * S);
    ctx.fillStyle = "#10b981"; ctx.fillRect(PX, 3 * PX + 28 * S, S, 10 * S);

    // Coffee machine
    const cmx = ROOM_W - 2, cmy = ROOM_H - 2;
    ctx.fillStyle = "#5c3a1e"; ctx.fillRect(cmx * PX, cmy * PX, PX, PX);
    ctx.fillStyle = "#7c5a3e"; ctx.fillRect(cmx * PX + 2 * S, cmy * PX + 2 * S, PX - 4 * S, PX - 2 * S);

    // Water cooler
    const wcx = 1 * PX, wcy = 9 * PX;
    ctx.fillStyle = "#9ca3af"; ctx.fillRect(wcx + 4 * S, wcy + 8 * S, 8 * S, 8 * S);
    ctx.fillStyle = "#60a5fa"; ctx.fillRect(wcx + 5 * S, wcy + S, 6 * S, 8 * S);
    ctx.fillStyle = "#93c5fd"; ctx.fillRect(wcx + 6 * S, wcy + 2 * S, 4 * S, 5 * S);

    // Desks
    const drawDesk = (tx: number, ty: number) => {
      const b = tx * PX, t = ty * PX;
      ctx.fillStyle = "#6b5030"; ctx.fillRect(b - 2 * S, t, 2 * PX + 4 * S, PX + 4 * S);
      ctx.fillStyle = "#8b7050"; ctx.fillRect(b, t + 2 * S, 2 * PX, PX);
      ctx.fillStyle = "#5a4020"; ctx.fillRect(b, t + PX + 2 * S, 3 * S, 4 * S);
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

    // Draw all desks
    DESKS.slice(0, Math.max(bots.length, 6)).forEach(d => drawDesk(d.x, d.y));

    // ─── DRAW CHARACTERS (sorted by Y for depth) ───
    const entities: { y: number; draw: () => void }[] = [];

    // Bots
    for (const bs of botStates) {
      const px = bs.tx * PX;
      const py = bs.ty * PX;
      const isWorking = bs.bot.state === "working" && bs.atDesk;
      const desk = DESKS[bs.deskIdx];

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

          // Name tag
          drawNameTag(ctx, px, py, bs.bot.name, isWorking ? "working" : "idle");

          // Bubble
          if (bs.bubble && bs.bubbleTimer > 0) {
            drawBubble(ctx, px, py, bs.bubble, frame);
          }

          // Selected highlight
          if (selectedBotId === bs.bot.id) {
            ctx.strokeStyle = "#c084fc";
            ctx.lineWidth = 2 * S;
            ctx.strokeRect(px - 4 * S, py - 12 * S, 14 * S, 28 * S);
          }

          // Interaction glow for nearby bot
          if (nearBot?.id === bs.bot.id && gameMode) {
            ctx.strokeStyle = `rgba(192, 132, 252, ${0.4 + Math.sin(frame * 0.1) * 0.3})`;
            ctx.lineWidth = 2 * S;
            ctx.strokeRect(px - 6 * S, py - 14 * S, 18 * S, 32 * S);
          }
        },
      });
    }

    // Player
    if (gameMode) {
      const ppx = player.x * PX;
      const ppy = player.y * PX;
      entities.push({
        y: ppy,
        draw: () => {
          drawPlayer(ctx, ppx, ppy, player.dir, player.moving ? player.animFrame : 0, frame);
        },
      });
    }

    // Sort by Y and draw
    entities.sort((a, b) => a.y - b.y);
    entities.forEach(e => e.draw());

    // ─── HUD ───
    if (gameMode) {
      // Mini-map dot for player
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(player.x * PX - 2 * S, ROOM_H * PX + 2 * S, 4 * S, 4 * S);
    }

    // Interaction hint
    if (showInteractHint && nearBot && gameMode) {
      const hx = canvas.width / 2;
      const hy = canvas.height - 30 * S;
      ctx.font = `bold ${7 * S}px monospace`;
      const text = `[E] Говори с ${nearBot.name}`;
      const m = ctx.measureText(text);
      ctx.fillStyle = "#0f0f1aDD";
      ctx.fillRect(hx - m.width / 2 - 6 * S, hy - 8 * S, m.width + 12 * S, 14 * S);
      ctx.strokeStyle = "#c084fc55";
      ctx.lineWidth = S;
      ctx.strokeRect(hx - m.width / 2 - 6 * S, hy - 8 * S, m.width + 12 * S, 14 * S);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillText(text, hx - m.width / 2, hy);
    }

    // Controls help
    if (gameMode) {
      ctx.font = `${5 * S}px monospace`;
      ctx.fillStyle = "#ffffff44";
      ctx.fillText("WASD / Arrows = Движение  |  E = Говори  |  Click = Избери", 2 * PX, (ROOM_H - 0.3) * PX);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [bots, selectedBotId, gameMode, nearBot, showInteractHint]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Click to select bot
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    const mx = (e.clientX - r.left) * sx / PX;
    const my = (e.clientY - r.top) * sy / PX;

    // Check if clicked near a bot
    for (const bs of botStatesRef.current) {
      const dx = mx - bs.tx;
      const dy = my - bs.ty;
      if (Math.sqrt(dx * dx + dy * dy) < 1.5) {
        if (onSelectBot) {
          onSelectBot(selectedBotId === bs.bot.id ? null : bs.bot.id);
        }
        if (gameMode && onOpenChat) {
          onOpenChat(bs.bot);
        }
        return;
      }
    }

    // If game mode, move player by clicking
    if (gameMode) {
      playerRef.current.x = Math.max(1.5, Math.min(ROOM_W - 2.5, mx));
      playerRef.current.y = Math.max(2.5, Math.min(ROOM_H - 1.5, my));
    }

    if (onSelectBot) onSelectBot(null);
  };

  // Simulate a bot finishing task
  const simulateTaskDone = useCallback((botId: string) => {
    const bs = botStatesRef.current.find(s => s.bot.id === botId);
    if (bs) {
      bs.taskDone = true;
      bs.bubble = "Задачата е готова!";
      bs.bubbleTimer = 200;
    }
  }, []);

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
        />
        {/* Mobile controls */}
        {gameMode && (
          <div className="absolute bottom-4 right-4 md:hidden flex flex-col items-center gap-1">
            <button
              className="w-10 h-10 rounded-lg bg-purple-600/50 text-white flex items-center justify-center text-lg active:bg-purple-600"
              onTouchStart={() => keysRef.current.add("w")}
              onTouchEnd={() => keysRef.current.delete("w")}
            >
              W
            </button>
            <div className="flex gap-1">
              <button
                className="w-10 h-10 rounded-lg bg-purple-600/50 text-white flex items-center justify-center text-lg active:bg-purple-600"
                onTouchStart={() => keysRef.current.add("a")}
                onTouchEnd={() => keysRef.current.delete("a")}
              >
                A
              </button>
              <button
                className="w-10 h-10 rounded-lg bg-yellow-500/50 text-white flex items-center justify-center text-xs font-bold active:bg-yellow-500"
                onTouchStart={() => { if (nearBot && onOpenChat) onOpenChat(nearBot); }}
              >
                E
              </button>
              <button
                className="w-10 h-10 rounded-lg bg-purple-600/50 text-white flex items-center justify-center text-lg active:bg-purple-600"
                onTouchStart={() => keysRef.current.add("d")}
                onTouchEnd={() => keysRef.current.delete("d")}
              >
                D
              </button>
            </div>
            <button
              className="w-10 h-10 rounded-lg bg-purple-600/50 text-white flex items-center justify-center text-lg active:bg-purple-600"
              onTouchStart={() => keysRef.current.add("s")}
              onTouchEnd={() => keysRef.current.delete("s")}
            >
              S
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DRAWING HELPERS ───

function drawSitting(ctx: CanvasRenderingContext2D, cx: number, cy: number, bot: AiBot, fr: number) {
  // Chair
  ctx.fillStyle = "#374151"; ctx.fillRect(cx - 3 * S, cy + 4 * S, 10 * S, 8 * S);
  ctx.fillStyle = "#4b5563"; ctx.fillRect(cx - 2 * S, cy + 5 * S, 8 * S, 6 * S);
  ctx.fillStyle = "#374151"; ctx.fillRect(cx - 1 * S, cy + 10 * S, 6 * S, 4 * S);
  // Body
  ctx.fillStyle = bot.shirtColor; ctx.fillRect(cx, cy + 4 * S, 4 * S, 5 * S);
  ctx.fillRect(cx - 2 * S, cy + 4 * S, 8 * S, 2 * S);
  // Head
  ctx.fillStyle = bot.skinColor; ctx.fillRect(cx, cy, 4 * S, 4 * S);
  // Hair
  ctx.fillStyle = bot.hairColor;
  ctx.fillRect(cx - 1 * S, cy - 1 * S, 6 * S, 3 * S);
  ctx.fillRect(cx - 1 * S, cy, 1 * S, 4 * S);
  ctx.fillRect(cx + 4 * S, cy, 1 * S, 4 * S);
  // Arms typing
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx - 2 * S, cy + 3 * S, 2 * S, 2 * S);
  ctx.fillRect(cx + 4 * S, cy + 3 * S, 2 * S, 2 * S);
  if (fr % 8 < 4) ctx.fillRect(cx - 2 * S, cy + 2 * S, 2 * S, 2 * S);
  else ctx.fillRect(cx + 4 * S, cy + 2 * S, 2 * S, 2 * S);
}

function drawStanding(ctx: CanvasRenderingContext2D, cx: number, cy: number, bot: AiBot, fr: number) {
  const bob = Math.sin(fr * 0.08) > 0 ? S : 0;
  // Legs
  ctx.fillStyle = "#2d2d4a";
  ctx.fillRect(cx, cy + 12 * S, 2 * S, 4 * S);
  ctx.fillRect(cx + 3 * S, cy + 12 * S, 2 * S, 4 * S);
  // Pants
  ctx.fillStyle = bot.shirtColor + "88";
  ctx.fillRect(cx - 1 * S, cy + 9 * S, 7 * S, 4 * S);
  // Body
  ctx.fillStyle = bot.shirtColor;
  ctx.fillRect(cx, cy + 4 * S - bob, 5 * S, 6 * S);
  ctx.fillRect(cx - 1 * S, cy + 4 * S - bob, 7 * S, 2 * S);
  // Arms
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx - 2 * S, cy + 5 * S - bob, 2 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 5 * S - bob, 2 * S, 5 * S);
  // Head
  ctx.fillRect(cx, cy - bob, 5 * S, 5 * S);
  // Hair
  ctx.fillStyle = bot.hairColor;
  ctx.fillRect(cx - 1 * S, cy - 1 * S - bob, 7 * S, 3 * S);
  ctx.fillRect(cx - 1 * S, cy + 1 * S - bob, 1 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 1 * S - bob, 1 * S, 5 * S);
  // Eyes
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(cx + 1 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  ctx.fillRect(cx + 3 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  // Blink
  if (fr % 60 > 55) {
    ctx.fillStyle = bot.skinColor;
    ctx.fillRect(cx + 1 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 3 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  }
}

function drawWalking(ctx: CanvasRenderingContext2D, cx: number, cy: number, bot: AiBot, dir: number, fr: number) {
  const step = Math.floor(fr / 6) % 4;
  const legOff = step % 2 === 0 ? S : -S;

  // Legs with walking animation
  ctx.fillStyle = "#2d2d4a";
  ctx.fillRect(cx, cy + 12 * S + legOff, 2 * S, 4 * S);
  ctx.fillRect(cx + 3 * S, cy + 12 * S - legOff, 2 * S, 4 * S);
  // Body
  ctx.fillStyle = bot.shirtColor;
  ctx.fillRect(cx, cy + 4 * S, 5 * S, 6 * S);
  ctx.fillRect(cx - 1 * S, cy + 4 * S, 7 * S, 2 * S);
  // Arms swinging
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx - 2 * S, cy + 5 * S + legOff, 2 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 5 * S - legOff, 2 * S, 5 * S);
  // Pants
  ctx.fillStyle = bot.shirtColor + "88";
  ctx.fillRect(cx - 1 * S, cy + 9 * S, 7 * S, 4 * S);
  // Head
  ctx.fillStyle = bot.skinColor;
  ctx.fillRect(cx, cy, 5 * S, 5 * S);
  // Hair
  ctx.fillStyle = bot.hairColor;
  ctx.fillRect(cx - 1 * S, cy - 1 * S, 7 * S, 3 * S);
  ctx.fillRect(cx - 1 * S, cy + 1 * S, 1 * S, 5 * S);
  ctx.fillRect(cx + 5 * S, cy + 1 * S, 1 * S, 5 * S);
  // Eyes based on direction
  ctx.fillStyle = "#1a1a2e";
  if (dir === 0) { // down
    ctx.fillRect(cx + 1 * S, cy + 2 * S, 1 * S, 1 * S);
    ctx.fillRect(cx + 3 * S, cy + 2 * S, 1 * S, 1 * S);
  } else if (dir === 1) { // up - no eyes visible
  } else if (dir === 2) { // left
    ctx.fillRect(cx + 0 * S, cy + 2 * S, 1 * S, 1 * S);
    ctx.fillRect(cx + 2 * S, cy + 2 * S, 1 * S, 1 * S);
  } else { // right
    ctx.fillRect(cx + 2 * S, cy + 2 * S, 1 * S, 1 * S);
    ctx.fillRect(cx + 4 * S, cy + 2 * S, 1 * S, 1 * S);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: number, walkFrame: number, fr: number) {
  const step = Math.floor(walkFrame / 6) % 4;
  const legOff = walkFrame > 0 ? (step % 2 === 0 ? S : -S) : 0;
  const bob = walkFrame > 0 ? (step % 2 === 0 ? S : 0) : 0;

  // Shadow
  ctx.fillStyle = "#00000033";
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
  // Collar
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

  // Crown / indicator
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(cx + S, cy - 3 * S - bob, S, S);
  ctx.fillRect(cx + 3 * S, cy - 3 * S - bob, S, S);
  ctx.fillRect(cx, cy - 2 * S - bob, 5 * S, S);

  // Eyes based on direction
  ctx.fillStyle = "#1a1a2e";
  if (dir === 0) {
    ctx.fillRect(cx + 1 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 3 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillStyle = "#d97070"; ctx.fillRect(cx + 2 * S, cy + 3 * S - bob, 1 * S, 1 * S);
  } else if (dir === 1) {
    // Back of head, no eyes
  } else if (dir === 2) {
    ctx.fillRect(cx + 0 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 2 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  } else {
    ctx.fillRect(cx + 2 * S, cy + 2 * S - bob, 1 * S, 1 * S);
    ctx.fillRect(cx + 4 * S, cy + 2 * S - bob, 1 * S, 1 * S);
  }

  // "YOU" label
  ctx.font = `bold ${6 * S}px monospace`;
  const label = "TI";
  const lm = ctx.measureText(label);
  const lx = cx + 2.5 * S - lm.width / 2;
  ctx.fillStyle = "#fbbf2488";
  ctx.fillRect(lx - 3 * S, cy - 12 * S - bob, lm.width + 6 * S, 9 * S);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(lx - 3 * S, cy - 4 * S - bob, lm.width + 6 * S, S);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, lx, cy - 5 * S - bob);
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
  ctx.globalAlpha = 0.8 + Math.sin(fr * 0.05) * 0.15;
  ctx.fillStyle = "#1a1a2eEE";
  ctx.fillRect(tx - 4 * S, ty - 8 * S, m.width + 8 * S, 12 * S);
  ctx.strokeStyle = "#c084fc55";
  ctx.lineWidth = S;
  ctx.strokeRect(tx - 4 * S, ty - 8 * S, m.width + 8 * S, 12 * S);
  // Pointer triangle
  ctx.fillStyle = "#1a1a2eEE";
  ctx.fillRect(cx, ty + 3 * S, 3 * S, 3 * S);
  ctx.fillStyle = "#c084fc";
  ctx.fillText(short, tx, ty);
  ctx.globalAlpha = 1;
}
