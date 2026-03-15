import { useRef, useEffect, useCallback } from "react";

export interface AiBotSubtask {
  id: string;
  text: string;
  done: boolean;
}

export interface AiBotTaskGroup {
  id: string;
  title: string;
  subtasks: AiBotSubtask[];
}

export interface AiBot {
  id: string;
  name: string;
  role: string;
  process: string;
  frequency: string;
  automations: string[];
  tasks: string[];
  taskGroups?: AiBotTaskGroup[];
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  state?: "working" | "idle";
}

interface Props {
  bots: AiBot[];
  selectedBotId?: string | null;
  onSelectBot?: (id: string | null) => void;
}

const SCALE = 3;
const PX = 16 * SCALE;
const ROOM_W = 24;
const ROOM_H = 16;

const DESKS = [
  { x: 3, y: 3 }, { x: 7, y: 3 },
  { x: 17, y: 3 }, { x: 21, y: 3 },
  { x: 3, y: 10 }, { x: 17, y: 10 },
  { x: 7, y: 10 }, { x: 11, y: 3 },
];

const IDLE_SPOTS = [
  { x: 10, y: 9 }, { x: 13, y: 9 }, { x: 2, y: 8 },
  { x: 11, y: 13 }, { x: 13, y: 13 }, { x: 7, y: 8 },
  { x: 15, y: 8 }, { x: 5, y: 8 },
];

export function VirtualOffice({ bots, selectedBotId, onSelectBot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const boundsRef = useRef<{ id: string; x: number; y: number; w: number; h: number }[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = frameRef.current++;

    // ─── ROOM ───
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor
    for (let y = 2; y < ROOM_H - 1; y++)
      for (let x = 1; x < ROOM_W - 1; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#3d3524" : "#352e1f";
        ctx.fillRect(x * PX, y * PX, PX, PX);
        ctx.fillStyle = "#2a2418";
        ctx.fillRect(x * PX, y * PX, PX, SCALE);
        ctx.fillRect(x * PX, y * PX, SCALE, PX);
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
    ctx.fillRect(PX, 2 * PX - 2 * SCALE, (ROOM_W - 2) * PX, 2 * SCALE);

    // Windows
    for (const wx of [4, 10, 16]) {
      rect(wx, 0, 3, 2, "#2d3748");
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(wx * PX + 4 * SCALE, 2 * SCALE, 3 * PX - 8 * SCALE, 2 * PX - 6 * SCALE);
      ctx.fillStyle = "#2a5a8f44";
      ctx.fillRect(wx * PX + 6 * SCALE, 3 * SCALE, 8 * SCALE, 6 * SCALE);
    }

    // Rug
    ctx.fillStyle = "#5b2040";
    ctx.fillRect(9 * PX, 7 * PX, 6 * PX, 4 * PX);
    ctx.fillStyle = "#7b3060";
    ctx.fillRect(9 * PX + 4 * SCALE, 7 * PX + 4 * SCALE, 6 * PX - 8 * SCALE, 4 * PX - 8 * SCALE);
    ctx.fillStyle = "#9b4080";
    ctx.fillRect(9 * PX + 8 * SCALE, 7 * PX + 8 * SCALE, 6 * PX - 16 * SCALE, 4 * PX - 16 * SCALE);

    // Plants
    const drawPlant = (tx: number, ty: number) => {
      const b = tx * PX, t = ty * PX;
      ctx.fillStyle = "#8b4513"; ctx.fillRect(b + 4 * SCALE, t + 10 * SCALE, 8 * SCALE, 6 * SCALE);
      ctx.fillStyle = "#a0522d"; ctx.fillRect(b + 3 * SCALE, t + 10 * SCALE, 10 * SCALE, 2 * SCALE);
      ctx.fillStyle = "#2d8b4e"; ctx.fillRect(b + 3 * SCALE, t + 4 * SCALE, 10 * SCALE, 7 * SCALE);
      ctx.fillStyle = "#3da85e"; ctx.fillRect(b + 5 * SCALE, t + 2 * SCALE, 6 * SCALE, 9 * SCALE);
      ctx.fillStyle = "#4ec870"; ctx.fillRect(b + 6 * SCALE, t + 3 * SCALE, 4 * SCALE, 5 * SCALE);
    };
    drawPlant(2, 2);
    drawPlant(ROOM_W - 3, 2);

    // Couch
    const cb = 10 * PX, ct = 12 * PX;
    ctx.fillStyle = "#4a2060"; ctx.fillRect(cb, ct, 4 * PX, 4 * SCALE);
    ctx.fillStyle = "#6b3090"; ctx.fillRect(cb, ct + 4 * SCALE, 4 * PX, 10 * SCALE);
    ctx.fillStyle = "#5a2878"; ctx.fillRect(cb - 2 * SCALE, ct + 2 * SCALE, 4 * SCALE, 12 * SCALE);
    ctx.fillRect(cb + 4 * PX - 2 * SCALE, ct + 2 * SCALE, 4 * SCALE, 12 * SCALE);
    ctx.fillStyle = "#8040b0"; ctx.fillRect(cb + 4 * SCALE, ct + 5 * SCALE, 2 * PX - 6 * SCALE, 8 * SCALE);
    ctx.fillRect(cb + 2 * PX + 2 * SCALE, ct + 5 * SCALE, 2 * PX - 6 * SCALE, 8 * SCALE);
    ctx.fillStyle = "#c084fc"; ctx.fillRect(cb + 2 * SCALE, ct + 5 * SCALE, 6 * SCALE, 6 * SCALE);
    ctx.fillRect(cb + 4 * PX - 8 * SCALE, ct + 5 * SCALE, 6 * SCALE, 6 * SCALE);

    // Coffee table
    const tb = 11 * PX, tt = 11 * PX;
    ctx.fillStyle = "#5c3a1e"; ctx.fillRect(tb, tt + 4 * SCALE, 2 * PX, 8 * SCALE);
    ctx.fillStyle = "#7c5a3e"; ctx.fillRect(tb + 2 * SCALE, tt + 5 * SCALE, 2 * PX - 4 * SCALE, 6 * SCALE);
    ctx.fillStyle = "#fff"; ctx.fillRect(tb + 6 * SCALE, tt + 6 * SCALE, 4 * SCALE, 4 * SCALE);

    // Water cooler
    const wb = 1 * PX, wt = 8 * PX;
    ctx.fillStyle = "#9ca3af"; ctx.fillRect(wb + 4 * SCALE, wt + 8 * SCALE, 8 * SCALE, 8 * SCALE);
    ctx.fillStyle = "#60a5fa"; ctx.fillRect(wb + 5 * SCALE, wt + SCALE, 6 * SCALE, 8 * SCALE);
    ctx.fillStyle = "#93c5fd"; ctx.fillRect(wb + 6 * SCALE, wt + 2 * SCALE, 4 * SCALE, 5 * SCALE);
    ctx.fillStyle = "#e0e0e0"; ctx.fillRect(wb + 6 * SCALE, wt, 4 * SCALE, 2 * SCALE);

    // Whiteboard
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(PX, 3 * PX + 2 * SCALE, 2 * SCALE, 3 * PX - 4 * SCALE);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(PX, 3 * PX + 6 * SCALE, SCALE, 8 * SCALE);
    ctx.fillStyle = "#3b82f6"; ctx.fillRect(PX, 3 * PX + 18 * SCALE, SCALE, 6 * SCALE);
    ctx.fillStyle = "#10b981"; ctx.fillRect(PX, 3 * PX + 28 * SCALE, SCALE, 10 * SCALE);

    // Clock
    const cx2 = 12 * PX + 4 * SCALE, cy2 = 4 * SCALE;
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(cx2, cy2, 8 * SCALE, 8 * SCALE);
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(cx2 + SCALE, cy2 + SCALE, 6 * SCALE, 6 * SCALE);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(cx2 + 3 * SCALE, cy2 + 2 * SCALE, SCALE, 3 * SCALE);
    ctx.fillStyle = "#fff"; ctx.fillRect(cx2 + 3 * SCALE, cy2 + 3 * SCALE, 2 * SCALE, SCALE);

    // Door
    rect(ROOM_W - 2, ROOM_H - 1, 1, 1, "#5c3a1e");
    ctx.fillStyle = "#7c5a3e";
    ctx.fillRect((ROOM_W - 2) * PX + 2 * SCALE, (ROOM_H - 1) * PX + 2 * SCALE, PX - 4 * SCALE, PX - 2 * SCALE);

    // ─── DESK DRAWING ───
    const drawDesk = (tx: number, ty: number) => {
      const b = tx * PX, t = ty * PX;
      ctx.fillStyle = "#6b5030"; ctx.fillRect(b - 2 * SCALE, t, 2 * PX + 4 * SCALE, PX + 4 * SCALE);
      ctx.fillStyle = "#8b7050"; ctx.fillRect(b, t + 2 * SCALE, 2 * PX, PX);
      ctx.fillStyle = "#5a4020"; ctx.fillRect(b, t + PX + 2 * SCALE, 3 * SCALE, 4 * SCALE);
      ctx.fillRect(b + 2 * PX - 3 * SCALE, t + PX + 2 * SCALE, 3 * SCALE, 4 * SCALE);
      ctx.fillStyle = "#1f2937"; ctx.fillRect(b + 4 * SCALE, t - 6 * SCALE, 12 * SCALE, 10 * SCALE);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(b + 5 * SCALE, t - 5 * SCALE, 10 * SCALE, 7 * SCALE);
      ctx.fillStyle = "#374151"; ctx.fillRect(b + 8 * SCALE, t + 4 * SCALE, 4 * SCALE, 2 * SCALE);
      ctx.fillRect(b + 6 * SCALE, t + 5 * SCALE, 8 * SCALE, SCALE);
      ctx.fillStyle = "#4b5563"; ctx.fillRect(b + 4 * SCALE, t + 8 * SCALE, 10 * SCALE, 4 * SCALE);
      ctx.fillStyle = "#6b7280"; ctx.fillRect(b + 5 * SCALE, t + 9 * SCALE, 8 * SCALE, 2 * SCALE);
      ctx.fillStyle = "#9ca3af"; ctx.fillRect(b + 18 * SCALE, t + 9 * SCALE, 4 * SCALE, 3 * SCALE);
    };

    const drawScreenActive = (tx: number, ty: number, fr: number) => {
      const b = tx * PX, t = ty * PX;
      const cols = ["#34d399", "#818cf8", "#f472b6", "#60a5fa", "#fbbf24"];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cols[(i + fr) % cols.length];
        ctx.fillRect(b + 6 * SCALE, t + (-4 + i * 2) * SCALE, (3 + Math.sin(fr * 0.3 + i) * 2) * SCALE, SCALE);
      }
      if (fr % 20 < 10) {
        ctx.fillStyle = "#34d399";
        ctx.fillRect(b + 10 * SCALE, t + 2 * SCALE, SCALE, SCALE);
      }
    };

    // ─── CHARACTER DRAWING ───
    const drawSitting = (cx: number, cy: number, bot: AiBot, fr: number) => {
      const s = SCALE;
      ctx.fillStyle = "#374151"; ctx.fillRect(cx - 3 * s, cy + 4 * s, 10 * s, 8 * s);
      ctx.fillStyle = "#4b5563"; ctx.fillRect(cx - 2 * s, cy + 5 * s, 8 * s, 6 * s);
      ctx.fillStyle = "#374151"; ctx.fillRect(cx - 1 * s, cy + 10 * s, 6 * s, 4 * s);
      ctx.fillStyle = bot.shirtColor; ctx.fillRect(cx, cy + 4 * s, 4 * s, 5 * s);
      ctx.fillRect(cx - 2 * s, cy + 4 * s, 8 * s, 2 * s);
      ctx.fillStyle = bot.skinColor; ctx.fillRect(cx, cy, 4 * s, 4 * s);
      ctx.fillStyle = bot.hairColor;
      ctx.fillRect(cx - 1 * s, cy - 1 * s, 6 * s, 3 * s);
      ctx.fillRect(cx - 1 * s, cy, 1 * s, 4 * s);
      ctx.fillRect(cx + 4 * s, cy, 1 * s, 4 * s);
      ctx.fillStyle = bot.skinColor;
      ctx.fillRect(cx - 2 * s, cy + 3 * s, 2 * s, 2 * s);
      ctx.fillRect(cx + 4 * s, cy + 3 * s, 2 * s, 2 * s);
      if (fr % 8 < 4) ctx.fillRect(cx - 2 * s, cy + 2 * s, 2 * s, 2 * s);
      else ctx.fillRect(cx + 4 * s, cy + 2 * s, 2 * s, 2 * s);
    };

    const drawStanding = (cx: number, cy: number, bot: AiBot, fr: number) => {
      const s = SCALE, bob = Math.sin(fr * 0.08) > 0 ? s : 0;
      ctx.fillStyle = "#2d2d4a";
      ctx.fillRect(cx, cy + 12 * s, 2 * s, 4 * s);
      ctx.fillRect(cx + 3 * s, cy + 12 * s, 2 * s, 4 * s);
      ctx.fillStyle = bot.shirtColor + "88";
      ctx.fillRect(cx - 1 * s, cy + 9 * s, 7 * s, 4 * s);
      ctx.fillStyle = bot.shirtColor;
      ctx.fillRect(cx, cy + 4 * s - bob, 5 * s, 6 * s);
      ctx.fillRect(cx - 1 * s, cy + 4 * s - bob, 7 * s, 2 * s);
      ctx.fillStyle = bot.skinColor;
      ctx.fillRect(cx - 2 * s, cy + 5 * s - bob, 2 * s, 5 * s);
      ctx.fillRect(cx + 5 * s, cy + 5 * s - bob, 2 * s, 5 * s);
      ctx.fillRect(cx, cy - bob, 5 * s, 5 * s);
      ctx.fillStyle = bot.hairColor;
      ctx.fillRect(cx - 1 * s, cy - 1 * s - bob, 7 * s, 3 * s);
      ctx.fillRect(cx - 1 * s, cy + 1 * s - bob, 1 * s, 5 * s);
      ctx.fillRect(cx + 5 * s, cy + 1 * s - bob, 1 * s, 5 * s);
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(cx + 1 * s, cy + 2 * s - bob, 1 * s, 1 * s);
      ctx.fillRect(cx + 3 * s, cy + 2 * s - bob, 1 * s, 1 * s);
      if (fr % 60 > 55) {
        ctx.fillStyle = bot.skinColor;
        ctx.fillRect(cx + 1 * s, cy + 2 * s - bob, 1 * s, 1 * s);
        ctx.fillRect(cx + 3 * s, cy + 2 * s - bob, 1 * s, 1 * s);
      }
      ctx.fillStyle = "#d97070"; ctx.fillRect(cx + 2 * s, cy + 3 * s - bob, 1 * s, 1 * s);
    };

    const drawCouchSit = (cx: number, cy: number, bot: AiBot, fr: number) => {
      const s = SCALE;
      ctx.fillStyle = "#2d2d4a";
      ctx.fillRect(cx, cy + 8 * s, 2 * s, 2 * s);
      ctx.fillRect(cx + 3 * s, cy + 8 * s, 2 * s, 2 * s);
      ctx.fillStyle = bot.shirtColor;
      ctx.fillRect(cx, cy + 2 * s, 5 * s, 6 * s);
      ctx.fillRect(cx - 1 * s, cy + 2 * s, 7 * s, 2 * s);
      ctx.fillStyle = bot.skinColor;
      ctx.fillRect(cx - 2 * s, cy + 4 * s, 2 * s, 4 * s);
      ctx.fillRect(cx + 5 * s, cy + 4 * s, 2 * s, 4 * s);
      ctx.fillRect(cx, cy - 2 * s, 5 * s, 5 * s);
      ctx.fillStyle = bot.hairColor;
      ctx.fillRect(cx - 1 * s, cy - 3 * s, 7 * s, 3 * s);
      ctx.fillRect(cx - 1 * s, cy - 1 * s, 1 * s, 4 * s);
      ctx.fillRect(cx + 5 * s, cy - 1 * s, 1 * s, 4 * s);
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(cx + 1 * s, cy, 1 * s, 1 * s);
      ctx.fillRect(cx + 3 * s, cy, 1 * s, 1 * s);
      if (fr % 80 < 40) {
        ctx.fillStyle = "#60a5fa88";
        ctx.fillRect(cx + 7 * s, cy - 4 * s, 3 * s, SCALE);
        ctx.fillRect(cx + 9 * s, cy - 3 * s, SCALE, SCALE);
        ctx.fillRect(cx + 7 * s, cy - 2 * s, 3 * s, SCALE);
      }
    };

    const drawNameTag = (cx: number, cy: number, name: string, state: string) => {
      const s = SCALE;
      ctx.font = `bold ${8 * s}px sans-serif`;
      const m = ctx.measureText(name);
      const tx = cx - m.width / 2 + 2 * s, ty = cy - 10 * s;
      ctx.fillStyle = "#0f0f1aDD";
      ctx.fillRect(tx - 3 * s, ty - 8 * s, m.width + 6 * s, 11 * s);
      ctx.fillStyle = state === "working" ? "#34d399" : "#fbbf24";
      ctx.fillRect(tx - 3 * s, ty + 2 * s, m.width + 6 * s, SCALE);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillText(name, tx, ty);
    };

    const drawBubble = (cx: number, cy: number, text: string, fr: number) => {
      if (!text) return;
      const s = SCALE;
      ctx.font = `${6 * s}px sans-serif`;
      const short = text.length > 22 ? text.substring(0, 22) + "..." : text;
      const m = ctx.measureText(short);
      const tx = cx - m.width / 2, ty = cy - 20 * s;
      ctx.globalAlpha = 0.75 + Math.sin(fr * 0.05) * 0.2;
      ctx.fillStyle = "#1a1a2eEE";
      ctx.fillRect(tx - 4 * s, ty - 8 * s, m.width + 8 * s, 12 * s);
      ctx.strokeStyle = "#c084fc55";
      ctx.lineWidth = SCALE;
      ctx.strokeRect(tx - 4 * s, ty - 8 * s, m.width + 8 * s, 12 * s);
      ctx.fillStyle = "#c084fc";
      ctx.fillText(short, tx, ty);
      ctx.globalAlpha = 1;
    };

    // ─── DRAW ALL DESKS & BOTS ───
    const newBounds: typeof boundsRef.current = [];

    DESKS.slice(0, Math.max(bots.length, 6)).forEach((d) => drawDesk(d.x, d.y));

    bots.forEach((bot, i) => {
      if (i >= DESKS.length) return;
      const desk = DESKS[i];
      const isWorking = bot.state === "working";

      let px: number, py: number;

      if (isWorking) {
        px = (desk.x + 0.3) * PX;
        py = (desk.y + 1.2) * PX;
        drawScreenActive(desk.x, desk.y, frame);
        drawSitting(px, py, bot, frame);
        drawNameTag(px, py, bot.name, "working");
        const taskText = bot.tasks?.[0] || bot.automations.join(", ");
        drawBubble(px, py, taskText, frame);
      } else if (i % 3 === 0 && i < 6) {
        const spot = IDLE_SPOTS[i % IDLE_SPOTS.length];
        px = spot.x * PX;
        py = spot.y * PX;
        drawCouchSit(px, py, bot, frame);
        drawNameTag(px, py, bot.name, "idle");
      } else {
        const spot = IDLE_SPOTS[i % IDLE_SPOTS.length];
        px = spot.x * PX;
        py = spot.y * PX;
        drawStanding(px, py, bot, frame);
        drawNameTag(px, py, bot.name, "idle");
      }

      newBounds.push({
        id: bot.id,
        x: px - 5 * SCALE,
        y: py - 12 * SCALE,
        w: 16 * SCALE,
        h: 28 * SCALE,
      });

      // Selection highlight
      if (selectedBotId === bot.id) {
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 2 * SCALE;
        ctx.strokeRect(px - 4 * SCALE, py - 12 * SCALE, 14 * SCALE, 28 * SCALE);
      }
    });

    boundsRef.current = newBounds;
    requestAnimationFrame(draw);
  }, [bots, selectedBotId]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelectBot) return;
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    const mx = (e.clientX - r.left) * sx;
    const my = (e.clientY - r.top) * sy;

    let clicked: string | null = null;
    for (const b of boundsRef.current) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        clicked = b.id;
        break;
      }
    }
    onSelectBot(clicked === selectedBotId ? null : clicked);
  };

  const working = bots.filter((b) => b.state === "working").length;
  const idle = bots.length - working;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a] border-b border-[#2a2a4a]">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-purple-400">
          Виртуален Офис
        </h3>
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
      </div>
      <div className="flex justify-center bg-[#12121f]">
        <canvas
          ref={canvasRef}
          width={ROOM_W * PX}
          height={ROOM_H * PX}
          onClick={handleClick}
          className="max-w-full h-auto cursor-pointer"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
