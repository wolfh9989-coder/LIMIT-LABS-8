"use client";

import { useMemo } from "react";

type ColorWheelProps = {
  label: string;
  value: string;
  opacity: number;
  onChange: (value: string) => void;
  onOpacityChange: (value: number) => void;
};

export function ColorWheel({ label, value, opacity, onChange, onOpacityChange }: ColorWheelProps) {
  const rgb = useMemo(() => hexToRgb(value), [value]);

  return (
    <div className="rounded-[18px] border border-white/10 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded border border-white/15 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded border border-white/15 bg-white/5 px-2 text-sm text-white outline-none"
          placeholder="#22D3EE"
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/70">
        <input value={String(rgb.r)} readOnly className="rounded border border-white/15 bg-white/5 px-2 py-1" />
        <input value={String(rgb.g)} readOnly className="rounded border border-white/15 bg-white/5 px-2 py-1" />
        <input value={String(rgb.b)} readOnly className="rounded border border-white/15 bg-white/5 px-2 py-1" />
      </div>
      <div className="mt-2">
        <label className="text-xs text-white/55">Opacity: {Math.round(opacity * 100)}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(opacity * 100)}
          onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
          className="mt-1 w-full"
        />
      </div>
    </div>
  );
}

function normalizeHex(value: string) {
  const raw = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
    return raw;
  }

  if (/^#[0-9A-Fa-f]{8}$/.test(raw)) {
    return raw.slice(0, 7);
  }

  return "#22D3EE";
}

function hexToRgb(value: string) {
  const hex = normalizeHex(value).replace("#", "");
  const num = Number.parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}
