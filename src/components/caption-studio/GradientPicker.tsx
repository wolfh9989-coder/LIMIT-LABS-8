"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import tinycolor from "tinycolor2";

// ─── types ───────────────────────────────────────────────────────────────────
type Stop = { id: string; color: string; alpha: number; loc: number };
type GType = "linear" | "radial";

const RADIAL_POSITIONS: { label: string; css: string }[] = [
  { label: "↖", css: "circle at top left" },
  { label: "↑", css: "circle at top center" },
  { label: "↗", css: "circle at top right" },
  { label: "←", css: "circle at center left" },
  { label: "·", css: "circle at center" },
  { label: "→", css: "circle at center right" },
  { label: "↙", css: "circle at bottom left" },
  { label: "↓", css: "circle at bottom center" },
  { label: "↘", css: "circle at bottom right" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 8);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function buildCss(type: GType, angle: number, radialPos: string, stops: Stop[]): string {
  const sorted = [...stops].sort((a, b) => a.loc - b.loc);
  const stopsStr = sorted
    .map((s) => {
      const tc = tinycolor(s.color);
      tc.setAlpha(s.alpha / 100);
      return `${tc.toRgbString()} ${Math.round(s.loc * 100)}%`;
    })
    .join(", ");
  return type === "linear"
    ? `linear-gradient(${Math.round(angle)}deg, ${stopsStr})`
    : `radial-gradient(${radialPos}, ${stopsStr})`;
}

function parseCss(css: string): { type: GType; angle: number; radialPos: string; stops: Stop[] } | null {
  if (!css?.trim()) return null;
  const isLinear = /^linear-gradient\(/i.test(css);
  const isRadial = /^radial-gradient\(/i.test(css);
  if (!isLinear && !isRadial) return null;

  const inner = css.replace(/^(?:linear|radial)-gradient\(\s*/i, "").replace(/\s*\)\s*$/, "");

  // Split on commas outside parentheses
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur.trim());

  let stopStart = 0;
  let angle = 180;
  let radialPos = "circle at center";

  if (isLinear) {
    const ang = parts[0]?.match(/^(-?[\d.]+)deg$/i);
    if (ang) {
      angle = parseFloat(ang[1]);
      stopStart = 1;
    }
  } else {
    if (parts[0] && !/^(?:rgba?|hsl|#)/.test(parts[0].trim())) {
      radialPos = parts[0];
      stopStart = 1;
    }
  }

  const stopParts = parts.slice(stopStart);
  const stops: Stop[] = stopParts.map((part, i) => {
    const locM = part.match(/\s+([\d.]+)%\s*$/);
    const colorStr = locM ? part.slice(0, part.lastIndexOf(locM[0])).trim() : part.trim();
    const loc = locM ? parseFloat(locM[1]) / 100 : i / Math.max(1, stopParts.length - 1);
    const tc = tinycolor(colorStr);
    return {
      id: uid(),
      color: tc.isValid() ? `#${tc.toHex()}` : "#ffffff",
      alpha: tc.isValid() ? Math.round(tc.getAlpha() * 100) : 100,
      loc: clamp(loc, 0, 1),
    };
  });

  if (stops.length < 2) return null;
  return { type: isLinear ? "linear" : "radial", angle, radialPos, stops };
}

function defaultState(baseColor = "#000000"): { type: GType; angle: number; radialPos: string; stops: Stop[] } {
  const tc = tinycolor(baseColor);
  const lighter = tc.clone().lighten(30).toHexString();
  return {
    type: "linear",
    angle: 180,
    radialPos: "circle at center",
    stops: [
      { id: uid(), color: lighter, alpha: 90, loc: 0 },
      { id: uid(), color: baseColor, alpha: 90, loc: 1 },
    ],
  };
}

// ─── component ───────────────────────────────────────────────────────────────
type GradientPickerProps = {
  value?: string;
  baseColor?: string;
  onChange: (css: string) => void;
};

export function GradientPicker({ value = "", baseColor, onChange }: GradientPickerProps) {
  const [state, setState] = useState(() => parseCss(value) ?? defaultState(baseColor));
  const [activeId, setActiveId] = useState(() => state.stops[state.stops.length - 1].id);

  const barRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>(value);
  const draggingIdRef = useRef<string | null>(null);

  // External value sync (skip if it's our own echo)
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      const parsed = parseCss(value);
      if (parsed) {
        setState(parsed);
        setActiveId(parsed.stops[parsed.stops.length - 1].id);
      }
      lastEmittedRef.current = value;
    }
  }, [value]);

  const activeStop = state.stops.find((s) => s.id === activeId) ?? state.stops[0];

  const emit = useCallback(
    (next: typeof state) => {
      const css = buildCss(next.type, next.angle, next.radialPos, next.stops);
      lastEmittedRef.current = css;
      onChange(css);
      setState(next);
    },
    [onChange],
  );

  // Add a new stop at click position on the bar
  function handleBarClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).dataset.marker) return;
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const loc = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const newStop: Stop = { id: uid(), color: activeStop.color, alpha: activeStop.alpha, loc };
    setActiveId(newStop.id);
    emit({ ...state, stops: [...state.stops, newStop] });
  }

  // Drag stop marker
  function startDrag(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    draggingIdRef.current = id;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveId(id);
  }

  function onMarkerMove(e: React.PointerEvent, id: string) {
    if (draggingIdRef.current !== id) return;
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const loc = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    emit({ ...state, stops: state.stops.map((s) => (s.id === id ? { ...s, loc } : s)) });
  }

  function endDrag(e: React.PointerEvent) {
    if (draggingIdRef.current) {
      draggingIdRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  function removeStop(id: string) {
    if (state.stops.length <= 2) return;
    const newStops = state.stops.filter((s) => s.id !== id);
    setActiveId(newStops[newStops.length - 1].id);
    emit({ ...state, stops: newStops });
  }

  function updateActiveColor(color: string, alpha: number) {
    emit({ ...state, stops: state.stops.map((s) => (s.id === activeId ? { ...s, color, alpha } : s)) });
  }

  const gradientCss = buildCss(state.type, state.angle, state.radialPos, state.stops);

  const btnBase = "rounded-[10px] border px-3 py-1 text-xs transition-colors";
  const btnOn = "border-cyan-300/50 bg-cyan-400/15 text-cyan-100";
  const btnOff = "border-white/10 bg-white/5 text-white/55";

  return (
    <div className="space-y-3">
      {/* Preview bar */}
      <div
        ref={barRef}
        className="relative h-8 w-full cursor-crosshair rounded-lg border border-white/10"
        style={{ background: gradientCss }}
        onClick={handleBarClick}
      >
        {/* Checkerboard underlay for transparency */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'><path fill='%23555' d='M1,0H2V1H1V0ZM0,1H1V2H0V1Z'/></svg>\")",
            backgroundSize: "8px",
            zIndex: -1,
          }}
        />

        {/* Markers */}
        {state.stops.map((stop) => {
          const isActive = stop.id === activeId;
          return (
            <div
              key={stop.id}
              data-marker="1"
              className="absolute top-full mt-1 -translate-x-1/2 cursor-grab touch-none select-none"
              style={{ left: `${clamp(stop.loc, 0, 1) * 100}%` }}
              onPointerDown={(e) => startDrag(e, stop.id)}
              onPointerMove={(e) => onMarkerMove(e, stop.id)}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClick={(e) => { e.stopPropagation(); setActiveId(stop.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); removeStop(stop.id); }}
            >
              <div
                className="h-4 w-4 rounded-full border-2"
                style={{
                  backgroundColor: stop.color,
                  borderColor: isActive ? "#22D3EE" : "#ffffff",
                  boxShadow: isActive ? "0 0 6px rgba(34,211,238,0.9)" : "0 1px 3px rgba(0,0,0,0.6)",
                  opacity: stop.alpha / 100,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Spacer for markers */}
      <div className="h-2" />

      {/* Type toggle */}
      <div className="flex gap-2">
        <button type="button" onClick={() => emit({ ...state, type: "linear" })} className={`${btnBase} ${state.type === "linear" ? btnOn : btnOff}`}>
          Linear
        </button>
        <button type="button" onClick={() => emit({ ...state, type: "radial" })} className={`${btnBase} ${state.type === "radial" ? btnOn : btnOff}`}>
          Radial
        </button>
      </div>

      {/* Angle (linear) */}
      {state.type === "linear" ? (
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-white/50">Angle</span>
          <input
            type="range"
            min={0}
            max={360}
            value={state.angle}
            onChange={(e) => emit({ ...state, angle: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="w-8 text-right text-xs text-white/70">{Math.round(state.angle)}°</span>
        </div>
      ) : (
        /* Radial position 3×3 grid */
        <div className="grid grid-cols-3 gap-1">
          {RADIAL_POSITIONS.map((pos) => (
            <button
              type="button"
              key={pos.css}
              onClick={() => emit({ ...state, radialPos: pos.css })}
              className={`rounded-[8px] border py-1 text-sm transition-colors ${
                state.radialPos === pos.css ? btnOn : btnOff
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      )}

      {/* Active stop editor */}
      {activeStop ? (
        <div className="rounded-[14px] border border-white/10 bg-black/20 p-2 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Active Stop — {Math.round(activeStop.loc * 100)}%
          </p>
          <div className="flex gap-2">
            <input
              type="color"
              value={activeStop.color}
              onChange={(e) => updateActiveColor(e.target.value, activeStop.alpha)}
              className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
            />
            <input
              type="text"
              value={activeStop.color}
              onChange={(e) => {
                if (tinycolor(e.target.value).isValid()) updateActiveColor(e.target.value, activeStop.alpha);
              }}
              className="flex-1 rounded-[10px] border border-white/10 bg-white/5 px-2 text-xs text-white outline-none"
              placeholder="#22D3EE"
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Opacity: {activeStop.alpha}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={activeStop.alpha}
              onChange={(e) => updateActiveColor(activeStop.color, parseInt(e.target.value))}
              className="mt-1 w-full"
            />
          </div>
        </div>
      ) : null}

      <p className="text-[10px] text-white/30">Click bar to add stop · Double-click marker to remove</p>
    </div>
  );
}
