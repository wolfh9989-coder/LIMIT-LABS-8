"use client";
import React, { useMemo, useState } from "react";
import { CAPTION_TEMPLATES } from "./caption-templates";
import { FONT_PRESETS } from "./font-presets";
import { buildCaptionSegments } from "./smart-placement";
import { CaptionEffectsStyles, CaptionDecorationLayer } from "./style-effects";
import { EditorControls, FontStylePreset, CaptionTemplate } from "./types";

const defaultControls: EditorControls = {
  fontSize: 34,
  captionWidth: 84,
  lineHeight: 1.15,
  letterSpacing: 0.5,
  textColor: "#ffffff",
  strokeColor: "#000000",
  glowColor: "#22d3ee",
  placementMode: "split",
  captionMode: "punchy",
  decorationsAnimated: true,
};

function styleToCss(preset: FontStylePreset, controls: EditorControls, isPunch: boolean): React.CSSProperties {
  const fontFamily = [preset.fontFamily, ...preset.fallbackFonts].join(", ");
  const glow = preset.glowStrength ? `0 0 ${preset.glowStrength}px ${controls.glowColor || preset.glowColor || "transparent"}` : "none";
  return {
    fontFamily,
    fontWeight: preset.fontWeight,
    fontStyle: preset.italic ? "italic" : "normal",
    textTransform: preset.textTransform,
    fontSize: isPunch ? controls.fontSize * 1.25 : controls.fontSize,
    lineHeight: controls.lineHeight,
    letterSpacing: `${controls.letterSpacing}px`,
    color: controls.textColor || preset.textColor,
    WebkitTextStroke: `${preset.strokeWidth ?? 0}px ${controls.strokeColor || preset.strokeColor || "transparent"}`,
    textShadow: `${glow}, 0 2px ${preset.shadowBlur ?? 0}px ${preset.shadowColor || "rgba(0,0,0,0.5)"}`,
    background: preset.backgroundColor,
    borderRadius: `${preset.borderRadius ?? 14}px`,
    padding: `${preset.paddingY ?? 6}px ${preset.paddingX ?? 12}px`,
    display: "inline-block",
  };
}

export default function CaptionEditor() {
  const [selectedFont, setSelectedFont] = useState<FontStylePreset>(FONT_PRESETS[0]);
  const [selectedCaption, setSelectedCaption] = useState<CaptionTemplate>(CAPTION_TEMPLATES[0]);
  const [controls, setControls] = useState<EditorControls>(defaultControls);
  const [manualText, setManualText] = useState(selectedCaption.template);

  const segments = useMemo(() => buildCaptionSegments({
    text: manualText,
    mode: controls.captionMode,
    placement: controls.placementMode,
    punchWords: selectedCaption.punchWords,
    width: controls.captionWidth,
  }), [manualText, controls, selectedCaption]);

  return (
    <div className="min-h-screen bg-[#050816] p-4 text-white">
      <CaptionEffectsStyles />
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-cyan-400/10 bg-black/30 p-4">
          <h2 className="mb-3 text-xl font-semibold">LIMIT LABS 8 AI - Caption Studio</h2>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100">
            <span className="font-semibold">Font QA</span>
            <span className="text-cyan-100/70">{selectedFont.category}</span>
            <span className="text-cyan-100/50">-</span>
            <span>{selectedFont.fontFamily}</span>
          </div>
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_25%),linear-gradient(180deg,#02030a_0%,#0b1020_100%)]">
            {segments.map((segment) => (
              <div key={segment.id} className="absolute left-1/2 -translate-x-1/2 text-center" style={{ top: `${segment.y}%`, width: `${segment.width}%` }}>
                <div className="relative inline-block">
                  <CaptionDecorationLayer decoration={selectedFont.decoration} animated={controls.decorationsAnimated} />
                  <span className="relative z-10" style={styleToCss(selectedFont, controls, segment.isPunch)}>{segment.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
            <h3 className="mb-3 text-sm font-semibold">Manual Caption Text</h3>
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm outline-none" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
            <h3 className="mb-3 text-sm font-semibold">Controls</h3>
            <div className="space-y-3 text-sm">
              <label className="block">Font Size: {controls.fontSize}px<input type="range" min={12} max={96} value={controls.fontSize} onChange={(e) => setControls({ ...controls, fontSize: Number(e.target.value) })} className="w-full" /></label>
              <label className="block">Caption Width: {controls.captionWidth}%<input type="range" min={40} max={96} value={controls.captionWidth} onChange={(e) => setControls({ ...controls, captionWidth: Number(e.target.value) })} className="w-full" /></label>
              <label className="block">Line Height: {controls.lineHeight.toFixed(2)}<input type="range" min={1} max={2} step={0.05} value={controls.lineHeight} onChange={(e) => setControls({ ...controls, lineHeight: Number(e.target.value) })} className="w-full" /></label>
              <label className="block">Letter Spacing: {controls.letterSpacing}px<input type="range" min={-2} max={8} step={0.25} value={controls.letterSpacing} onChange={(e) => setControls({ ...controls, letterSpacing: Number(e.target.value) })} className="w-full" /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={controls.decorationsAnimated} onChange={(e) => setControls({ ...controls, decorationsAnimated: e.target.checked })} /> Animated Backgrounds</label>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
            <h3 className="mb-3 text-sm font-semibold">Colors</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label>Text<input type="color" value={controls.textColor} onChange={(e) => setControls({ ...controls, textColor: e.target.value })} className="mt-1 h-10 w-full" /></label>
              <label>Stroke<input type="color" value={controls.strokeColor} onChange={(e) => setControls({ ...controls, strokeColor: e.target.value })} className="mt-1 h-10 w-full" /></label>
              <label>Glow<input type="color" value={controls.glowColor} onChange={(e) => setControls({ ...controls, glowColor: e.target.value })} className="mt-1 h-10 w-full" /></label>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
            <h3 className="mb-3 text-sm font-semibold">Mode + Placement</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["normal", "punchy", "hybrid"] as const).map((mode) => <button key={mode} onClick={() => setControls({ ...controls, captionMode: mode })} className={`rounded-2xl px-3 py-2 text-sm ${controls.captionMode === mode ? "bg-cyan-400/15 text-cyan-200" : "bg-white/5 text-white/70"}`}>{mode}</button>)}
              {(["bottom", "lowerThird", "center", "split", "topBottom", "left", "right"] as const).map((placement) => <button key={placement} onClick={() => setControls({ ...controls, placementMode: placement })} className={`rounded-2xl px-3 py-2 text-sm ${controls.placementMode === placement ? "bg-fuchsia-400/15 text-fuchsia-200" : "bg-white/5 text-white/70"}`}>{placement}</button>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
            <h3 className="mb-3 text-sm font-semibold">200 Font Presets</h3>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {FONT_PRESETS.map((preset) => <button key={preset.id} onClick={() => setSelectedFont(preset)} className={`w-full rounded-2xl border px-3 py-2 text-left ${selectedFont.id === preset.id ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}><div className="text-sm font-medium">{preset.name}</div><div className="text-xs text-white/55">{preset.category} - {preset.fontFamily}</div></button>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
            <h3 className="mb-3 text-sm font-semibold">200 Caption Templates</h3>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {CAPTION_TEMPLATES.map((template) => <button key={template.id} onClick={() => { setSelectedCaption(template); setManualText(template.template); setControls((prev) => ({ ...prev, captionMode: template.mode })); }} className={`w-full rounded-2xl border px-3 py-2 text-left ${selectedCaption.id === template.id ? "border-fuchsia-400/40 bg-fuchsia-400/10" : "border-white/10 bg-white/5"}`}><div className="text-sm font-medium">{template.name}</div><div className="mt-1 text-xs text-white/55">{template.template}</div></button>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
