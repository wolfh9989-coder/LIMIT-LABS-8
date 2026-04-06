import { CAPTION_TEMPLATES } from "@/lib/caption/caption-templates";
import { FONT_PRESETS } from "@/lib/caption/font-presets";
import type { CaptionCategory, CaptionTemplate, FontStylePreset } from "@/lib/caption/types";

export function getFontPresetsByCategory(category?: CaptionCategory): FontStylePreset[] {
  if (!category) {
    return FONT_PRESETS;
  }

  return FONT_PRESETS.filter((preset) => preset.category === category);
}

export function getCaptionTemplatesByCategory(category?: CaptionCategory): CaptionTemplate[] {
  if (!category) {
    return CAPTION_TEMPLATES;
  }

  return CAPTION_TEMPLATES.filter((template) => template.category === category);
}

export function searchFontPresets(query: string): FontStylePreset[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return FONT_PRESETS;
  }

  return FONT_PRESETS.filter((preset) => {
    return (
      preset.name.toLowerCase().includes(q) ||
      preset.category.toLowerCase().includes(q) ||
      preset.fontFamily.toLowerCase().includes(q)
    );
  });
}

export function searchCaptionTemplates(query: string): CaptionTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return CAPTION_TEMPLATES;
  }

  return CAPTION_TEMPLATES.filter((template) => {
    return (
      template.name.toLowerCase().includes(q) ||
      template.category.toLowerCase().includes(q) ||
      template.template.toLowerCase().includes(q)
    );
  });
}
