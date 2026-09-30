/**
 * Battle card: a 1080×1350 PNG (Instagram portrait) of the fight that just
 * ended — location, fighter, the player's own hands on the final seal, rank and
 * numbers. Drawn on a canvas entirely in the browser.
 */

export interface CardData {
  heroName: string;
  heroImg: string;
  heroColor: string;
  foeName: string | null;
  bg: string | null;
  snapshot: string | null;
  headline: string; // "ПОБЕДА" / "ВОЛНА 12" …
  sub: string; // "против Итачи" / "волн пройдено"
  rank: string | null; // S A B C
  stats: [string, string][];
  nick: string;
  mySealLabel: string;
  win: boolean;
}

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

function cssFont(varName: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || getComputedStyle(document.body).getPropertyValue(varName).trim();
  return v || fallback;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  const iw = img.width * k;
  const ih = img.height * k;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

export async function drawBattleCard(d: CardData): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const display = cssFont("--font-display", "Impact, sans-serif");
  const ui = cssFont("--font-ui", "system-ui, sans-serif");
  const kanji = cssFont("--font-kanji", "serif");
  const [bg, hero, snap] = await Promise.all([d.bg ? load(d.bg) : null, load(d.heroImg), d.snapshot ? load(d.snapshot) : null]);
  const accent = d.win ? "#ffc15e" : "#ff4d5e";

  // Background: the location, darkened, with the hero's colour bleeding in.
  ctx.fillStyle = "#07050a";
  ctx.fillRect(0, 0, W, H);
  if (bg) {
    ctx.globalAlpha = 0.55;
    cover(ctx, bg, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(7,5,10,0.85)");
  g.addColorStop(0.35, "rgba(7,5,10,0.2)");
  g.addColorStop(1, "rgba(7,5,10,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(330, 760, 40, 330, 760, 620);
  glow.addColorStop(0, d.heroColor + "88");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Giant kanji watermark.
  ctx.save();
  ctx.font = `900 520px ${kanji}`;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.textAlign = "right";
  ctx.fillText(d.win ? "勝" : "敗", W + 40, 900);
  ctx.restore();

  // The fighter.
  if (hero) {
    const h = 980;
    const w = (hero.width / hero.height) * h;
    ctx.save();
    ctx.shadowColor = d.heroColor;
    ctx.shadowBlur = 60;
    ctx.drawImage(hero, 300 - w / 2, H - h - 40, w, h);
    ctx.restore();
  }

  // Header.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e63946";
  ctx.fillRect(60, 64, 86, 86);
  ctx.font = `900 50px ${kanji}`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("忍", 103, 126);
  ctx.textAlign = "left";
  ctx.font = `64px ${display}`;
  ctx.fillText("NARUTO", 170, 124);
  const nw = ctx.measureText("NARUTO").width;
  ctx.fillStyle = accent;
  ctx.font = `34px ${display}`;
  ctx.fillText("· JUTSU", 170 + nw + 14, 122);

  // Headline block (right side).
  ctx.textAlign = "right";
  ctx.fillStyle = accent;
  ctx.font = `128px ${display}`;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 20;
  ctx.fillText(d.headline, W - 60, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 34px ${ui}`;
  ctx.fillText(d.sub, W - 60, 352);
  ctx.fillStyle = "#fff";
  ctx.font = `56px ${display}`;
  ctx.fillText(d.heroName.toUpperCase(), W - 60, 430);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `600 28px ${ui}`;
  ctx.fillText(d.nick, W - 60, 470);

  // Rank seal.
  if (d.rank) {
    const rx = W - 150;
    const ry = 590;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(-0.12);
    ctx.fillStyle = "#b3001e";
    ctx.beginPath();
    ctx.arc(0, 0, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,240,220,0.8)";
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff4e6";
    ctx.textAlign = "center";
    ctx.font = `120px ${display}`;
    ctx.fillText(d.rank, 0, 42);
    ctx.restore();
  }

  // Polaroid of the player's hands on the final seal.
  if (snap) {
    const pw = 400;
    const ph = Math.round((snap.height / snap.width) * (pw - 32)) + 90;
    ctx.save();
    ctx.translate(W - 290, 880);
    ctx.rotate(0.06);
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#fbf7ef";
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.shadowBlur = 0;
    ctx.drawImage(snap, -pw / 2 + 16, -ph / 2 + 16, pw - 32, ph - 90);
    ctx.fillStyle = "#2a1a10";
    ctx.textAlign = "center";
    ctx.font = `34px ${display}`;
    ctx.fillText(d.mySealLabel, 0, ph / 2 - 28);
    ctx.restore();
  }

  // Stats row.
  const sy = H - 150;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, sy - 70, W, 190);
  ctx.fillStyle = accent;
  ctx.fillRect(0, sy - 70, W, 4);
  const cols = d.stats.slice(0, 4);
  cols.forEach(([k, v], i) => {
    const x = 60 + i * ((W - 120) / cols.length);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = `64px ${display}`;
    ctx.fillText(v, x, sy + 20);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `700 24px ${ui}`;
    ctx.fillText(k.toUpperCase(), x, sy + 56);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `700 24px ${ui}`;
  ctx.fillText("shinobi-jutsu.vercel.app", W / 2, H - 22);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}
