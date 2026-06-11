"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ────────────────────────────────────────────────────────────────────────────
   CAC OPPONENT REEL GENERATOR — WORLD CUP 2026 EDITION
   Renders a 9:16 (1080×1920) animated scouting reel from normalized
   highlight events on an offscreen-style canvas and records it with
   MediaRecorder (webm/mp4 depending on browser support).
   ──────────────────────────────────────────────────────────────────────── */

const W = 1080, H = 1920, FPS = 30;

// WC26 theme
const BG       = "#0B1026"; // deep navy
const BG2      = "#101A3C";
const ACCENT   = "#EA0029"; // WC26 red
const ACCENT2  = "#3D7DFF"; // WC26 blue
const CAC_GRN  = "#6BDB58";
const INK      = "#FFFFFF";
const MUTED    = "rgba(255,255,255,0.55)";
const FONT     = '"Courier New", Courier, monospace';

// CAC logo (from brand SVG, viewBox 868×440)
const CAC_LEFT  = "M143 67 L47 161 L141 256 L168 230 L100 161 L168 93 Z";
const CAC_MID   = "M208 76 L208 327 L247 327 L247 183 L249 181 L635 181 L637 183 L637 327 L675 327 L675 75 Z M247 116 L251 113 L635 113 L637 115 L637 141 L635 143 L249 143 L247 141 Z";
const CAC_RIGHT = "M741 67 L716 94 L783 160 L716 229 L742 256 L836 160 Z";

function drawCacLogo(ctx, x, y, h, arrowColor = INK) {
  const s = h / 440;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = arrowColor;
  ctx.fill(new Path2D(CAC_LEFT));
  ctx.fill(new Path2D(CAC_RIGHT));
  ctx.fillStyle = CAC_GRN;
  ctx.fill(new Path2D(CAC_MID), "evenodd");
  ctx.restore();
}

// ─── Easing / math ────────────────────────────────────────────────────────────
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut  = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn   = (t) => Math.pow(clamp01(t), 3);
const easeIO   = (t) => { t = clamp01(t); return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; };

// ─── SVG → Image loader (injects explicit width/height so canvas can draw it) ──
async function loadSvgText(svgText, w, h) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = doc.documentElement;
  root.setAttribute("width", w);
  root.setAttribute("height", h);
  const blob = new Blob([new XMLSerializer().serializeToString(root)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  return img;
}

function loadImageUrl(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function loadRasterFile(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = reader.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// WC26 logo has black artwork — give it a light badge so it reads on navy
function drawWcLogo(ctx, img, cx, cy, maxW, maxH, alpha = 1) {
  if (!img || alpha <= 0) return;
  const padW = maxW * 0.75, padH = maxH * 0.62;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#F2F4F8";
  const r = 28;
  ctx.beginPath();
  ctx.roundRect(cx - padW / 2 - 30, cy - padH / 2 - 30, padW + 60, padH + 60, r);
  ctx.fill();
  ctx.restore();
  drawImageFit(ctx, img, cx, cy, padW, padH, alpha);
}

// Draw an image centered in a box, preserving aspect ratio
function drawImageFit(ctx, img, cx, cy, maxW, maxH, alpha = 1) {
  if (!img) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const s = Math.min(maxW / iw, maxH / ih);
  const w = iw * s, h = ih * s;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}

// ─── Vertical pitch (attacking ↑), StatsBomb-style 120×80 coords, L2R = up ────
const P = { x: 110, y: 430, w: 860, h: 1230 };
const toSX = (y) => P.x + (y / 80) * P.w;
const toSY = (x) => P.y + P.h * (1 - x / 120);

function drawPitch(ctx, alpha = 1, arrowLabel = "ATTACKING ↑") {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = BG2;
  ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(P.x, P.y, P.w, P.h);
  // halfway line + circle
  const midY = toSY(60);
  ctx.beginPath(); ctx.moveTo(P.x, midY); ctx.lineTo(P.x + P.w, midY); ctx.stroke();
  ctx.beginPath(); ctx.arc(P.x + P.w / 2, midY, (9.15 / 80) * P.w, 0, Math.PI * 2); ctx.stroke();
  // boxes: attack goal at top (x=120), own goal bottom (x=0)
  const bw = (40.3 / 80) * P.w, gw = (18.3 / 80) * P.w;
  const bh = (16.5 / 120) * P.h, gh = (5.5 / 120) * P.h;
  const cxp = P.x + P.w / 2;
  // top box
  ctx.strokeRect(cxp - bw / 2, P.y, bw, bh);
  ctx.strokeRect(cxp - gw / 2, P.y, gw, gh);
  // bottom box
  ctx.strokeRect(cxp - bw / 2, P.y + P.h - bh, bw, bh);
  ctx.strokeRect(cxp - gw / 2, P.y + P.h - gh, gw, gh);
  // penalty spots
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.arc(cxp, toSY(109), 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cxp, toSY(11), 5, 0, Math.PI * 2); ctx.fill();
  // attacking arrow
  ctx.fillStyle = MUTED;
  ctx.font = `700 34px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(arrowLabel, P.x, P.y - 24);
  ctx.restore();
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang));
  }
  ctx.closePath();
  ctx.fill();
}

function drawShotMarker(ctx, ev, x, y, k) {
  // k = pop progress 0..1
  const pop = easeOut(k);
  const r = 16 * pop;
  ctx.save();
  if (ev.shot_outcome === "goal") {
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, r + 14 * (1 - pop) + 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ACCENT;
    ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.fill();
  } else if (ev.shot_outcome === "target") {
    ctx.fillStyle = "#FFD24A";
    drawStar(ctx, x, y, r + 6);
  } else if (ev.shot_outcome === "blocked") {
    ctx.strokeStyle = "#9aa7c7";
    ctx.lineWidth = 6;
    const d = r * 0.8;
    ctx.beginPath();
    ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
    ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#9aa7c7";
    ctx.lineWidth = 6;
    const d = r * 0.9;
    ctx.beginPath();
    ctx.moveTo(x - d, y); ctx.lineTo(x + d, y);
    ctx.moveTo(x, y - d); ctx.lineTo(x, y + d);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Common chrome ────────────────────────────────────────────────────────────
function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0D1330");
  g.addColorStop(0.5, BG);
  g.addColorStop(1, "#070B1B");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawFooter(ctx, wcImg) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(70, H - 120); ctx.lineTo(W - 70, H - 120); ctx.stroke();
  drawCacLogo(ctx, 70, H - 100, 64);
  ctx.fillStyle = MUTED;
  ctx.font = `700 34px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("CALCIOAC.COM", 230, H - 56);
  ctx.textAlign = "right";
  ctx.fillText("WORLD CUP 2026 SCOUT", W - 70, H - 56);
  ctx.restore();
}

function typeOn(text, k) {
  return text.slice(0, Math.floor(clamp01(k) * text.length));
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReelPage() {
  const [matches, setMatches]   = useState([]);
  const [team, setTeam]         = useState("");
  const [matchIds, setMatchIds] = useState([]);
  const [events, setEvents]     = useState([]);
  const [sheets, setSheets]     = useState([]);
  const [logoImg, setLogoImg]   = useState(null);
  const [logoName, setLogoName] = useState("");
  const [wcImg, setWcImg]       = useState(null);
  const [running, setRunning]   = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoExt, setVideoExt] = useState("webm");
  const [withAudio, setWithAudio] = useState(true);

  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const audioRef  = useRef(null);

  // Load matches + WC26 logo
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("opp_matches").select("*").order("match_date", { ascending: false });
      setMatches(data || []);
    })();
    loadImageUrl("/wc26.png").then(setWcImg).catch(() => setWcImg(null));
    // Pre-select team passed from the dashboard (?team=…)
    const q = new URLSearchParams(window.location.search).get("team");
    if (q) setTeam(q);
  }, []);

  const allTeams = useMemo(() => {
    const s = new Set(matches.flatMap((m) => [m.home_team, m.away_team]));
    return Array.from(s).sort();
  }, [matches]);

  const teamMatches = useMemo(
    () => matches.filter((m) => m.home_team === team || m.away_team === team),
    [matches, team]
  );

  useEffect(() => { setMatchIds(teamMatches.map((m) => m.id)); }, [teamMatches]);

  useEffect(() => {
    if (!matchIds.length) { setEvents([]); setSheets([]); return; }
    (async () => {
      const [ev, ts] = await Promise.all([
        supabase.from("normalized_highlight_events").select("*").in("match_id", matchIds).order("created_at", { ascending: true }),
        supabase.from("team_sheets").select("*").in("match_id", matchIds),
      ]);
      setEvents(ev.data || []);
      setSheets(ts.data || []);
    })();
  }, [matchIds]);

  // ─── Reel dataset ──────────────────────────────────────────────────────────
  const data = useMemo(() => {
    const mine = events.filter((e) => e.action_team === team);
    const theirs = events.filter((e) => e.action_team && e.action_team !== team);
    const shots = mine.filter((e) => e.event_type === "shot");
    const goals = shots.filter((e) => e.shot_outcome === "goal");
    const onTarget = shots.filter((e) => e.shot_outcome === "goal" || e.shot_outcome === "target");
    const keyPasses = mine.filter((e) => e.event_type === "key_pass");
    const assists = mine.filter((e) => e.event_type === "assist");
    const shotsAgainst = theirs.filter((e) => e.event_type === "shot");
    const goalsAgainst = shotsAgainst.filter((e) => e.shot_outcome === "goal");
    const onTargetAgainst = shotsAgainst.filter((e) => e.shot_outcome === "goal" || e.shot_outcome === "target");

    const sheetById = Object.fromEntries(sheets.map((p) => [p.id, p]));
    const byName = {};
    mine.forEach((ev) => {
      if (!ev.action_player_id) return;
      const sh = sheetById[ev.action_player_id];
      const key = sh ? sh.player_name : ev.action_player_id;
      if (!byName[key]) byName[key] = { name: sh?.player_name || "UNKNOWN", jersey: sh?.jersey_number || "—", shots: 0, goals: 0, kp: 0, ast: 0 };
      if (ev.event_type === "shot")   byName[key].shots++;
      if (ev.shot_outcome === "goal") byName[key].goals++;
      if (ev.event_type === "key_pass") byName[key].kp++;
      if (ev.event_type === "assist")   byName[key].ast++;
    });
    const players = Object.values(byName)
      .map((p) => ({ ...p, total: p.shots + p.kp + p.ast + p.goals }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const cards = teamMatches
      .filter((m) => matchIds.includes(m.id))
      .map((m) => ({
        opp: m.home_team === team ? m.away_team : m.home_team,
        score: m.home_team === team ? `${m.score_home}–${m.score_away}` : `${m.score_away}–${m.score_home}`,
        events: mine.filter((e) => e.match_id === m.id).length,
      }));

    // 12×8 heat grid from event starts
    const HC = 12, HR = 8;
    const grid = Array.from({ length: HR }, () => Array(HC).fill(0));
    mine.forEach((e) => {
      if (e.start_x == null || e.start_y == null) return;
      const c = Math.min(Math.floor(e.start_x / (120 / HC)), HC - 1);
      const r = Math.min(Math.floor(e.start_y / (80 / HR)), HR - 1);
      grid[r][c]++;
    });
    const maxHeat = Math.max(1, ...grid.flat());

    return { mine, theirs, shots, goals, onTarget, keyPasses, assists, shotsAgainst, goalsAgainst, onTargetAgainst, players, cards, grid, maxHeat, HC, HR };
  }, [events, sheets, team, teamMatches, matchIds]);

  // ─── Scene timeline ────────────────────────────────────────────────────────
  const timeline = useMemo(() => {
    const intro   = 4.2;
    const cards   = 2.0 + Math.min(data.cards.length, 6) * 0.8 + 1.2;
    const shotmap = Math.min(11, Math.max(6, 2.5 + data.shots.length * 0.22));
    const concede = data.shotsAgainst.length ? Math.min(10, Math.max(5, 2.5 + data.shotsAgainst.length * 0.22)) : 0;
    const heat    = 5.0;
    const players = data.players.length ? 5.5 : 0;
    const outro   = 4.5;
    const scenes = [
      ["intro", intro], ["cards", cards], ["shotmap", shotmap], ["concede", concede],
      ["heat", heat], ["players", players], ["outro", outro],
    ].filter(([, d]) => d > 0);
    let acc = 0;
    const spans = scenes.map(([name, d]) => { const s = { name, start: acc, end: acc + d, dur: d }; acc += d; return s; });
    return { spans, total: acc };
  }, [data]);

  // ─── Render one frame at time t ────────────────────────────────────────────
  const drawFrame = (ctx, t) => {
    drawBackground(ctx);
    const span = timeline.spans.find((s) => t >= s.start && t < s.end) || timeline.spans[timeline.spans.length - 1];
    const lt = t - span.start; // local time
    const teamUp = (team || "").toUpperCase();

    ctx.textBaseline = "alphabetic";

    if (span.name === "intro") {
      drawWcLogo(ctx, wcImg, W / 2, 470, 560, 620, easeOut(lt / 0.8));
      ctx.fillStyle = MUTED;
      ctx.font = `700 44px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(typeOn("FIFA WORLD CUP 2026", (lt - 0.4) / 0.8), W / 2, 920);
      ctx.fillStyle = ACCENT;
      ctx.font = `900 56px ${FONT}`;
      ctx.fillText(typeOn("ATTACK & CONCEDE ANALYSIS", (lt - 1.0) / 0.9), W / 2, 1060);
      // team logo pop
      const k = easeOut((lt - 1.8) / 0.7);
      if (k > 0) {
        ctx.save();
        ctx.translate(W / 2, 1330);
        ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
        drawImageFit(ctx, logoImg, 0, 0, 380, 380, k);
        ctx.restore();
        ctx.fillStyle = INK;
        ctx.font = `900 ${teamUp.length > 12 ? 78 : 104}px ${FONT}`;
        ctx.globalAlpha = k;
        ctx.fillText(teamUp, W / 2, 1640);
        ctx.globalAlpha = 1;
      }
    }

    if (span.name === "cards") {
      ctx.fillStyle = INK;
      ctx.font = `900 72px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("MATCHES SCOUTED", W / 2, 280);
      ctx.fillStyle = ACCENT2;
      ctx.fillRect(W / 2 - 160, 320, 320, 10);
      drawImageFit(ctx, logoImg, W / 2, 470, 180, 180, easeOut(lt / 0.5));
      const list = data.cards.slice(0, 6);
      list.forEach((c, i) => {
        const k = easeOut((lt - 0.8 - i * 0.7) / 0.6);
        if (k <= 0) return;
        const y = 640 + i * 170;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(80, y, W - 160, 140);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 3;
        ctx.strokeRect(80, y, W - 160, 140);
        ctx.fillStyle = INK;
        ctx.textAlign = "left";
        ctx.font = `800 46px ${FONT}`;
        ctx.fillText(`VS ${c.opp.toUpperCase()}`, 120, y + 62);
        ctx.fillStyle = MUTED;
        ctx.font = `700 34px ${FONT}`;
        ctx.fillText(`${c.events} EVENTS TAGGED`, 120, y + 112);
        ctx.fillStyle = ACCENT;
        ctx.textAlign = "right";
        ctx.font = `900 64px ${FONT}`;
        ctx.fillText(c.score, W - 120, y + 90);
        ctx.restore();
      });
    }

    if (span.name === "shotmap") {
      ctx.fillStyle = INK;
      ctx.font = `900 72px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("ATTACK — SHOT MAP", W / 2, 250);
      ctx.fillStyle = MUTED;
      ctx.font = `700 40px ${FONT}`;
      ctx.fillText(`${teamUp} — ALL SCOUTED MATCHES`, W / 2, 320);
      drawPitch(ctx, easeOut(lt / 0.6));

      const per = 0.22, lead = 1.0;
      let shown = 0, goalsShown = 0, targetShown = 0;
      data.shots.forEach((ev, i) => {
        const k = (lt - lead - i * per) / 0.35;
        if (k <= 0) return;
        shown++;
        if (ev.shot_outcome === "goal") goalsShown++;
        if (ev.shot_outcome === "goal" || ev.shot_outcome === "target") targetShown++;
        drawShotMarker(ctx, ev, toSX(ev.start_y), toSY(ev.start_x), k);
      });

      // counters
      const cy = H - 220;
      const cols = [
        ["SHOTS", shown, INK],
        ["ON TARGET", targetShown, "#FFD24A"],
        ["GOALS", goalsShown, ACCENT],
      ];
      cols.forEach(([label, val, color], i) => {
        const cx = W * (i + 0.5) / 3;
        ctx.fillStyle = color;
        ctx.font = `900 92px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(String(val), cx, cy);
        ctx.fillStyle = MUTED;
        ctx.font = `700 32px ${FONT}`;
        ctx.fillText(label, cx, cy + 50);
      });
    }

    if (span.name === "concede") {
      ctx.fillStyle = INK;
      ctx.font = `900 72px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("CONCEDE — SHOT MAP", W / 2, 250);
      ctx.fillStyle = MUTED;
      ctx.font = `700 40px ${FONT}`;
      ctx.fillText(`SHOTS FACED BY ${teamUp}`, W / 2, 320);
      drawPitch(ctx, easeOut(lt / 0.6), "DEFENDING ↓");

      // conceded shots attack the team's own goal — mirror so they run downward
      const per = 0.22, lead = 1.0;
      let shown = 0, goalsShown = 0, targetShown = 0;
      data.shotsAgainst.forEach((ev, i) => {
        const k = (lt - lead - i * per) / 0.35;
        if (k <= 0) return;
        shown++;
        if (ev.shot_outcome === "goal") goalsShown++;
        if (ev.shot_outcome === "goal" || ev.shot_outcome === "target") targetShown++;
        drawShotMarker(ctx, ev, toSX(80 - ev.start_y), toSY(120 - ev.start_x), k);
      });

      const cy = H - 220;
      const cols = [
        ["SHOTS FACED", shown, INK],
        ["ON TARGET", targetShown, "#FFD24A"],
        ["CONCEDED", goalsShown, ACCENT],
      ];
      cols.forEach(([label, val, color], i) => {
        const cx = W * (i + 0.5) / 3;
        ctx.fillStyle = color;
        ctx.font = `900 92px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(String(val), cx, cy);
        ctx.fillStyle = MUTED;
        ctx.font = `700 32px ${FONT}`;
        ctx.fillText(label, cx, cy + 50);
      });
    }

    if (span.name === "heat") {
      ctx.fillStyle = INK;
      ctx.font = `900 68px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("WHERE THE DANGER", W / 2, 240);
      ctx.fillText("COMES FROM", W / 2, 320);
      drawPitch(ctx, 1);
      const { grid, maxHeat, HC, HR } = data;
      const cw = P.w / HR, chh = P.h / HC; // note: grid r=y(80), c=x(120) → vertical pitch
      for (let r = 0; r < HR; r++) {
        for (let c = 0; c < HC; c++) {
          const v = grid[r][c];
          if (!v) continue;
          const k = easeOut((lt - 0.5 - (c / HC) * 1.6) / 0.7);
          if (k <= 0) continue;
          ctx.fillStyle = ACCENT;
          ctx.globalAlpha = k * Math.min(0.85, 0.12 + 0.73 * (v / maxHeat));
          // cell: column c is along pitch length (x), row r across width (y)
          ctx.fillRect(P.x + r * cw, P.y + P.h - (c + 1) * chh, cw, chh);
          ctx.globalAlpha = 1;
        }
      }
      ctx.fillStyle = MUTED;
      ctx.font = `700 38px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(`${data.mine.length} ATTACKING EVENTS MAPPED`, W / 2, H - 200);
    }

    if (span.name === "players") {
      ctx.fillStyle = INK;
      ctx.font = `900 72px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("DANGER MEN", W / 2, 280);
      ctx.fillStyle = ACCENT;
      ctx.fillRect(W / 2 - 160, 320, 320, 10);
      ctx.fillStyle = MUTED;
      ctx.font = `700 36px ${FONT}`;
      ctx.fillText("SHOTS + KEY PASSES + ASSISTS", W / 2, 400);

      const maxTotal = Math.max(1, ...data.players.map((p) => p.total));
      data.players.forEach((p, i) => {
        const k = easeOut((lt - 0.5 - i * 0.5) / 0.6);
        if (k <= 0) return;
        const y = 560 + i * 230;
        ctx.save();
        ctx.globalAlpha = k;
        // jersey box
        ctx.fillStyle = ACCENT2;
        ctx.fillRect(80, y, 110, 110);
        ctx.fillStyle = INK;
        ctx.font = `900 56px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(String(p.jersey), 135, y + 75);
        // name
        ctx.textAlign = "left";
        ctx.font = `800 50px ${FONT}`;
        ctx.fillText(p.name.toUpperCase().slice(0, 22), 230, y + 50);
        // bar
        const bw = (W - 320) * (p.total / maxTotal) * easeOut((lt - 0.7 - i * 0.5) / 0.8);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(230, y + 72, W - 320, 38);
        ctx.fillStyle = i === 0 ? ACCENT : CAC_GRN;
        ctx.fillRect(230, y + 72, Math.max(0, bw), 38);
        // counts
        ctx.fillStyle = MUTED;
        ctx.font = `700 32px ${FONT}`;
        ctx.fillText(`SH ${p.shots}  ·  G ${p.goals}  ·  KP ${p.kp}  ·  AST ${p.ast}`, 230, y + 160);
        ctx.restore();
      });
    }

    if (span.name === "outro") {
      const k = easeOut(lt / 0.8);
      drawImageFit(ctx, logoImg, W / 2, 520, 360, 360, k);
      ctx.fillStyle = INK;
      ctx.font = `900 ${teamUp.length > 12 ? 72 : 96}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.globalAlpha = k;
      ctx.fillText(teamUp, W / 2, 820);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ACCENT;
      ctx.font = `900 64px ${FONT}`;
      ctx.fillText(typeOn("EVERY CHANCE. MAPPED.", (lt - 0.8) / 1.0), W / 2, 1000);
      ctx.fillStyle = MUTED;
      ctx.font = `700 44px ${FONT}`;
      ctx.fillText(typeOn("FULL SCOUT REPORT:", (lt - 1.6) / 0.6), W / 2, 1180);
      ctx.fillStyle = CAC_GRN;
      ctx.font = `900 76px ${FONT}`;
      ctx.fillText(typeOn("CALCIOAC.COM", (lt - 2.0) / 0.6), W / 2, 1300);
      drawWcLogo(ctx, wcImg, W / 2, 1560, 280, 320, easeOut((lt - 2.4) / 0.8));
    }

    drawFooter(ctx, wcImg);
  };

  // ─── Synth score (drone + kick), routed only into the recording ────────────
  const buildAudio = (durationSec) => {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = actx.createMediaStreamDestination();
    const master = actx.createGain();
    master.gain.value = 0.5;
    master.connect(dest);

    const drone = actx.createOscillator();
    drone.type = "sawtooth";
    drone.frequency.value = 55;
    const droneGain = actx.createGain();
    droneGain.gain.value = 0.05;
    const lp = actx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    drone.connect(lp); lp.connect(droneGain); droneGain.connect(master);
    drone.start();

    // 84bpm kick
    const beat = 60 / 84;
    for (let t = 0.4; t < durationSec - 0.5; t += beat) {
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.frequency.setValueAtTime(120, actx.currentTime + t);
      osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + t + 0.12);
      g.gain.setValueAtTime(0.4, actx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.25);
      osc.connect(g); g.connect(master);
      osc.start(actx.currentTime + t);
      osc.stop(actx.currentTime + t + 0.3);
    }

    // scene-change pings
    timeline.spans.forEach((s) => {
      if (s.start === 0) return;
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.12, actx.currentTime + s.start);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + s.start + 0.6);
      osc.connect(g); g.connect(master);
      osc.start(actx.currentTime + s.start);
      osc.stop(actx.currentTime + s.start + 0.7);
    });

    return { actx, dest };
  };

  // ─── Play / record ─────────────────────────────────────────────────────────
  const run = (record) => {
    if (!team) { alert("Select a team to analyse first."); return; }
    if (!data.mine.length) { alert("No tagged events for this team yet — tag matches and press ✓ FINISH HIGHLIGHT in the Tagger."); return; }
    if (record && !logoImg) {
      alert(`Upload ${team}'s logo SVG first (step 3) — the reel needs the team crest.`);
      return;
    }
    if (running) return;
    setVideoUrl(null);
    setRunning(true);
    setRecording(record);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let recorder = null;
    if (record) {
      const stream = canvas.captureStream(FPS);
      if (withAudio) {
        const { actx, dest } = buildAudio(timeline.total);
        audioRef.current = actx;
        dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      }
      const mimes = [
        "video/mp4;codecs=avc1",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const mime = mimes.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
      const chunks = [];
      recorder = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 12_000_000 });
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
        setVideoExt(ext);
        setVideoUrl(URL.createObjectURL(new Blob(chunks, { type: mime || "video/webm" })));
      };
      recorder.start();
    }

    const t0 = performance.now();
    const loop = (now) => {
      const t = (now - t0) / 1000;
      if (t >= timeline.total) {
        drawFrame(ctx, timeline.total - 0.01);
        if (recorder) recorder.stop();
        if (audioRef.current) { audioRef.current.close(); audioRef.current = null; }
        setRunning(false);
        setRecording(false);
        setProgress(1);
        return;
      }
      drawFrame(ctx, t);
      setProgress(t / timeline.total);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) audioRef.current.close();
  }, []);

  // draw an idle title frame whenever inputs change
  useEffect(() => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawFrame(canvas.getContext("2d"), 2.6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, data, logoImg, wcImg, running]);

  const handleLogoFile = async (file) => {
    if (!file) return;
    try {
      const img = file.type === "image/svg+xml" || file.name.endsWith(".svg")
        ? await loadSvgText(await file.text(), 400, 400)
        : await loadRasterFile(file);
      setLogoImg(img);
      setLogoName(file.name);
    } catch {
      alert("Could not read that logo file — try an SVG or PNG.");
    }
  };

  const label = { fontWeight: 900, fontSize: "0.7rem", display: "block", marginBottom: 6 };

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", background: "#0B1026", padding: 16, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>

        {/* LEFT: CONTROLS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="brutal-card" style={{ padding: 16, background: "#FACC15" }}>
            <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>🎬 WC26 OPPONENT REEL</div>
            <div style={{ fontSize: "0.7rem", marginTop: 4 }}>
              9:16 · 1080×1920 · built from your tagged scouting data · CAC branding
            </div>
          </div>

          <div className="brutal-card" style={{ padding: 16 }}>
            <label style={label}>1. TEAM TO ANALYSE</label>
            <select className="brutal-select" style={{ width: "100%" }} value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">— SELECT TEAM —</option>
              {allTeams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {teamMatches.length > 0 && (
            <div className="brutal-card" style={{ padding: 16 }}>
              <label style={label}>2. MATCHES IN THE REEL</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {teamMatches.map((m) => {
                  const on = matchIds.includes(m.id);
                  return (
                    <button key={m.id} className="brutal-btn"
                      onClick={() => setMatchIds((p) => on ? p.filter((id) => id !== m.id) : [...p, m.id])}
                      style={{ fontSize: "0.65rem", padding: "4px 10px", background: on ? "#000" : "#fff", color: on ? "#FACC15" : "#000" }}>
                      {m.home_team} vs {m.away_team}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#666", marginTop: 8 }}>
                {data.mine.length} events · {data.shots.length} shots · {data.goals.length} goals · {data.keyPasses.length} key passes · {data.assists.length} assists · {data.shotsAgainst.length} shots faced
              </div>
            </div>
          )}

          <div className="brutal-card" style={{ padding: 16 }}>
            <label style={label}>3. TEAM LOGO (SVG / PNG) — REQUIRED FOR THE REEL</label>
            <input type="file" accept=".svg,image/svg+xml,image/png,image/jpeg"
              onChange={(e) => handleLogoFile(e.target.files?.[0])} style={{ fontSize: "0.7rem" }} />
            {logoName && <div style={{ fontSize: "0.65rem", marginTop: 6, color: "#16a34a", fontWeight: 800 }}>✓ {logoName}</div>}
            {!logoName && <div style={{ fontSize: "0.65rem", marginTop: 6, color: "#666" }}>Drop the crest of the team you&apos;re scouting here.</div>}
          </div>

          <div className="brutal-card" style={{ padding: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="brutal-btn" onClick={() => run(false)} disabled={running}
              style={{ background: "#fff", fontSize: "0.75rem" }}>
              ▶ PREVIEW
            </button>
            <button className="brutal-btn" onClick={() => run(true)} disabled={running}
              style={{ background: running ? "#666" : "#EA0029", color: "#fff", fontSize: "0.75rem", fontWeight: 900 }}>
              {recording ? "⏺ RECORDING…" : "⏺ GENERATE REEL"}
            </button>
            <label style={{ fontSize: "0.65rem", fontWeight: 800, display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
              SYNTH SCORE
            </label>
            <span style={{ fontSize: "0.65rem", color: "#666", marginLeft: "auto" }}>
              ~{Math.round(timeline.total)}s · real-time render
            </span>
          </div>

          {running && (
            <div className="brutal-card" style={{ padding: 10 }}>
              <div style={{ height: 14, background: "#eee", border: "2px solid #000" }}>
                <div style={{ height: "100%", width: `${progress * 100}%`, background: "#EA0029" }} />
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="brutal-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: "0.8rem", marginBottom: 10 }}>✅ REEL READY</div>
              <video src={videoUrl} controls style={{ width: "100%", maxWidth: 320, border: "3px solid #000" }} />
              <div style={{ marginTop: 10 }}>
                <a className="brutal-btn" href={videoUrl}
                  download={`${team.replace(/\s+/g, "_").toLowerCase()}_wc26_reel.${videoExt}`}
                  style={{ display: "inline-block", background: "#000", color: "#FACC15", fontSize: "0.75rem", textDecoration: "none" }}>
                  ⬇ DOWNLOAD .{videoExt.toUpperCase()}
                </a>
              </div>
              {videoExt === "webm" && (
                <div style={{ fontSize: "0.6rem", color: "#666", marginTop: 8 }}>
                  Instagram needs MP4 — convert before posting (e.g. CloudConvert), or record in Safari for native MP4.
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: LIVE CANVAS */}
        <div>
          <div className="brutal-card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 12 }}>
            <div style={{ background: "#000", color: "#fff", padding: "6px 12px", fontWeight: 800, fontSize: "0.7rem" }}>
              📱 LIVE PREVIEW — 9:16
            </div>
            <canvas ref={canvasRef} width={W} height={H}
              style={{ width: "100%", display: "block", background: "#0B1026" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
