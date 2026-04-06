"use client";

import type { CaptionCategory, CaptionPreset } from "@/lib/caption/types";

type CaptionStyleCarouselProps = {
  categories: CaptionCategory[];
  activeCategory: CaptionCategory | "all";
  onCategoryChange: (value: CaptionCategory | "all") => void;
  presets: CaptionPreset[];
  activePresetId: string;
  onPresetChange: (presetId: string) => void;
};

export function CaptionStyleCarousel({
  categories,
  activeCategory,
  onCategoryChange,
  presets,
  activePresetId,
  onPresetChange,
}: CaptionStyleCarouselProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="All" active={activeCategory === "all"} onClick={() => onCategoryChange("all")} />
        {categories.map((category) => (
          <FilterChip
            key={category}
            label={titleCase(category)}
            active={activeCategory === category}
            onClick={() => onCategoryChange(category)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
        {presets.map((preset) => {
          const tone = presetCardTone[preset.category] ?? "a";
          const isActive = activePresetId === preset.id;
          return (
          <button
            key={preset.id}
            onClick={() => onPresetChange(preset.id)}
            className={`ll8-neon-card ll8-neon-card--${tone} rounded-[16px] border p-2 text-left transition-all duration-300 ${
              isActive
                ? "ll8-neon-card--on border-white/25 bg-black/50 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                : "border-white/10 bg-black/30"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{titleCase(preset.category)}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{preset.name}</p>
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] text-white/75">
                #{extractPresetNumber(preset.name)}
              </span>
            </div>
            {preset.category === "comic" ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/70">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/20 bg-white/10 px-1 text-[11px]">
                  {comicVariantIcon(preset)}
                </span>
                {comicVariantLabel(preset)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/65">{preset.captionMode} • {preset.placement}</p>
            )}
          </button>
          );
        })}
      </div>
    </div>
  );
}

const presetCardTone: Record<string, string> = {
  retro: "d",
  comic: "b",
  futuristic: "c",
  gamer: "e",
  love: "d",
  pretty: "b",
  dark: "a",
  electric: "c",
  cinematic: "b",
  luxury: "d",
  street: "e",
  horror: "d",
  neon: "c",
  minimal: "a",
  bubble: "b",
  handwritten: "e",
  bold: "a",
  soft: "b",
  glitch: "e",
  metallic: "a",
};

const filterChipTone: Record<string, { active: string; idle: string }> = {
  all: {
    active: "border-cyan-300/60 bg-cyan-400/12 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.22)]",
    idle: "border-cyan-300/28 bg-black/30 text-cyan-100/70",
  },
  retro: {
    active: "border-amber-300/60 bg-amber-500/12 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.22)]",
    idle: "border-amber-300/28 bg-black/30 text-amber-100/70",
  },
  comic: {
    active: "border-fuchsia-300/60 bg-fuchsia-500/12 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.22)]",
    idle: "border-fuchsia-300/28 bg-black/30 text-fuchsia-100/70",
  },
  futuristic: {
    active: "border-sky-300/60 bg-sky-500/12 text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.22)]",
    idle: "border-sky-300/28 bg-black/30 text-sky-100/70",
  },
  gamer: {
    active: "border-lime-300/60 bg-lime-500/12 text-lime-100 shadow-[0_0_14px_rgba(132,204,22,0.22)]",
    idle: "border-lime-300/28 bg-black/30 text-lime-100/70",
  },
  love: {
    active: "border-rose-300/60 bg-rose-500/12 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.22)]",
    idle: "border-rose-300/28 bg-black/30 text-rose-100/70",
  },
  pretty: {
    active: "border-pink-300/60 bg-pink-500/12 text-pink-100 shadow-[0_0_14px_rgba(236,72,153,0.22)]",
    idle: "border-pink-300/28 bg-black/30 text-pink-100/70",
  },
  dark: {
    active: "border-slate-300/60 bg-slate-500/12 text-slate-100 shadow-[0_0_14px_rgba(148,163,184,0.2)]",
    idle: "border-slate-300/28 bg-black/30 text-slate-100/70",
  },
  electric: {
    active: "border-cyan-300/60 bg-cyan-500/12 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.24)]",
    idle: "border-cyan-300/28 bg-black/30 text-cyan-100/70",
  },
  cinematic: {
    active: "border-indigo-300/60 bg-indigo-500/12 text-indigo-100 shadow-[0_0_14px_rgba(99,102,241,0.22)]",
    idle: "border-indigo-300/28 bg-black/30 text-indigo-100/70",
  },
  luxury: {
    active: "border-yellow-300/60 bg-yellow-500/12 text-yellow-100 shadow-[0_0_14px_rgba(234,179,8,0.24)]",
    idle: "border-yellow-300/28 bg-black/30 text-yellow-100/70",
  },
  street: {
    active: "border-orange-300/60 bg-orange-500/12 text-orange-100 shadow-[0_0_14px_rgba(249,115,22,0.24)]",
    idle: "border-orange-300/28 bg-black/30 text-orange-100/70",
  },
  horror: {
    active: "border-red-300/60 bg-red-500/12 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.24)]",
    idle: "border-red-300/28 bg-black/30 text-red-100/70",
  },
  neon: {
    active: "border-teal-300/60 bg-teal-500/12 text-teal-100 shadow-[0_0_14px_rgba(20,184,166,0.24)]",
    idle: "border-teal-300/28 bg-black/30 text-teal-100/70",
  },
  minimal: {
    active: "border-zinc-300/60 bg-zinc-500/12 text-zinc-100 shadow-[0_0_14px_rgba(161,161,170,0.2)]",
    idle: "border-zinc-300/28 bg-black/30 text-zinc-100/70",
  },
  bubble: {
    active: "border-violet-300/60 bg-violet-500/12 text-violet-100 shadow-[0_0_14px_rgba(139,92,246,0.24)]",
    idle: "border-violet-300/28 bg-black/30 text-violet-100/70",
  },
  handwritten: {
    active: "border-emerald-300/60 bg-emerald-500/12 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.22)]",
    idle: "border-emerald-300/28 bg-black/30 text-emerald-100/70",
  },
  bold: {
    active: "border-blue-300/60 bg-blue-500/12 text-blue-100 shadow-[0_0_14px_rgba(59,130,246,0.24)]",
    idle: "border-blue-300/28 bg-black/30 text-blue-100/70",
  },
  soft: {
    active: "border-purple-300/60 bg-purple-500/12 text-purple-100 shadow-[0_0_14px_rgba(168,85,247,0.24)]",
    idle: "border-purple-300/28 bg-black/30 text-purple-100/70",
  },
  glitch: {
    active: "border-green-300/60 bg-green-500/12 text-green-100 shadow-[0_0_14px_rgba(34,197,94,0.24)]",
    idle: "border-green-300/28 bg-black/30 text-green-100/70",
  },
  metallic: {
    active: "border-stone-300/60 bg-stone-500/12 text-stone-100 shadow-[0_0_14px_rgba(168,162,158,0.22)]",
    idle: "border-stone-300/28 bg-black/30 text-stone-100/70",
  },
};

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const tone = filterChipTone[label.toLowerCase()] ?? filterChipTone.all;

  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors duration-500 ${
        active ? tone.active : tone.idle
      }`}
    >
      {label}
    </button>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function extractPresetNumber(name: string) {
  const match = name.match(/(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function comicVariantLabel(preset: CaptionPreset) {
  switch (preset.decoration?.type) {
    case "comicThought":
      return "Thought Bubble";
    case "comicPunch":
      return "Action Break: Star Burst";
    case "comicShatter":
      return "Action Break: Shatter Burst";
    case "comicZap":
      return "Action Break: Zap Break";
    case "comicBubble":
    default:
      return "Talk Bubble";
  }
}

function comicVariantIcon(preset: CaptionPreset) {
  switch (preset.decoration?.type) {
    case "comicThought":
      return "...";
    case "comicPunch":
      return "*";
    case "comicShatter":
      return "#";
    case "comicZap":
      return "!";
    case "comicBubble":
    default:
      return "o";
  }
}
