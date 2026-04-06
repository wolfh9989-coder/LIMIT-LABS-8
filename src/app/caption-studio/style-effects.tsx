"use client";
import React from "react";
import { CaptionDecoration } from "./types";

type Props = { decoration?: CaptionDecoration; animated?: boolean };

function motionClass(motion?: string, enabled?: boolean) {
  if (!enabled || !motion || motion === "none") return "";
  return {
    float: "ll8-float",
    pulse: "ll8-pulse",
    spark: "ll8-spark",
    drift: "ll8-drift",
    flicker: "ll8-flicker",
    pop: "ll8-pop",
    shake: "ll8-shake",
    scan: "ll8-scan",
    shimmer: "ll8-shimmer",
  }[motion] || "";
}

export function CaptionDecorationLayer({ decoration, animated = true }: Props) {
  if (!decoration || decoration.type === "none") return null;
  const enabled = animated && decoration.animated !== false;
  const motion = motionClass(decoration.motion, enabled);

  switch (decoration.type) {
    case "retroDisco":
      return <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${motion}`}><div className="absolute inset-0 ll8-retro-bg" /><div className="absolute inset-0 ll8-retro-grid" /><div className="absolute inset-0 ll8-retro-stars" /></div>;
    case "comicBubble":
      return <div className={`pointer-events-none absolute inset-0 rounded-[999px] border-[4px] border-black bg-white shadow-[4px_4px_0_#000] ${motion}`} />;
    case "comicThought":
      return <div className={`pointer-events-none absolute inset-0 ${motion}`}><div className="absolute inset-0 rounded-[999px] border-[4px] border-black bg-white shadow-[4px_4px_0_#000]" /><div className="absolute -bottom-3 left-8 h-4 w-4 rounded-full border-[3px] border-black bg-white" /><div className="absolute -bottom-7 left-3 h-3 w-3 rounded-full border-[3px] border-black bg-white" /></div>;
    case "comicPunch":
      return <div className={`pointer-events-none absolute inset-0 border-[4px] border-black bg-yellow-300 shadow-[4px_4px_0_#000] [clip-path:polygon(50%_0%,61%_18%,82%_7%,74%_30%,100%_24%,82%_46%,100%_58%,75%_60%,84%_91%,57%_76%,50%_100%,40%_78%,11%_92%,21%_60%,0%_58%,18%_46%,0%_24%,26%_30%,17%_7%,39%_18%)] ${motion}`} />;
    case "metallicPanel":
      return <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${motion}`}><div className="absolute inset-0 ll8-metallic-panel rounded-[inherit]" /><div className="absolute inset-0 ll8-metallic-sheen rounded-[inherit]" /></div>;
    case "particles":
      return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">{Array.from({ length: 18 }).map((_, i) => <span key={i} className="absolute rounded-full ll8-particle" style={{ left: `${(i * 13) % 100}%`, top: `${(i * 19) % 100}%`, width: `${4 + (i % 5)}px`, height: `${4 + (i % 5)}px`, animationDelay: `${i * 0.18}s`, animationDuration: `${3 + (i % 4)}s` }} />)}</div>;
    case "pixelFrame":
      return <div className={`pointer-events-none absolute inset-0 rounded-[inherit] ${motion}`}><div className="absolute inset-0 ll8-pixel-frame rounded-[inherit]" /><div className="absolute inset-0 ll8-pixel-corners rounded-[inherit]" /></div>;
    case "hearts":
      return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">{Array.from({ length: 10 }).map((_, i) => <span key={i} className={`absolute text-pink-300/80 ${enabled ? "ll8-heart-float" : ""}`} style={{ left: `${8 + i * 8}%`, top: `${60 - (i % 3) * 14}%`, fontSize: `${10 + (i % 4) * 4}px`, animationDelay: `${i * 0.2}s` }}>♥</span>)}</div>;
    case "stars":
      return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">{Array.from({ length: 12 }).map((_, i) => <span key={i} className={`absolute text-yellow-200/80 ${enabled ? "ll8-star-twinkle" : ""}`} style={{ left: `${6 + i * 7}%`, top: `${12 + (i % 4) * 18}%`, fontSize: `${8 + (i % 3) * 6}px`, animationDelay: `${i * 0.15}s` }}>✦</span>)}</div>;
    case "smoke":
      return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"><div className={`absolute -bottom-2 left-0 h-10 w-24 rounded-full bg-white/10 blur-xl ${enabled ? "ll8-smoke-left" : ""}`} /><div className={`absolute -bottom-1 right-0 h-12 w-28 rounded-full bg-red-500/10 blur-xl ${enabled ? "ll8-smoke-right" : ""}`} /><div className={`absolute bottom-2 left-6 h-8 w-20 rounded-full bg-slate-300/10 blur-xl ${enabled ? "ll8-smoke-mid" : ""}`} /></div>;
    case "lightning":
      return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"><div className="absolute inset-0 ll8-electric-bg" /><div className={`absolute left-4 top-1 h-[88%] w-[2px] rotate-[16deg] ll8-bolt ${enabled ? "ll8-lightning-flash" : ""}`} /><div className={`absolute right-6 top-3 h-[72%] w-[2px] -rotate-[10deg] ll8-bolt-alt ${enabled ? "ll8-lightning-flash-alt" : ""}`} /></div>;
    case "luxuryShimmer":
      return <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${motion}`}><div className="absolute inset-0 ll8-luxury-bg rounded-[inherit]" /><div className="absolute inset-0 ll8-luxury-shine rounded-[inherit]" /></div>;
    case "horrorDrip":
      return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"><div className="absolute inset-x-0 top-0 h-3 bg-red-900/60" /><div className={`absolute left-4 top-2 w-2 rounded-b-full bg-red-900/70 ${enabled ? "ll8-drip-1" : "h-5"}`} /><div className={`absolute left-10 top-2 w-2 rounded-b-full bg-red-900/65 ${enabled ? "ll8-drip-2" : "h-8"}`} /><div className={`absolute right-8 top-2 w-2 rounded-b-full bg-red-900/75 ${enabled ? "ll8-drip-3" : "h-6"}`} /></div>;
    case "graffitiSpray":
      return <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${motion}`}><div className="absolute inset-0 ll8-graffiti-bg rounded-[inherit]" /><div className="absolute inset-0 ll8-graffiti-dots rounded-[inherit]" /></div>;
    case "handDrawnStroke":
      return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"><svg className={`absolute inset-0 h-full w-full ${enabled ? "ll8-draw-stroke" : ""}`} viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M5 8 Q 20 3, 35 8 T 65 8 T 95 8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="160" strokeDashoffset={enabled ? 160 : 0} /><path d="M8 33 Q 25 37, 42 33 T 72 33 T 95 33" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeDasharray="160" strokeDashoffset={enabled ? 160 : 0} /></svg></div>;
    default:
      return null;
  }
}

export function CaptionEffectsStyles() {
  return <style jsx global>{`
    @keyframes ll8Float {0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes ll8Pulse {0%,100%{opacity:.78;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
    @keyframes ll8Spark {0%,100%{opacity:.45;filter:brightness(1)}50%{opacity:1;filter:brightness(1.45)}}
    @keyframes ll8Drift {0%{transform:translateY(6px) translateX(-2px)}50%{transform:translateY(-6px) translateX(3px)}100%{transform:translateY(6px) translateX(-2px)}}
    @keyframes ll8Flicker {0%,18%,22%,25%,53%,57%,100%{opacity:1}20%,24%,55%{opacity:.35}}
    @keyframes ll8Pop {0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
    @keyframes ll8Shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-1px)}75%{transform:translateX(1px)}}
    @keyframes ll8Scan {0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
    @keyframes ll8Shimmer {0%{transform:translateX(-130%) skewX(-18deg)}100%{transform:translateX(130%) skewX(-18deg)}}
    @keyframes ll8Particle {0%{transform:translateY(8px) scale(.8);opacity:0}30%{opacity:.85}100%{transform:translateY(-18px) scale(1.15);opacity:0}}
    @keyframes ll8HeartFloat {0%{transform:translateY(8px) scale(.9);opacity:0}20%{opacity:.85}100%{transform:translateY(-18px) scale(1.1);opacity:0}}
    @keyframes ll8Twinkle {0%,100%{opacity:.35;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}
    @keyframes ll8SmokeLeft {0%,100%{transform:translateX(0) translateY(0);opacity:.35}50%{transform:translateX(8px) translateY(-6px);opacity:.55}}
    @keyframes ll8SmokeRight {0%,100%{transform:translateX(0) translateY(0);opacity:.28}50%{transform:translateX(-10px) translateY(-8px);opacity:.48}}
    @keyframes ll8SmokeMid {0%,100%{transform:translateX(0) translateY(0);opacity:.22}50%{transform:translateX(5px) translateY(-4px);opacity:.4}}
    @keyframes ll8LightningFlash {0%,100%{opacity:.2;filter:brightness(1)}10%,14%,40%,43%{opacity:1;filter:brightness(1.8)}}
    @keyframes ll8Drip1 {0%,100%{height:20px}50%{height:34px}}
    @keyframes ll8Drip2 {0%,100%{height:28px}50%{height:42px}}
    @keyframes ll8Drip3 {0%,100%{height:24px}50%{height:36px}}
    @keyframes ll8DrawStroke {to{stroke-dashoffset:0}}
    .ll8-float{animation:ll8Float 4s ease-in-out infinite}.ll8-pulse{animation:ll8Pulse 2.4s ease-in-out infinite}.ll8-spark{animation:ll8Spark 1.2s ease-in-out infinite}.ll8-drift{animation:ll8Drift 6s ease-in-out infinite}.ll8-flicker{animation:ll8Flicker 1.1s linear infinite}.ll8-pop{animation:ll8Pop 1.3s ease-in-out infinite}.ll8-shake{animation:ll8Shake .8s ease-in-out infinite}
    .ll8-scan::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:ll8Scan 2.8s linear infinite}.ll8-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.25) 50%,transparent 80%);animation:ll8Shimmer 2.6s linear infinite}
    .ll8-retro-bg{background:linear-gradient(135deg,rgba(255,0,128,.22),rgba(255,180,0,.12),rgba(0,255,255,.18)),radial-gradient(circle at 50% 0%,rgba(255,255,255,.08),transparent 45%)}
    .ll8-retro-grid{background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:18px 18px;opacity:.3}.ll8-retro-stars{background-image:radial-gradient(circle,rgba(255,255,255,.65) 1px,transparent 1.6px);background-size:16px 16px;opacity:.25}
    .ll8-metallic-panel{background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(148,163,184,.18),rgba(15,23,42,.35),rgba(255,255,255,.14));box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 18px rgba(255,255,255,.08)}
    .ll8-metallic-sheen::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 20%,rgba(255,255,255,.25) 50%,transparent 80%);animation:ll8Shimmer 3s linear infinite}
    .ll8-particle{background:radial-gradient(circle,rgba(34,211,238,.85),rgba(34,211,238,.15));animation:ll8Particle linear infinite}
    .ll8-pixel-frame{border:3px solid #a3e635;background:rgba(0,0,0,.42);image-rendering:pixelated;box-shadow:0 0 16px rgba(163,230,53,.22)}
    .ll8-pixel-corners::before,.ll8-pixel-corners::after{content:"";position:absolute;width:10px;height:10px;background:#a3e635;top:-2px}.ll8-pixel-corners::before{left:-2px}.ll8-pixel-corners::after{right:-2px}
    .ll8-heart-float{animation:ll8HeartFloat 3s ease-in-out infinite}.ll8-star-twinkle{animation:ll8Twinkle 1.8s ease-in-out infinite}
    .ll8-electric-bg{background:linear-gradient(135deg,rgba(59,130,246,.10),rgba(168,85,247,.10))}.ll8-bolt{background:linear-gradient(to bottom,rgba(34,211,238,.95),rgba(125,211,252,.4));box-shadow:0 0 10px rgba(34,211,238,.7)}.ll8-bolt-alt{background:linear-gradient(to bottom,rgba(196,181,253,.95),rgba(217,70,239,.45));box-shadow:0 0 10px rgba(196,181,253,.7)}.ll8-lightning-flash{animation:ll8LightningFlash 1.3s linear infinite}.ll8-lightning-flash-alt{animation:ll8LightningFlash 1.7s linear infinite}
    .ll8-luxury-bg{background:linear-gradient(135deg,rgba(20,20,20,.82),rgba(0,0,0,.65));border:1px solid rgba(250,204,21,.24)}.ll8-luxury-shine::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 20%,rgba(250,204,21,.22) 48%,rgba(255,255,255,.18) 52%,transparent 80%);animation:ll8Shimmer 3.2s linear infinite}
    .ll8-drip-1{animation:ll8Drip1 2.2s ease-in-out infinite}.ll8-drip-2{animation:ll8Drip2 2.8s ease-in-out infinite}.ll8-drip-3{animation:ll8Drip3 2.4s ease-in-out infinite}
    .ll8-graffiti-bg{background:radial-gradient(circle at 20% 30%,rgba(250,204,21,.18),transparent 20%),radial-gradient(circle at 70% 60%,rgba(236,72,153,.16),transparent 22%),radial-gradient(circle at 85% 20%,rgba(34,211,238,.18),transparent 18%),rgba(0,0,0,.18)}.ll8-graffiti-dots{background-image:radial-gradient(circle,rgba(255,255,255,.18) 1px,transparent 1.8px);background-size:12px 12px;opacity:.25}
    .ll8-draw-stroke path{animation:ll8DrawStroke 1.6s ease forwards}.ll8-smoke-left{animation:ll8SmokeLeft 5s ease-in-out infinite}.ll8-smoke-right{animation:ll8SmokeRight 6s ease-in-out infinite}.ll8-smoke-mid{animation:ll8SmokeMid 4.5s ease-in-out infinite}
  `}</style>;
}
