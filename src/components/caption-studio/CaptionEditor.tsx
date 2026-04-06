"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  captionPresets,
  captionThemePalettes,
  CATEGORY_FONT_SUGGESTIONS,
  GOOGLE_FONT_LIBRARY,
} from "@/lib/caption/caption-presets";
import { buildCaptionSegments, buildCaptionSegmentsFromTranscript, detectPunchWords, generateCaptionCandidates } from "@/lib/caption/smart-caption";
import { applyPlacement, chooseAutoPlacement, nudgeToSafeZone } from "@/lib/caption/smart-placement";
import type {
  CaptionCategory,
  CaptionManualStyle,
  CaptionMode,
  CaptionPreset,
  CaptionSegment,
  PlacementMode,
} from "@/lib/caption/types";
import { captionCategories } from "@/lib/caption/types";
import { CaptionStyleCarousel } from "@/components/caption-studio/CaptionStyleCarousel";
import { ColorWheel } from "@/components/caption-studio/ColorWheel";
import { GradientPicker } from "@/components/caption-studio/GradientPicker";
import { CaptionDecorationLayer } from "@/components/caption-studio/StyleEffects";
import type { CaptionDecoration } from "@/lib/caption/types";
import type { DockTimelineAsset, MediaAsset, TranscriptionSegment } from "@/lib/types";
import { useAutosizeTextArea } from "@/hooks/useAutosizeTextArea";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useIsLargeScreen } from "@/hooks/useMediaQuery";

const tabs = ["Styles", "Fonts", "Captions", "Voice", "Placement", "Colors", "Manual", "Timing"] as const;
type EditorTab = (typeof tabs)[number];
const TIMELINE_RULER_PADDING_MS = 2000;

type CaptionEditorProps = {
  sourceText: string;
  onApplyText?: (value: string) => void;
  userId?: string;
  sessionToken?: string;
  transcriptionSources?: MediaAsset[];
  preferredTranscriptionAssetId?: string;
  previewSources?: MediaAsset[];
  preferredPreviewAssetId?: string;
  dockTimelineAssets?: DockTimelineAsset[];
  onDockTimelineAssetsChange?: (next: DockTimelineAsset[]) => void;
  preferredPresetId?: string;
  preferredFontFamily?: string;
  requireCaptionSelection?: boolean;
};

type SegmentOverride = {
  x?: number;
  y?: number;
  width?: number;
  fontScale?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  startMs?: number;
  endMs?: number;
  text?: string;
  presetId?: string;
};

type DeletedSegment = {
  id: string;
  text: string;
};

type TextObject = {
  id: string;
  kind?: "text" | "sticker";
  text: string;
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  fontStyle?: "normal" | "italic" | "bold";
  isActive?: boolean;
};

type VideoAspect = "9:16" | "16:9";

const quickEditToolOrder = ["cut", "fade", "transition", "color", "volume", "speed", "crop", "fx"] as const;
type QuickEditTool = (typeof quickEditToolOrder)[number];

const mainRibbonOrder = ["Edit", "Sound", "Text", "Captions", "Stickers"] as const;
type MainRibbonTool = (typeof mainRibbonOrder)[number];

const stickerPacks = [
  {
    id: "essentials",
    name: "Essentials",
    stickers: ["👍", "🔥", "✨", "💥", "🎯", "✅", "❌", "⭐"],
  },
  {
    id: "social",
    name: "Social",
    stickers: ["❤️", "😂", "👏", "🙏", "👀", "😎", "🎉", "💡"],
  },
  {
    id: "creator",
    name: "Creator",
    stickers: ["🎬", "🎤", "🎧", "📷", "💬", "🚀", "📌", "🧠"],
  },
] as const;

const editRibbonOrder = [
  "Cut",
  "Replace",
  "Speed",
  "Crop",
  "Animation",
  "Effects",
  "Cutout",
  "Background",
  "Magic",
  "Volume",
  "Reduce Noise",
  "Rotate",
  "Retouch",
  "Filters",
  "Adjust",
  "Overlay",
  "Reverse",
  "Freeze",
  "Mask",
  "Opacity",
  "Voice Effect",
] as const;
type EditRibbonTool = (typeof editRibbonOrder)[number];

const soundRibbonOrder = ["Add Sound", "Sound Effects", "Voice Over"] as const;
type SoundRibbonTool = (typeof soundRibbonOrder)[number];

const animationModes = ["In", "Out", "Combo"] as const;
type AnimationMode = (typeof animationModes)[number];

const animationPresetOptions = [
  "Fade In",
  "Slice In",
  "Folding Pan",
  "Paddling",
  "Swoosh",
  "Shake Slide",
  "Black Hole",
  "Turbulence",
  "Slide Slide",
  "Cross Shake",
  "Interlace Opening",
  "Horizontal Blur",
  "Slanted Reveal",
  "Whirl",
  "Flip",
  "Spin Up",
  "Swing",
  "Mini Zoom",
  "Zoom In",
  "Slide Right",
  "Slide Left",
  "Slide Up",
  "Slide Down",
  "Rotate",
  "Pull",
  "Minimized Zoom",
  "Swing Bottom",
  "Swing Right",
  "Vertical Rock",
  "Shake Right",
  "Zoom Wall",
  "Judder Shake",
  "Slanted Swing",
] as const;

const effectsCategories = ["Trending", "New", "Visual", "Split", "Transition", "Motion", "Effects"] as const;
type EffectsCategory = (typeof effectsCategories)[number];

const effectsCatalog: Record<EffectsCategory, string[]> = {
  Trending: ["Chromatic Pulse", "Luma Glow", "Cinematic Grain", "Dream Blur", "Neon Trails"],
  New: ["Retro Scan", "Soft Bloom", "Halation", "Prism Warp", "Ghost Echo"],
  Visual: ["Film Matte", "VHS Soft", "Monochrome Lift", "Edge Light", "Color Pop"],
  Split: ["Dual Split", "Quad Split", "Mirror Slice", "Panel Shift", "Band Slide"],
  Transition: ["Cross Wipe", "Light Leak", "Flash Cut", "Ink Reveal", "Zoom Dissolve"],
  Motion: ["Micro Shake", "Orbit Drift", "Parallax Slide", "Camera Jolt", "Sway Motion"],
  Effects: ["Lens Dirt", "Particle Dust", "Strobe Pulse", "Warp Burst", "Soft Vignette"],
};

const editRibbonToQuickTool: Partial<Record<EditRibbonTool, QuickEditTool>> = {
  Cut: "cut",
  Speed: "speed",
  Crop: "crop",
  Animation: "transition",
  Effects: "fx",
  Volume: "volume",
  "Reduce Noise": "volume",
  Rotate: "crop",
  Adjust: "color",
  Overlay: "fx",
  Mask: "fx",
  Opacity: "fx",
  "Voice Effect": "volume",
};

type QuickEditSettings = {
  fadeInMs: number;
  fadeOutMs: number;
  transitionType: "cut" | "crossfade" | "dip" | "zoom";
  transitionMs: number;
  brightness: number;
  brilliance: number;
  contrast: number;
  saturation: number;
  hue: number;
  shadow: number;
  temperature: number;
  tint: number;
  fade: number;
  volume: number;
  voiceBoost: number;
  speed: number;
  zoom: number;
  rotation: number;
  vignette: number;
  grain: number;
  sharpen: number;
};

type EditorHistorySnapshot = {
  activeTab: EditorTab;
  activePresetId: string;
  categoryFilter: CaptionCategory | "all";
  fontLibraryMode: "suggested" | "all";
  fontPanelMode: "library" | "size" | "case";
  customFontFamily: string;
  captionMode: CaptionMode;
  manualPlacement: boolean;
  selectedPlacement: PlacementMode;
  manualStyle: CaptionManualStyle;
  selectedCandidateId: string;
  segmentOverrides: Record<string, SegmentOverride>;
  deletedSegmentIds: string[];
  deletedSegments: DeletedSegment[];
  selectedSegmentId: string;
  totalDurationMs: number;
  videoAspect: VideoAspect;
  verticalPreviewCompact: boolean;
  transcriptSegments: TranscriptionSegment[];
  transcriptText: string;
  selectedTranscriptionAssetId: string;
  activeQuickTool: QuickEditTool | null;
  activeMainRibbonTool: MainRibbonTool | null;
  activeEditRibbonTool: EditRibbonTool;
  activeSoundRibbonTool: SoundRibbonTool;
  selectedToolTab: "cut" | "fade" | "transition" | "color" | "volume" | "speed" | "crop" | "fx" | null;
  animationMode: AnimationMode;
  animationPreset: (typeof animationPresetOptions)[number];
  selectedEffectsCategory: EffectsCategory;
  selectedEffectName: string;
  cropAspectPreset: "freeform" | "9:16" | "16:9" | "1:1" | "3:4" | "4:3";
  noiseReductionLevel: number;
  maskMode: "none" | "line" | "mirror" | "circle" | "rectangle" | "text";
  overlayMode: "mainTrack" | "reverse" | "freeze" | "mask" | "opacity" | "layers";
  textPanelMode: "font" | "color" | "timing";
  textObjects: TextObject[];
  selectedTextObjectId: string | null;
  voiceEffectMode: "none" | "deep" | "robot" | "airy";
  clipOpacityPercent: number;
  selectedTimelineClipId: string;
  selectedTimelineClipTools: Record<string, Record<string, number | string | boolean>>;
  applyToolsToAllClips: boolean;
  timelineZoom: number;
  dockTimelineAssets: DockTimelineAsset[];
  quickEditSettings: QuickEditSettings;
  cutPointsMs: number[];
};

const defaultQuickEditSettings: QuickEditSettings = {
  fadeInMs: 180,
  fadeOutMs: 180,
  transitionType: "cut",
  transitionMs: 240,
  brightness: 100,
  brilliance: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  shadow: 0,
  temperature: 0,
  tint: 0,
  fade: 0,
  volume: 100,
  voiceBoost: 0,
  speed: 100,
  zoom: 100,
  rotation: 0,
  vignette: 12,
  grain: 8,
  sharpen: 0,
};

const defaultManualStyle: CaptionManualStyle = {
  fontSize: 42,
  strokeWidth: 3,
  shadowIntensity: 40,
  glowIntensity: 35,
  lineHeight: 1.2,
  letterSpacing: 0.5,
  safePadding: 0.08,
  textColor: "#FFFFFF",
  strokeColor: "#22D3EE",
  glowColor: "#22D3EE",
  backgroundColor: "#00000088",
  backgroundOpacity: 0.53,
  accentColor: "#7C3AED",
  textOpacity: 1,
  strokeOpacity: 1,
  glowOpacity: 1,
};

// ─── sub-component: auto-growing segment textarea ──────────────────────────
function SegmentTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextArea({ ref, dependencies: [value] });
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[12px] border border-white/10 bg-black/25 p-2 text-sm text-white/80 outline-none resize-none"
    />
  );
}

export function CaptionEditor({
  sourceText,
  onApplyText,
  userId = "",
  sessionToken = "",
  transcriptionSources = [],
  preferredTranscriptionAssetId = "",
  previewSources = [],
  preferredPreviewAssetId = "",
  dockTimelineAssets = [],
  onDockTimelineAssetsChange,
  preferredPresetId = "",
  preferredFontFamily = "",
  requireCaptionSelection = false,
}: CaptionEditorProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("Styles");
  const [categoryFilter, setCategoryFilter] = useState<CaptionCategory | "all">("all");
  const [activePresetId, setActivePresetId] = useState(captionPresets[0]?.id ?? "");
  const [fontLibraryMode, setFontLibraryMode] = useState<"suggested" | "all">("suggested");
  const [fontPanelMode, setFontPanelMode] = useState<"library" | "size" | "case">("library");
  const [customFontFamily, setCustomFontFamily] = useState("");
  const [captionMode, setCaptionMode] = useState<CaptionMode>("normal");
  const [manualPlacement, setManualPlacement] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementMode>("lowerThird");
  const [manualStyle, setManualStyle] = useState<CaptionManualStyle>(defaultManualStyle);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [segmentOverrides, setSegmentOverrides] = useState<Record<string, SegmentOverride>>({});
  const [deletedSegmentIds, setDeletedSegmentIds] = useState<string[]>([]);
  const [deletedSegments, setDeletedSegments] = useState<DeletedSegment[]>([]);
  const [draggingSegmentId, setDraggingSegmentId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [totalDurationMs, setTotalDurationMs] = useState(18000);
  const [previewPlayheadMs, setPreviewPlayheadMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [decorationsAnimated, setDecorationsAnimated] = useState(true);
  const [decorationDensity, setDecorationDensity] = useState(1);
  const [decorationSpeed, setDecorationSpeed] = useState(1);
  const [comicStyleMix, setComicStyleMix] = useState(50);
  const [futuristicStyleMix, setFuturisticStyleMix] = useState(50);
  const [loveStyleMix, setLoveStyleMix] = useState(50);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptionSegment[]>([]);
  const [transcriptText, setTranscriptText] = useState("");
  const [selectedTranscriptionAssetId, setSelectedTranscriptionAssetId] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [videoAspect, setVideoAspect] = useState<VideoAspect>("9:16");
  const [isVerticalPreviewCompact, setIsVerticalPreviewCompact] = useState(false);
  const [neonFlip, setNeonFlip] = useState(false);
  const [activeQuickTool, setActiveQuickTool] = useState<QuickEditTool | null>(null);
  const [quickEditSettings, setQuickEditSettings] = useState<QuickEditSettings>(defaultQuickEditSettings);
  const [cutPointsMs, setCutPointsMs] = useState<number[]>([]);
  const [removedDockTimelineAssets, setRemovedDockTimelineAssets] = useState<DockTimelineAsset[]>([]);
  const [hoveredDockTimelineAssetId, setHoveredDockTimelineAssetId] = useState("");
  const [draggingDockTimelineAssetId, setDraggingDockTimelineAssetId] = useState("");
  const [undoStack, setUndoStack] = useState<EditorHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorHistorySnapshot[]>([]);
  const historySnapshotRef = useRef<EditorHistorySnapshot | null>(null);
  const historySignatureRef = useRef<string | null>(null);
  const isRestoringHistoryRef = useRef(false);
  const historyCommitTimerRef = useRef<number | null>(null);
  const pendingHistorySnapshotRef = useRef<EditorHistorySnapshot | null>(null);
  const pendingHistorySignatureRef = useRef<string | null>(null);
  const dockDragStartRef = useRef<{ assetId: string; x: number; moved: boolean } | null>(null);
  const recentlyDraggedDockAssetRef = useRef<{ assetId: string; at: number } | null>(null);
  const [selectedTimelineClipId, setSelectedTimelineClipId] = useState("");
  const [selectedTimelineClipTools, setSelectedTimelineClipTools] = useState<Record<string, Record<string, number | string | boolean>>>({});
  const [applyToolsToAllClips, setApplyToolsToAllClips] = useState(false);
  const [activeMainRibbonTool, setActiveMainRibbonTool] = useState<MainRibbonTool | null>("Edit");
  const [activeEditRibbonTool, setActiveEditRibbonTool] = useState<EditRibbonTool>("Cut");
  const [activeSoundRibbonTool, setActiveSoundRibbonTool] = useState<SoundRibbonTool>("Add Sound");
  const [animationMode, setAnimationMode] = useState<AnimationMode>("Combo");
  const [animationPreset, setAnimationPreset] = useState<(typeof animationPresetOptions)[number]>("Fade In");
  const [selectedEffectsCategory, setSelectedEffectsCategory] = useState<EffectsCategory>("Trending");
  const [selectedEffectName, setSelectedEffectName] = useState("");
  const [cropAspectPreset, setCropAspectPreset] = useState<"freeform" | "9:16" | "16:9" | "1:1" | "3:4" | "4:3">("freeform");
  const [noiseReductionLevel, setNoiseReductionLevel] = useState(0);
  const [maskMode, setMaskMode] = useState<"none" | "line" | "mirror" | "circle" | "rectangle" | "text">("none");
  const [overlayMode, setOverlayMode] = useState<"mainTrack" | "reverse" | "freeze" | "mask" | "opacity" | "layers">("mainTrack");
  const [textPanelMode, setTextPanelMode] = useState<"font" | "color" | "timing">("font");
  const [textObjects, setTextObjects] = useState<TextObject[]>([]);
  const [selectedTextObjectId, setSelectedTextObjectId] = useState<string | null>(null);
  const [voiceEffectMode, setVoiceEffectMode] = useState<"none" | "deep" | "robot" | "airy">("none");
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("");
  const [voicePreviewDurationMs, setVoicePreviewDurationMs] = useState(0);
  const [isVoicePreviewPlaying, setIsVoicePreviewPlaying] = useState(false);
  const [voiceCaptureError, setVoiceCaptureError] = useState("");
  const [clipOpacityPercent, setClipOpacityPercent] = useState(100);
  const [selectedToolTab, setSelectedToolTab] = useState<"cut" | "fade" | "transition" | "color" | "volume" | "speed" | "crop" | "fx" | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [resizingClipId, setResizingClipId] = useState("");
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ clipId: string; x: number; y: number } | null>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null);
  const timelineInnerRef = useRef<HTMLDivElement>(null);
  const rulerPointerRef = useRef<{ pointerId: number } | null>(null);
  const clipResizeDragRef = useRef<{ id: string; edge: "left" | "right"; startX: number; startSnapMs: number; startDurationMs: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceRecordStartedAtRef = useRef(0);
  const voicePreviewAudioRef = useRef<HTMLAudioElement>(null);
  const hasAutoNavigatedToVoiceRef = useRef(false);
  const { copy: copyToClipboard, isCopied: isTranscriptCopied } = useCopyToClipboard();
  const isLargeScreen = useIsLargeScreen();
  const longestDockTimelineEndMs = useMemo(
    () =>
      dockTimelineAssets.reduce((maxEndMs, entry) => {
        const snapMs = Math.max(0, Math.round(entry.snapMs));
        const durationMs = Math.max(0, Math.round(entry.durationMs));
        return Math.max(maxEndMs, snapMs + durationMs);
      }, 0),
    [dockTimelineAssets],
  );
  const requiredTimelineDurationMs = useMemo(
    () => (longestDockTimelineEndMs > 0 ? longestDockTimelineEndMs + TIMELINE_RULER_PADDING_MS : 0),
    [longestDockTimelineEndMs],
  );

  useEffect(() => {
    if (requiredTimelineDurationMs <= totalDurationMs) {
      return;
    }

    setTotalDurationMs(requiredTimelineDurationMs);
  }, [requiredTimelineDurationMs, totalDurationMs]);

  const normalizedCutPoints = useMemo(
    () =>
      cutPointsMs
        .filter((point) => point > 0 && point < totalDurationMs)
        .sort((a, b) => a - b),
    [cutPointsMs, totalDurationMs],
  );

  const cutSegments = useMemo(() => {
    const boundaries = [0, ...normalizedCutPoints, totalDurationMs];
    return boundaries.slice(0, -1).map((startMs, index) => {
      const endMs = boundaries[index + 1] ?? totalDurationMs;
      return {
        id: `clip-${index + 1}`,
        index,
        startMs,
        endMs,
        durationMs: Math.max(0, endMs - startMs),
      };
    });
  }, [normalizedCutPoints, totalDurationMs]);

  const transitionLinks = useMemo(() => {
    if (cutSegments.length < 2) {
      return [];
    }

    return cutSegments.slice(0, -1).map((segment, index) => {
      const nextSegment = cutSegments[index + 1];
      const halfWindow = Math.max(80, Math.floor(Math.min(segment.durationMs, nextSegment.durationMs) / 2));
      const appliedMs = Math.min(quickEditSettings.transitionMs, halfWindow);

      return {
        atMs: segment.endMs,
        fromClipLabel: `Clip ${segment.index + 1}`,
        toClipLabel: `Clip ${nextSegment.index + 1}`,
        appliedMs,
      };
    });
  }, [cutSegments, quickEditSettings.transitionMs]);

  const activePreset = useMemo(() => {
    return captionPresets.find((preset) => preset.id === activePresetId) ?? captionPresets[0];
  }, [activePresetId]);

  const candidates = useMemo(() => generateCaptionCandidates(transcriptText || sourceText), [sourceText, transcriptText]);

  const selectedCandidate = useMemo(() => {
    const chosen = candidates.find((candidate) => candidate.id === selectedCandidateId);
    if (chosen) {
      return chosen;
    }

    if (requireCaptionSelection) {
      return undefined;
    }

    return candidates[0];
  }, [candidates, selectedCandidateId, requireCaptionSelection]);

  const activeSourceText = transcriptText || selectedCandidate?.text || (requireCaptionSelection ? "" : sourceText);

  const filteredPresets = useMemo(() => {
    if (categoryFilter === "all") {
      return captionPresets;
    }

    return captionPresets.filter((preset) => preset.category === categoryFilter);
  }, [categoryFilter]);

  const fontCategory = categoryFilter === "all" ? (activePreset?.category ?? "retro") : categoryFilter;

  const fontOptions = useMemo(() => {
    if (fontLibraryMode === "all") {
      return GOOGLE_FONT_LIBRARY;
    }

    const suggested = CATEGORY_FONT_SUGGESTIONS[fontCategory] ?? [];
    const fromPresets = filteredPresets.map((preset) => preset.fontFamily);
    return Array.from(new Set([...suggested, ...fromPresets]));
  }, [filteredPresets, fontCategory, fontLibraryMode]);

  const autoPlacement = useMemo(() => {
    const punchWords = detectPunchWords(selectedCandidate?.text ?? "");
    return chooseAutoPlacement({
      mode: captionMode,
      punchWordCount: punchWords.length,
      text: activeSourceText,
    });
  }, [activeSourceText, captionMode, selectedCandidate?.text]);

  const segments = useMemo(() => {
    const built = transcriptSegments.length > 0
      ? buildCaptionSegmentsFromTranscript({
          transcriptSegments,
          mode: captionMode,
        })
      : buildCaptionSegments({
          text: activeSourceText,
          mode: captionMode,
          totalMs: totalDurationMs,
        });

    const placed = applyPlacement(built, selectedPlacement, captionMode);

    const mergedSegments = placed.map((segment) => {
      const override = segmentOverrides[segment.id];
      const baseFontSize = segment.isPunch ? manualStyle.fontSize + 8 : manualStyle.fontSize;
      const merged = override
        ? {
            ...segment,
            ...override,
            text: override.text ?? segment.text,
            presetId: override.presetId ?? segment.presetId,
            fontSize: override.fontScale ? baseFontSize * override.fontScale : undefined,
            startMs: override.startMs ?? segment.startMs,
            endMs: override.endMs ?? segment.endMs,
          }
        : segment;
      return nudgeToSafeZone(merged, manualStyle.safePadding);
    });

    return mergedSegments.filter((segment) => !deletedSegmentIds.includes(segment.id));
  }, [
    autoPlacement,
    captionMode,
    deletedSegmentIds,
    manualPlacement,
    manualStyle.fontSize,
    manualStyle.safePadding,
    segmentOverrides,
    activeSourceText,
    selectedPlacement,
    totalDurationMs,
    transcriptSegments,
  ]);

  const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId) ?? segments[0];
  const visibleSegments = segments.filter(
    (segment) => previewPlayheadMs >= segment.startMs && previewPlayheadMs <= segment.endMs,
  );
  const previewSegments = visibleSegments.length > 0 ? visibleSegments : segments.slice(0, 1);
  const textToolObjects = useMemo(
    () => textObjects.filter((obj) => obj.kind !== "sticker"),
    [textObjects],
  );
  const stickerObjects = useMemo(
    () => textObjects.filter((obj) => obj.kind === "sticker"),
    [textObjects],
  );
  const selectedStickerObject = useMemo(
    () => stickerObjects.find((obj) => obj.id === selectedTextObjectId) ?? null,
    [stickerObjects, selectedTextObjectId],
  );

  const displayPreset = activePreset ?? captionPresets[0];
  const timelineDockAssets = useMemo(
    () =>
      dockTimelineAssets.map((entry) => ({
        ...entry,
        clampedSnapMs: Math.max(0, Math.min(totalDurationMs, Math.round(entry.snapMs))),
      })),
    [dockTimelineAssets, totalDurationMs],
  );
  const timelineSnapStepMs = useMemo(() => {
    if (totalDurationMs <= 8000) {
      return 250;
    }

    if (totalDurationMs <= 30000) {
      return 500;
    }

    return 1000;
  }, [totalDurationMs]);
  const miniRulerTicks = useMemo(() => {
    // Zoom levels adapted from TIMELINE_ZOOM_LEVELS (frames@60fps → ms):
    // unit(frames)/60*1000 = unitMs; segments = minor subdivisions per major unit
    const RULER_LEVELS = [
      { unitMs: 300000, subdivisions: 5 },
      { unitMs: 180000, subdivisions: 5 },
      { unitMs: 120000, subdivisions: 5 },
      { unitMs: 60000,  subdivisions: 5 },
      { unitMs: 30000,  subdivisions: 5 },
      { unitMs: 15000,  subdivisions: 5 },
      { unitMs: 10000,  subdivisions: 5 },
      { unitMs: 5000,   subdivisions: 5 },
      { unitMs: 3000,   subdivisions: 3 },
      { unitMs: 2000,   subdivisions: 4 },
      { unitMs: 1000,   subdivisions: 5 },
      { unitMs: 500,    subdivisions: 5 },
    ];
    // Pick the level that produces 3–10 major ticks across the full duration
    const level =
      RULER_LEVELS.find((l) => {
        const majorCount = totalDurationMs / l.unitMs;
        return majorCount >= 3 && majorCount <= 10;
      }) ??
      RULER_LEVELS.find((l) => totalDurationMs / l.unitMs >= 1) ??
      RULER_LEVELS[RULER_LEVELS.length - 1];

    const { unitMs, subdivisions } = level;
    const minorMs = unitMs / subdivisions;
    const ticks: Array<{ ms: number; major: boolean }> = [];
    for (let ms = 0; ms <= totalDurationMs; ms += minorMs) {
      const rounded = Math.round(ms);
      ticks.push({ ms: rounded, major: rounded % unitMs === 0 });
    }
    if (!ticks.some((t) => t.ms === totalDurationMs)) {
      ticks.push({ ms: totalDurationMs, major: true });
    }
    return ticks;
  }, [totalDurationMs]);
  const sortedDockTimelineAssets = useMemo(
    () => [...timelineDockAssets].sort((a, b) => a.clampedSnapMs - b.clampedSnapMs || a.createdAt.localeCompare(b.createdAt)),
    [timelineDockAssets],
  );
  const hoveredDockTimelineEntry = useMemo(
    () => sortedDockTimelineAssets.find((entry) => entry.id === hoveredDockTimelineAssetId),
    [hoveredDockTimelineAssetId, sortedDockTimelineAssets],
  );
  const playheadDockTimelineEntry = useMemo(() => {
    if (sortedDockTimelineAssets.length === 0) {
      return undefined;
    }

    const beforeOrAtPlayhead = [...sortedDockTimelineAssets].reverse().find((entry) => entry.clampedSnapMs <= previewPlayheadMs);
    return beforeOrAtPlayhead ?? sortedDockTimelineAssets[0];
  }, [previewPlayheadMs, sortedDockTimelineAssets]);
  const activeDockTimelineEntry = hoveredDockTimelineEntry ?? playheadDockTimelineEntry;
  const activePreviewAsset = useMemo(() => {
    if (activeDockTimelineEntry) {
      const fromTimeline = previewSources.find((asset) => asset.id === activeDockTimelineEntry.assetId);
      if (fromTimeline) {
        return fromTimeline;
      }

      return {
        id: activeDockTimelineEntry.assetId,
        userId: "",
        kind: activeDockTimelineEntry.kind,
        fileName: activeDockTimelineEntry.fileName,
        mimeType: activeDockTimelineEntry.mimeType,
        storagePath: "",
        publicUrl: activeDockTimelineEntry.publicUrl,
        createdAt: activeDockTimelineEntry.createdAt,
      } as MediaAsset;
    }

    const fromDock = previewSources.find((asset) => asset.id === preferredPreviewAssetId);
    if (fromDock) {
      return fromDock;
    }

    const fromTranscription = transcriptionSources.find((asset) => asset.id === selectedTranscriptionAssetId)
      ?? transcriptionSources.find((asset) => asset.id === preferredTranscriptionAssetId)
      ?? transcriptionSources.find((asset) => asset.mimeType.startsWith("video/"));

    if (fromTranscription) {
      return fromTranscription;
    }

    return previewSources.find((asset) => asset.mimeType.startsWith("video/") || asset.mimeType.startsWith("image/") || asset.mimeType.startsWith("audio/"));
  }, [
    activeDockTimelineEntry,
    preferredPreviewAssetId,
    preferredTranscriptionAssetId,
    previewSources,
    selectedTranscriptionAssetId,
    transcriptionSources,
  ]);
  const activeDockTimelineToolSettings = useMemo(() => {
    if (!activeDockTimelineEntry) {
      return {} as Record<string, number | string | boolean>;
    }

    return selectedTimelineClipTools[activeDockTimelineEntry.id] ?? {};
  }, [activeDockTimelineEntry, selectedTimelineClipTools]);

  const activeClipSpeedMultiplier = useMemo(() => {
    const fromMultiplier = Number(activeDockTimelineToolSettings.speedMultiplier ?? NaN);
    if (Number.isFinite(fromMultiplier) && fromMultiplier > 0) {
      return Math.max(0.1, Math.min(10, fromMultiplier));
    }
    const fromPercent = Number(activeDockTimelineToolSettings.speed ?? NaN);
    if (Number.isFinite(fromPercent) && fromPercent > 0) {
      return Math.max(0.1, Math.min(10, fromPercent / 100));
    }
    return 1;
  }, [activeDockTimelineToolSettings]);

  const activeClipReverseEnabled = Boolean(activeDockTimelineToolSettings.reverseEnabled) || activeDockTimelineToolSettings.overlayMode === "reverse";
  const activeClipFreezeEnabled = Boolean(activeDockTimelineToolSettings.freezeEnabled) || activeDockTimelineToolSettings.overlayMode === "freeze";

  const activeClipLocalPlaybackSec = useMemo(() => {
    if (!activeDockTimelineEntry) {
      return 0;
    }

    const clipDurationSec = Math.max(0.001, activeDockTimelineEntry.durationMs / 1000);
    const clipOffsetSec = Math.max(0, (previewPlayheadMs - activeDockTimelineEntry.clampedSnapMs) / 1000);
    const speedAdjustedSec = Math.max(0, Math.min(clipDurationSec, clipOffsetSec * activeClipSpeedMultiplier));

    const freezeAtSecRaw = Number(activeDockTimelineToolSettings.freezeAtSec ?? 0);
    const freezeAtSec = Number.isFinite(freezeAtSecRaw)
      ? Math.max(0, Math.min(clipDurationSec, freezeAtSecRaw))
      : 0;

    if (activeClipFreezeEnabled) {
      return freezeAtSec;
    }

    if (activeClipReverseEnabled) {
      return Math.max(0, clipDurationSec - speedAdjustedSec);
    }

    return speedAdjustedSec;
  }, [
    activeClipFreezeEnabled,
    activeClipReverseEnabled,
    activeClipSpeedMultiplier,
    activeDockTimelineEntry,
    activeDockTimelineToolSettings,
    previewPlayheadMs,
  ]);

  const activePreviewVisualStyle = useMemo(() => {
    const brightness = Number(activeDockTimelineToolSettings.brightness ?? quickEditSettings.brightness);
    const brilliance = Number(activeDockTimelineToolSettings.brilliance ?? quickEditSettings.brilliance);
    const contrast = Number(activeDockTimelineToolSettings.contrast ?? quickEditSettings.contrast);
    const saturation = Number(activeDockTimelineToolSettings.saturation ?? quickEditSettings.saturation);
    const hue = Number(activeDockTimelineToolSettings.hue ?? quickEditSettings.hue);
    const shadow = Number(activeDockTimelineToolSettings.shadow ?? quickEditSettings.shadow);
    const fade = Number(activeDockTimelineToolSettings.fade ?? quickEditSettings.fade);
    const vignette = Number(activeDockTimelineToolSettings.vignette ?? quickEditSettings.vignette);
    const grain = Number(activeDockTimelineToolSettings.grain ?? quickEditSettings.grain);
    const sharpen = Number(activeDockTimelineToolSettings.sharpen ?? quickEditSettings.sharpen);
    const opacity = Number(activeDockTimelineToolSettings.opacity ?? clipOpacityPercent);
    const overlayModeValue = String(activeDockTimelineToolSettings.overlayMode ?? overlayMode);
    const rawMaskModeValue = String(activeDockTimelineToolSettings.maskMode ?? maskMode);
    const maskModeValue = overlayModeValue === "mask" && rawMaskModeValue === "none" ? "circle" : rawMaskModeValue;

    const filter = [
      `brightness(${Math.max(0.2, brightness / 100)})`,
      `contrast(${Math.max(0.2, contrast / 100)})`,
      `saturate(${Math.max(0, saturation / 100)})`,
      `hue-rotate(${Math.max(-180, Math.min(180, hue))}deg)`,
      `brightness(${Math.max(0.2, brilliance / 100)})`,
      sharpen > 0 ? `contrast(${1 + sharpen / 100})` : null,
      grain > 0 ? `url(#grainy-filter)` : null,
      `opacity(${Math.max(0, Math.min(1, 1 - fade / 180))})`,
    ]
      .filter(Boolean)
      .join(" ");

    const clipPath =
      maskModeValue === "line"
        ? "polygon(0 0, 55% 0, 45% 100%, 0 100%)"
        : maskModeValue === "mirror"
          ? "polygon(0 0, 100% 0, 70% 100%, 30% 100%)"
          : maskModeValue === "circle"
            ? "circle(46% at 50% 50%)"
            : maskModeValue === "rectangle"
              ? "inset(12% 12% 12% 12%)"
              : maskModeValue === "text"
                ? "ellipse(44% 36% at 50% 52%)"
                : undefined;

    const vignetteAlpha = Math.min(0.8, vignette / 100);
    const boxShadows: string[] = [];
    if (shadow > 0) {
      boxShadows.push(`inset 0 -${Math.round(shadow / 2)}px ${Math.round(shadow * 1.2)}px rgba(0,0,0,${Math.min(0.85, shadow / 120)})`);
    }
    if (vignette > 0) {
      boxShadows.push(`inset 0 0 ${Math.round(vignette * 2)}px rgba(0,0,0,${vignetteAlpha})`);
    }

    return {
      filter,
      opacity: Math.max(0, Math.min(1, opacity / 100)),
      clipPath,
      boxShadow: boxShadows.length > 0 ? boxShadows.join(",") : undefined,
    };
  }, [activeDockTimelineToolSettings, clipOpacityPercent, maskMode, overlayMode, quickEditSettings]);

  const activeTintOverlayStyle = useMemo(() => {
    const tintValue = Number(activeDockTimelineToolSettings.tint ?? quickEditSettings.tint);
    const temperatureValue = Number(activeDockTimelineToolSettings.temperature ?? quickEditSettings.temperature);
    const tintAlpha = Math.min(0.32, Math.abs(tintValue) / 260);
    const tempAlpha = Math.min(0.26, Math.abs(temperatureValue) / 320);

    const tintColor = tintValue >= 0 ? `rgba(255, 64, 170, ${tintAlpha})` : `rgba(64, 180, 255, ${tintAlpha})`;
    const tempColor = temperatureValue >= 0 ? `rgba(255, 140, 40, ${tempAlpha})` : `rgba(60, 170, 255, ${tempAlpha})`;
    return {
      background: `linear-gradient(115deg, ${tintColor}, transparent 45%, ${tempColor})`,
    };
  }, [activeDockTimelineToolSettings, quickEditSettings]);

  const activeOverlayModeValue = String(activeDockTimelineToolSettings.overlayMode ?? overlayMode);
  const dockTimelineLanes = useMemo(() => {
    const lanes: Record<"overlay" | "media" | "audio", Array<(typeof sortedDockTimelineAssets)[number]>> = {
      overlay: [],
      media: [],
      audio: [],
    };

    sortedDockTimelineAssets.forEach((entry) => {
      if (entry.kind === "audio" || entry.mimeType.startsWith("audio/")) {
        lanes.audio.push(entry);
        return;
      }

      if (entry.kind === "logo") {
        lanes.overlay.push(entry);
        return;
      }

      lanes.media.push(entry);
    });

    return [
      { key: "overlay" as const, label: "Logos + Overlays", entries: lanes.overlay, accent: "border-fuchsia-300/30 bg-fuchsia-400/8" },
      { key: "media" as const, label: "Media + Images", entries: lanes.media, accent: "border-cyan-300/30 bg-cyan-400/8" },
      { key: "audio" as const, label: "Audio Waveforms", entries: lanes.audio, accent: "border-emerald-300/30 bg-emerald-400/8" },
    ];
  }, [sortedDockTimelineAssets]);

  function updateDockTimelineEntrySnap(entryId: string, nextSnapMs: number) {
    if (!onDockTimelineAssetsChange) {
      return;
    }

    const snappedMs = Math.round(clamp(nextSnapMs, 0, totalDurationMs) / timelineSnapStepMs) * timelineSnapStepMs;
    const clampedMs = clamp(snappedMs, 0, totalDurationMs);
    onDockTimelineAssetsChange(
      dockTimelineAssets.map((entry) => (entry.id === entryId ? { ...entry, snapMs: clampedMs } : entry)),
    );
  }

  function updateDockTimelineEntryDuration(entryId: string, nextSnapMs: number, nextDurationMs: number) {
    if (!onDockTimelineAssetsChange) return;
    const snappedSnap = Math.round(clamp(nextSnapMs, 0, totalDurationMs) / timelineSnapStepMs) * timelineSnapStepMs;
    const snappedDur = Math.max(timelineSnapStepMs, Math.round(nextDurationMs / timelineSnapStepMs) * timelineSnapStepMs);
    onDockTimelineAssetsChange(
      dockTimelineAssets.map((e) => (e.id === entryId ? { ...e, snapMs: snappedSnap, durationMs: snappedDur } : e)),
    );
  }

  const ZOOM_LEVELS = [1, 2, 4, 8, 12, 16] as const;
  type ZoomLevel = (typeof ZOOM_LEVELS)[number];
  function zoomIn() {
    setTimelineZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z as ZoomLevel);
      return ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, idx + 1)];
    });
  }
  function zoomOut() {
    setTimelineZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z as ZoomLevel);
      return ZOOM_LEVELS[Math.max(0, idx - 1)];
    });
  }

  function removeDockTimelineEntry(entryId: string) {
    if (!onDockTimelineAssetsChange) {
      return;
    }

    const removedEntry = dockTimelineAssets.find((entry) => entry.id === entryId);
    if (removedEntry) {
      setRemovedDockTimelineAssets((current) => {
        if (current.some((entry) => entry.id === removedEntry.id)) {
          return current;
        }

        return [...current, { ...removedEntry, toolSettings: removedEntry.toolSettings ? { ...removedEntry.toolSettings } : removedEntry.toolSettings }];
      });
    }

    onDockTimelineAssetsChange(dockTimelineAssets.filter((entry) => entry.id !== entryId));
    setHoveredDockTimelineAssetId((current) => (current === entryId ? "" : current));
    setDraggingDockTimelineAssetId((current) => (current === entryId ? "" : current));
  }

  // Sync autoPlacement → selectedPlacement when Smart mode is active so the
  // placement buttons always reflect (and can override) the auto-chosen position.
  useEffect(() => {
    if (!manualPlacement) {
      setSelectedPlacement(autoPlacement);
    }
  }, [autoPlacement, manualPlacement]);

  useEffect(() => {
    if (!hoveredDockTimelineAssetId) {
      return;
    }

    const exists = sortedDockTimelineAssets.some((entry) => entry.id === hoveredDockTimelineAssetId);
    if (!exists) {
      setHoveredDockTimelineAssetId("");
    }
  }, [hoveredDockTimelineAssetId, sortedDockTimelineAssets]);

  // Load selected clip's tool settings into quick edit panel
  useEffect(() => {
    if (!selectedTimelineClipId) {
      return;
    }

    const clipTools = selectedTimelineClipTools[selectedTimelineClipId];
    if (clipTools) {
      const newSettings: Partial<QuickEditSettings> = {};
      if (typeof clipTools.fade === "number") newSettings.fadeInMs = Math.min(clipTools.fade as number, 2000);
      if (typeof clipTools.transition === "string") {
        const transitionValue = clipTools.transition as string;
        if (["cut", "crossfade", "dip", "zoom"].includes(transitionValue)) {
          newSettings.transitionType = transitionValue as any;
        }
      }
      if (typeof clipTools.color === "string") newSettings.brightness = 100;
      if (typeof clipTools.brightness === "number") newSettings.brightness = Math.max(20, Math.min(220, clipTools.brightness as number));
      if (typeof clipTools.brilliance === "number") newSettings.brilliance = Math.max(20, Math.min(220, clipTools.brilliance as number));
      if (typeof clipTools.volume === "number") newSettings.volume = Math.min(clipTools.volume as number, 200);
      if (typeof clipTools.speed === "number") newSettings.speed = Math.max(10, Math.min(clipTools.speed as number, 1000));
      if (typeof clipTools.contrast === "number") newSettings.contrast = Math.max(20, Math.min(220, clipTools.contrast as number));
      if (typeof clipTools.saturation === "number") newSettings.saturation = Math.max(0, Math.min(220, clipTools.saturation as number));
      if (typeof clipTools.hue === "number") newSettings.hue = Math.max(-180, Math.min(180, clipTools.hue as number));
      if (typeof clipTools.shadow === "number") newSettings.shadow = Math.max(0, Math.min(100, clipTools.shadow as number));
      if (typeof clipTools.temperature === "number") newSettings.temperature = Math.max(-100, Math.min(100, clipTools.temperature as number));
      if (typeof clipTools.tint === "number") newSettings.tint = Math.max(-100, Math.min(100, clipTools.tint as number));
      if (typeof clipTools.fade === "number") newSettings.fade = Math.max(0, Math.min(100, clipTools.fade as number));
      if (typeof clipTools.crop === "number") newSettings.zoom = Math.round(100 + (clipTools.crop as number) / 2);
      if (typeof clipTools.fx === "string") {
        const fxValue = clipTools.fx as string;
        newSettings.grain = fxValue === "grain" ? 12 : fxValue === "glow" ? 0 : 8;
      }
      if (typeof clipTools.cropAspectPreset === "string") {
        const cropValue = clipTools.cropAspectPreset as string;
        if (["freeform", "9:16", "16:9", "1:1", "3:4", "4:3"].includes(cropValue)) {
          setCropAspectPreset(cropValue as "freeform" | "9:16" | "16:9" | "1:1" | "3:4" | "4:3");
        }
      }
      if (typeof clipTools.animationMode === "string") {
        const modeValue = clipTools.animationMode as string;
        if (["In", "Out", "Combo"].includes(modeValue)) {
          setAnimationMode(modeValue as AnimationMode);
        }
      }
      if (typeof clipTools.animationPreset === "string") {
        const presetValue = clipTools.animationPreset as string;
        if (animationPresetOptions.includes(presetValue as (typeof animationPresetOptions)[number])) {
          setAnimationPreset(presetValue as (typeof animationPresetOptions)[number]);
        }
      }
      if (typeof clipTools.effectsCategory === "string") {
        const categoryValue = clipTools.effectsCategory as string;
        if (effectsCategories.includes(categoryValue as EffectsCategory)) {
          setSelectedEffectsCategory(categoryValue as EffectsCategory);
        }
      }
      if (typeof clipTools.effectName === "string") {
        setSelectedEffectName(clipTools.effectName as string);
      }
      if (typeof clipTools.noiseReductionLevel === "number") {
        setNoiseReductionLevel(Math.max(0, Math.min(100, clipTools.noiseReductionLevel as number)));
      }
      if (typeof clipTools.maskMode === "string") {
        const maskValue = clipTools.maskMode as string;
        if (["none", "line", "mirror", "circle", "rectangle", "text"].includes(maskValue)) {
          setMaskMode(maskValue as "none" | "line" | "mirror" | "circle" | "rectangle" | "text");
        }
      }
      if (typeof clipTools.overlayMode === "string") {
        const overlayValue = clipTools.overlayMode as string;
        if (["mainTrack", "reverse", "freeze", "mask", "opacity", "layers"].includes(overlayValue)) {
          setOverlayMode(overlayValue as "mainTrack" | "reverse" | "freeze" | "mask" | "opacity" | "layers");
        }
      }
      if (typeof clipTools.voiceEffectMode === "string") {
        const voiceValue = clipTools.voiceEffectMode as string;
        if (["none", "deep", "robot", "airy"].includes(voiceValue)) {
          setVoiceEffectMode(voiceValue as "none" | "deep" | "robot" | "airy");
        }
      }
      if (typeof clipTools.opacity === "number") {
        setClipOpacityPercent(Math.max(0, Math.min(100, Math.round(clipTools.opacity as number))));
      }

      if (Object.keys(newSettings).length > 0) {
        setQuickEditSettings((current) => ({ ...current, ...newSettings }));
      }
    }
  }, [selectedTimelineClipId, selectedTimelineClipTools]);

  // ─── initialize selectedTimelineClipTools from dockTimelineAssets ─────────
  useEffect(() => {
    const initialized: Record<string, Record<string, number | string | boolean>> = {};
    dockTimelineAssets.forEach((asset) => {
      if (asset.toolSettings) {
        initialized[asset.id] = { ...asset.toolSettings };
      }
    });
    if (Object.keys(initialized).length > 0) {
      setSelectedTimelineClipTools((prev) => ({ ...prev, ...initialized }));
    }
  }, [dockTimelineAssets]);

  // ─── sync selectedTimelineClipTools back to dockTimelineAssets ───────────
  useEffect(() => {
    if (!onDockTimelineAssetsChange || Object.keys(selectedTimelineClipTools).length === 0) {
      return;
    }
    const updated = dockTimelineAssets.map((asset) => ({
      ...asset,
      toolSettings: selectedTimelineClipTools[asset.id] ?? asset.toolSettings,
    }));
    onDockTimelineAssetsChange(updated);
  }, [selectedTimelineClipTools, onDockTimelineAssetsChange, dockTimelineAssets]);

  // ─── consolidated media sync (playback + scrubbing) ──────────────────────
  useEffect(() => {
    const video = previewVideoRef.current;
    const audio = previewAudioRef.current;
    const offsetSec = activeClipLocalPlaybackSec;
    const shouldDriveManually = activeClipReverseEnabled || activeClipFreezeEnabled;
    const audioRate = Math.max(0.5, Math.min(4, activeClipSpeedMultiplier));

    // Always update playback rates and current time when needed
    if (video) {
      video.playbackRate = activeClipSpeedMultiplier;
      // Only seek if offset changed significantly or we're manually driving
      const timeDiff = Math.abs(video.currentTime - offsetSec);
      if (timeDiff > 0.1 || shouldDriveManually || !isPlaying) {
        video.currentTime = offsetSec;
      }
    }
    
    if (audio) {
      audio.playbackRate = audioRate;
      const timeDiff = Math.abs(audio.currentTime - offsetSec);
      if (timeDiff > 0.1 || shouldDriveManually || !isPlaying) {
        audio.currentTime = offsetSec;
      }
    }

    // Control playback state
    if (isPlaying) {
      if (shouldDriveManually) {
        // For reverse/freeze, pause and let manual playhead drive
        if (video) video.pause();
        if (audio) audio.pause();
      } else {
        // Normal playback
        if (video) void video.play().catch(() => {});
        if (audio) void audio.play().catch(() => {});
      }
    } else {
      // Not playing, just pause
      if (video) video.pause();
      if (audio) audio.pause();
    }
  }, [
    activeClipFreezeEnabled,
    activeClipLocalPlaybackSec,
    activeClipReverseEnabled,
    activeClipSpeedMultiplier,
    activeDockTimelineEntry?.id,
    isPlaying,
  ]);

  // ─── rAF ticker (advances playheadMs while playing) ──────────────────────
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frameId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = now - last;
      last = now;

      setPreviewPlayheadMs((current) => {
        const next = Math.min(totalDurationMs, current + delta);
        if (next >= totalDurationMs) {
          setIsPlaying(false);
        }
        return next;
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, totalDurationMs]);

  function updateStyle<K extends keyof CaptionManualStyle>(key: K, value: CaptionManualStyle[K]) {
    setManualStyle((current) => ({ ...current, [key]: value }));
  }

  function handleSegmentMove(segmentId: string, clientX: number, clientY: number) {
    const preview = previewRef.current;
    if (!preview) {
      return;
    }

    const rect = preview.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const safe = manualStyle.safePadding;
    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;

    // Snap to visual center for easier mobile alignment.
    if (Math.abs(x - 0.5) < 0.04) {
      x = 0.5;
    }
    if (Math.abs(y - 0.5) < 0.05) {
      y = 0.5;
    }

    x = clamp(x, safe, 1 - safe);
    y = clamp(y, safe, 1 - safe);

    setSegmentOverrides((current) => ({
      ...current,
      [segmentId]: {
        ...current[segmentId],
        x,
        y,
      },
    }));
  }

  function handleSegmentWidthChange(segmentId: string, nextWidth: number) {
    setManualPlacement(true);
    const safe = manualStyle.safePadding;
    const clampedWidth = clamp(nextWidth, 0.25, 1 - safe * 2);

    setSegmentOverrides((current) => ({
      ...current,
      [segmentId]: {
        ...current[segmentId],
        width: clampedWidth,
      },
    }));
  }

  function handleSegmentScaleChange(segmentId: string, nextScale: number) {
    setManualPlacement(true);
    setSegmentOverrides((current) => ({
      ...current,
      [segmentId]: {
        ...current[segmentId],
        fontScale: clamp(nextScale, 0.55, 2.4),
      },
    }));
  }

  function updateSegmentTiming(segmentId: string, field: "startMs" | "endMs", value: number) {
    const segment = segments.find((entry) => entry.id === segmentId);
    if (!segment) {
      return;
    }

    const floor = 0;
    const ceil = totalDurationMs;
    const minGap = 240;

    const currentStart = segmentOverrides[segmentId]?.startMs ?? segment.startMs;
    const currentEnd = segmentOverrides[segmentId]?.endMs ?? segment.endMs;

    const proposedStart = field === "startMs" ? value : currentStart;
    const proposedEnd = field === "endMs" ? value : currentEnd;

    const safeStart = clamp(proposedStart, floor, Math.max(floor, proposedEnd - minGap));
    const safeEnd = clamp(proposedEnd, Math.min(ceil, safeStart + minGap), ceil);

    setSegmentOverrides((current) => ({
      ...current,
      [segmentId]: {
        ...current[segmentId],
        startMs: safeStart,
        endMs: safeEnd,
      },
    }));
  }

  function setSelectedSegmentWidth(nextWidth: number) {
    if (!selectedSegment) {
      return;
    }

    handleSegmentWidthChange(selectedSegment.id, nextWidth);
  }

  function setSelectedSegmentScale(nextScale: number) {
    if (!selectedSegment) {
      return;
    }

    handleSegmentScaleChange(selectedSegment.id, nextScale);
  }

  function deleteSegment(segmentId: string) {
    const target = segments.find((segment) => segment.id === segmentId);

    setDeletedSegmentIds((current) => (current.includes(segmentId) ? current : [...current, segmentId]));
    if (target) {
      setDeletedSegments((current) =>
        current.some((segment) => segment.id === target.id)
          ? current
          : [...current, { id: target.id, text: target.text }],
      );
    }
  }

  function restoreSegments() {
    setDeletedSegmentIds([]);
    setDeletedSegments([]);
    setCutPointsMs([]);

    if (onDockTimelineAssetsChange && removedDockTimelineAssets.length > 0) {
      const existingIds = new Set(dockTimelineAssets.map((entry) => entry.id));
      const restoredEntries = removedDockTimelineAssets
        .filter((entry) => !existingIds.has(entry.id))
        .map((entry) => ({
          ...entry,
          toolSettings: entry.toolSettings ? { ...entry.toolSettings } : entry.toolSettings,
        }));

      if (restoredEntries.length > 0) {
        onDockTimelineAssetsChange(
          [...dockTimelineAssets, ...restoredEntries].sort((a, b) => {
            const snapDiff = a.snapMs - b.snapMs;
            if (snapDiff !== 0) {
              return snapDiff;
            }

            return a.id.localeCompare(b.id);
          }),
        );
      }
    }

    setRemovedDockTimelineAssets([]);
  }

  function restoreSingleSegment(segmentId: string) {
    setDeletedSegmentIds((current) => current.filter((id) => id !== segmentId));
    setDeletedSegments((current) => current.filter((segment) => segment.id !== segmentId));
  }

  function resetTimeline() {
    setPreviewPlayheadMs(0);
    setIsPlaying(false);
    setCutPointsMs([]);
    setContextMenu(null);
    setSelectedTimelineClipId("");
  }

  function togglePlayback() {
    if (previewPlayheadMs >= totalDurationMs) {
      setPreviewPlayheadMs(0);
    }

    setIsPlaying((current) => !current);
  }

  function duplicateClip(entryId: string) {
    if (!onDockTimelineAssetsChange) return;
    const clip = dockTimelineAssets.find((a) => a.id === entryId);
    if (!clip) return;
    const newClip = { ...clip, id: `${clip.id}-${Date.now()}`, snapMs: clip.snapMs + clip.durationMs };
    onDockTimelineAssetsChange([...dockTimelineAssets, newClip]);
  }

  function copyClip(entryId: string) {
    setCopiedClipId(entryId);
  }

  function pasteClip() {
    if (!onDockTimelineAssetsChange || !copiedClipId) return;
    const clip = dockTimelineAssets.find((a) => a.id === copiedClipId);
    if (!clip) return;
    const newClip = { ...clip, id: `${clip.id}-${Date.now()}`, snapMs: previewPlayheadMs };
    onDockTimelineAssetsChange([...dockTimelineAssets, newClip]);
  }

  useEffect(() => {
    if (!selectedSegmentId && segments[0]) {
      setSelectedSegmentId(segments[0].id);
      return;
    }

    if (selectedSegmentId && !segments.some((segment) => segment.id === selectedSegmentId)) {
      setSelectedSegmentId(segments[0]?.id ?? "");
    }
  }, [segments, selectedSegmentId]);

  useEffect(() => {
    if (!selectedTranscriptionAssetId && transcriptionSources[0]) {
      setSelectedTranscriptionAssetId(transcriptionSources[0].id);
    }
  }, [selectedTranscriptionAssetId, transcriptionSources]);

  useEffect(() => {
    if (!preferredTranscriptionAssetId) {
      return;
    }

    if (hasAutoNavigatedToVoiceRef.current) return;
    const exists = transcriptionSources.some((asset) => asset.id === preferredTranscriptionAssetId);
    if (exists) {
      setSelectedTranscriptionAssetId(preferredTranscriptionAssetId);
      setActiveTab("Voice");
      hasAutoNavigatedToVoiceRef.current = true;
    }
  }, [preferredTranscriptionAssetId, transcriptionSources]);

  useEffect(() => {
    if (!preferredPresetId) {
      return;
    }

    const exists = captionPresets.some((preset) => preset.id === preferredPresetId);
    if (exists) {
      setActivePresetId(preferredPresetId);
    }
  }, [preferredPresetId]);

  useEffect(() => {
    if (!preferredFontFamily) {
      return;
    }

    applyFontFamily(preferredFontFamily);
  }, [preferredFontFamily]);

  useEffect(() => {
    // Auto-apply selected preset to current segment when preset changes
    if (activePresetId) {
      if (selectedSegmentId) {
        // Apply to selected segment
        updateSegmentPreset(selectedSegmentId, activePresetId);
      } else if (segments.length > 0) {
        // Apply to all segments if none selected
        segments.forEach((segment) => {
          updateSegmentPreset(segment.id, activePresetId);
        });
      }
    }
  }, [activePresetId]);

  useEffect(() => {
    // Apply active preset's visual styles to manualStyle
    if (activePreset) {
      setManualStyle((prev) => ({
        ...prev,
        textColor: activePreset.textColor,
        strokeColor: activePreset.strokeColor ?? "#000000",
        strokeWidth: activePreset.strokeWidth ?? 2,
        shadowColor: activePreset.shadowColor ?? "#000000",
        shadowBlur: activePreset.shadowBlur ?? 4,
        glowColor: activePreset.glowColor ?? "#ffffff",
        glowIntensity: activePreset.glowStrength ?? 50,
        fontSize: activePreset.fontSize,
        lineHeight: activePreset.lineHeight,
        letterSpacing: activePreset.letterSpacing,
      }));
    }
  }, [activePreset]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNeonFlip((current) => !current);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activePreviewAsset) {
      return;
    }

    if (activePreviewAsset.mimeType.startsWith("video/")) {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = activePreviewAsset.publicUrl;

      const detect = () => {
        const nextAspect: VideoAspect = probe.videoWidth >= probe.videoHeight ? "16:9" : "9:16";
        setVideoAspect(nextAspect);
      };

      probe.addEventListener("loadedmetadata", detect);
      return () => {
        probe.removeEventListener("loadedmetadata", detect);
        probe.src = "";
      };
    }

    if (activePreviewAsset.mimeType.startsWith("image/")) {
      const probe = new Image();
      probe.src = activePreviewAsset.publicUrl;
      probe.onload = () => {
        const nextAspect: VideoAspect = probe.naturalWidth >= probe.naturalHeight ? "16:9" : "9:16";
        setVideoAspect(nextAspect);
      };
    }
  }, [activePreviewAsset]);

  // Keyboard shortcuts for timeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Space: Toggle play/pause
      if (e.code === 'Space' && !selectedTimelineClipId) {
        e.preventDefault();
        togglePlayback();
      }

      // Delete: Remove selected clip
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTimelineClipId) {
        e.preventDefault();
        removeDockTimelineEntry(selectedTimelineClipId);
        setSelectedTimelineClipId('');
      }

      // Cmd/Ctrl+B: Split clip at playhead
      if (isCtrlOrCmd && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (selectedTimelineClipId) {
          cutAtPlayhead();
        }
      }

      // Cmd/Ctrl+C: Copy clip
      if (isCtrlOrCmd && e.key.toLowerCase() === 'c' && selectedTimelineClipId) {
        e.preventDefault();
        copyClip(selectedTimelineClipId);
      }

      // Cmd/Ctrl+V: Paste clip
      if (isCtrlOrCmd && e.key.toLowerCase() === 'v' && copiedClipId) {
        e.preventDefault();
        pasteClip();
      }

      // Cmd/Ctrl+D: Duplicate clip
      if (isCtrlOrCmd && e.key.toLowerCase() === 'd' && selectedTimelineClipId) {
        e.preventDefault();
        duplicateClip(selectedTimelineClipId);
      }

      // Arrow keys: Seek forward/backward
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPreviewPlayheadMs((prev) => Math.max(0, prev - (e.shiftKey ? 500 : 100)));
        setIsPlaying(false);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPreviewPlayheadMs((prev) => Math.min(totalDurationMs, prev + (e.shiftKey ? 500 : 100)));
        setIsPlaying(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTimelineClipId, copiedClipId, previewPlayheadMs, totalDurationMs]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  async function handleAutoTranscribe() {
    if (!userId || !selectedTranscriptionAssetId) {
      setTranscriptionError("Select an uploaded audio or video source first.");
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError("");

    try {
      const response = await fetch("/api/captions/transcribe", {
        method: "POST",
        headers: buildJsonHeaders(sessionToken),
        body: JSON.stringify({ userId, assetId: selectedTranscriptionAssetId }),
      });

      const payload = (await response.json()) as { text?: string; segments?: TranscriptionSegment[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Transcription failed");
      }

      const nextSegments = payload.segments ?? [];
      setTranscriptText(payload.text?.trim() ?? "");
      setTranscriptSegments(nextSegments);
      setTotalDurationMs((current) => Math.max(current, nextSegments.at(-1)?.endMs ?? 0));
      setDeletedSegmentIds([]);
      setDeletedSegments([]);
      setSegmentOverrides({});
      setSelectedSegmentId(nextSegments[0]?.id ?? "");
      setActiveTab("Captions");
      if (payload.text?.trim()) {
        onApplyText?.(payload.text.trim());
      }
    } catch (error) {
      setTranscriptionError(error instanceof Error ? error.message : "Unable to transcribe media.");
    } finally {
      setIsTranscribing(false);
    }
  }

  function clearTranscript() {
    setTranscriptText("");
    setTranscriptSegments([]);
    setTranscriptionError("");
  }

  async function startVoiceRecording() {
    if (isVoiceRecording) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceCaptureError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      setVoiceCaptureError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      voiceRecorderRef.current = recorder;
      voiceChunksRef.current = [];
      voiceRecordStartedAtRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const nextUrl = URL.createObjectURL(blob);
        setVoicePreviewBlob(blob);
        setVoicePreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return nextUrl;
        });
        setVoicePreviewDurationMs(Math.max(0, Math.round(performance.now() - voiceRecordStartedAtRef.current)));
        setIsVoicePreviewPlaying(false);

        stream.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
      };

      recorder.start();
      setIsVoiceRecording(true);
    } catch {
      setVoiceCaptureError("Microphone access denied or unavailable.");
      setIsVoiceRecording(false);
    }
  }

  function stopVoiceRecording() {
    const recorder = voiceRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsVoiceRecording(false);
      return;
    }

    recorder.stop();
    setIsVoiceRecording(false);
  }

  function playVoicePreview() {
    if (!voicePreviewUrl || !voicePreviewAudioRef.current) {
      return;
    }

    setVoiceCaptureError("");
    void voicePreviewAudioRef.current.play().catch(() => {
      setVoiceCaptureError("Unable to play voice preview.");
    });
  }

  function pauseVoicePreview() {
    if (!voicePreviewAudioRef.current) {
      return;
    }

    voicePreviewAudioRef.current.pause();
  }

  function applyVoiceRecordingToLane() {
    if (!voicePreviewBlob || !onDockTimelineAssetsChange) {
      return;
    }

    const clipId = `voice-${Date.now()}`;
    const clipUrl = URL.createObjectURL(voicePreviewBlob);
    const nextClip: DockTimelineAsset = {
      id: clipId,
      assetId: clipId,
      kind: "audio",
      fileName: `voice-over-${new Date().toISOString().replace(/[.:]/g, "-")}.webm`,
      mimeType: voicePreviewBlob.type || "audio/webm",
      publicUrl: clipUrl,
      snapMs: Math.round(previewPlayheadMs),
      durationMs: Math.max(500, voicePreviewDurationMs || 3000),
      createdAt: new Date().toISOString(),
    };

    onDockTimelineAssetsChange([...dockTimelineAssets, nextClip]);
    setSelectedTimelineClipId(clipId);
    setActiveMainRibbonTool("Sound");
    setActiveSoundRibbonTool("Add Sound");
    setActiveQuickTool("volume");
  }

  function updateSegmentText(segmentId: string, text: string) {
    setSegmentOverrides((current) => ({
      ...current,
      [segmentId]: {
        ...current[segmentId],
        text,
      },
    }));
  }

  function updateSegmentPreset(segmentId: string, presetId: string) {
    setSegmentOverrides((current) => ({
      ...current,
      [segmentId]: {
        ...current[segmentId],
        presetId,
      },
    }));
  }

  function applyCaptionCase(mode: "upper" | "lower" | "title" | "original") {
    const targetSegmentIds = selectedSegmentId ? [selectedSegmentId] : segments.map((segment) => segment.id);
    if (targetSegmentIds.length === 0) {
      return;
    }

    const segmentTextLookup = new Map(segments.map((segment) => [segment.id, segment.text]));
    setSegmentOverrides((current) => {
      const next = { ...current };
      for (const segmentId of targetSegmentIds) {
        const sourceText = next[segmentId]?.text ?? segmentTextLookup.get(segmentId) ?? "";
        let transformed = sourceText;
        if (mode === "upper") {
          transformed = sourceText.toUpperCase();
        } else if (mode === "lower") {
          transformed = sourceText.toLowerCase();
        } else if (mode === "title") {
          transformed = sourceText
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
        } else {
          transformed = segmentTextLookup.get(segmentId) ?? sourceText;
        }

        next[segmentId] = {
          ...next[segmentId],
          text: transformed,
        };
      }
      return next;
    });
  }

  function toggleSelectedMirror(axis: "x" | "y") {
    if (!selectedSegment) {
      return;
    }

    setSegmentOverrides((current) => {
      const existing = current[selectedSegment.id] ?? {};
      const key = axis === "x" ? "mirrorX" : "mirrorY";
      return {
        ...current,
        [selectedSegment.id]: {
          ...existing,
          [key]: !(existing[key] ?? false),
        },
      };
    });
  }

  function toggleAllMirror(axis: "x" | "y") {
    const key = axis === "x" ? "mirrorX" : "mirrorY";
    const shouldEnable = segments.some((segment) => !(segmentOverrides[segment.id]?.[key] ?? false));

    setSegmentOverrides((current) => {
      const next = { ...current };
      for (const segment of segments) {
        next[segment.id] = {
          ...next[segment.id],
          [key]: shouldEnable,
        };
      }
      return next;
    });
  }

  function applyFontFamily(fontFamily: string) {
    setCustomFontFamily(fontFamily);

    const nextPreset =
      filteredPresets.find((preset) => preset.fontFamily === fontFamily) ??
      captionPresets.find((preset) => preset.fontFamily === fontFamily);

    if (!nextPreset) {
      return;
    }

    setActivePresetId(nextPreset.id);
  }

  function clearFontOverride() {
    setCustomFontFamily("");
  }

  function updateQuickEdits(patch: Partial<QuickEditSettings>) {
    const newSettings = { ...quickEditSettings, ...patch };
    setQuickEditSettings(newSettings);

    // Apply to selected timeline clip
    if (selectedTimelineClipId) {
      setSelectedTimelineClipTools((prev) => ({
        ...prev,
        [selectedTimelineClipId]: {
          ...prev[selectedTimelineClipId],
          ...patch,
        },
      }));

      // If apply to all clips is checked, apply to all non-audio clips in the timeline
      if (applyToolsToAllClips) {
        setSelectedTimelineClipTools((prev) => {
          const updated = { ...prev };
          dockTimelineAssets.forEach((asset) => {
            const isAudio = asset.kind === "audio" || asset.mimeType.startsWith("audio/");
            if (!isAudio) {
              updated[asset.id] = {
                ...updated[asset.id],
                ...patch,
              };
            }
          });
          return updated;
        });
      }
    }
  }

  function applyPatchToTimelineTools(patch: Record<string, number | string | boolean>) {
    if (!selectedTimelineClipId) {
      return;
    }

    setSelectedTimelineClipTools((prev) => {
      const next = {
        ...prev,
        [selectedTimelineClipId]: {
          ...prev[selectedTimelineClipId],
          ...patch,
        },
      };

      if (!applyToolsToAllClips) {
        return next;
      }

      dockTimelineAssets.forEach((asset) => {
        const isAudio = asset.kind === "audio" || asset.mimeType.startsWith("audio/");
        if (!isAudio) {
          next[asset.id] = {
            ...next[asset.id],
            ...patch,
          };
        }
      });

      return next;
    });
  }

  function handleSelectMainRibbonTool(tool: MainRibbonTool) {
    setActiveMainRibbonTool(tool);
    if (tool === "Text") {
      setActiveTab("Fonts");
      setFontPanelMode("library");
      setTextPanelMode("font");
      setActiveQuickTool(null);
      return;
    }
    if (tool === "Captions") {
      setActiveTab("Styles");
      setActiveQuickTool(null);
      return;
    }
    if (tool === "Stickers") {
      setActiveTab("Styles");
      setActiveQuickTool(null);
      return;
    }
    if (tool === "Sound") {
      setActiveSoundRibbonTool("Add Sound");
      setActiveQuickTool("volume");
      return;
    }
    setActiveQuickTool(editRibbonToQuickTool[activeEditRibbonTool] ?? null);
  }

  function handleSelectEditRibbonTool(tool: EditRibbonTool) {
    setActiveMainRibbonTool("Edit");
    setActiveEditRibbonTool(tool);
    setSelectedToolTab(editRibbonToQuickTool[tool] ?? null);
    setActiveQuickTool(editRibbonToQuickTool[tool] ?? null);
  }

  function handleSelectSoundRibbonTool(tool: SoundRibbonTool) {
    setActiveMainRibbonTool("Sound");
    setActiveSoundRibbonTool(tool);
    if (tool === "Voice Over") {
      setActiveTab("Voice");
    }
    setActiveQuickTool(tool === "Sound Effects" ? "fx" : "volume");
  }

  function applyActiveRibbonFeature() {
    if (!selectedTimelineClipId) {
      return;
    }

    const freezeAtSec = Math.max(0, (previewPlayheadMs - (activeDockTimelineEntry?.clampedSnapMs ?? 0)) / 1000);

    const patch: Record<string, number | string | boolean> = {
      speedMultiplier: Math.max(0.1, quickEditSettings.speed / 100),
      speed: quickEditSettings.speed,
      brightness: quickEditSettings.brightness,
      brilliance: quickEditSettings.brilliance,
      contrast: quickEditSettings.contrast,
      saturation: quickEditSettings.saturation,
      hue: quickEditSettings.hue,
      shadow: quickEditSettings.shadow,
      temperature: quickEditSettings.temperature,
      tint: quickEditSettings.tint,
      fade: quickEditSettings.fade,
      vignette: quickEditSettings.vignette,
      grain: quickEditSettings.grain,
      sharpen: quickEditSettings.sharpen,
      cropAspectPreset,
      animationMode,
      animationPreset,
      effectsCategory: selectedEffectsCategory,
      effectName: selectedEffectName,
      noiseReductionLevel,
      maskMode,
      overlayMode,
      voiceEffectMode,
      opacity: clipOpacityPercent,
      reverseEnabled: activeEditRibbonTool === "Reverse",
      freezeEnabled: activeEditRibbonTool === "Freeze",
      freezeAtSec,
    };
    applyPatchToTimelineTools(patch);
  }

  function resetActiveRibbonFeature() {
    switch (activeEditRibbonTool) {
      case "Speed":
        updateQuickEdits({ speed: 100 });
        break;
      case "Crop":
      case "Rotate":
        setCropAspectPreset("freeform");
        updateQuickEdits({ zoom: 100, rotation: 0 });
        break;
      case "Animation":
        setAnimationMode("Combo");
        setAnimationPreset("Fade In");
        updateQuickEdits({ transitionType: "cut", transitionMs: 240, fadeInMs: 180, fadeOutMs: 180 });
        break;
      case "Effects":
        setSelectedEffectsCategory("Trending");
        setSelectedEffectName("");
        updateQuickEdits({ vignette: 12, grain: 8, sharpen: 0 });
        break;
      case "Adjust":
        updateQuickEdits({
          brightness: 100,
          brilliance: 100,
          contrast: 100,
          saturation: 100,
          hue: 0,
          shadow: 0,
          temperature: 0,
          tint: 0,
          fade: 0,
          vignette: 12,
          grain: 8,
          sharpen: 0,
        });
        break;
      case "Volume":
      case "Reduce Noise":
      case "Voice Effect":
        setNoiseReductionLevel(0);
        setVoiceEffectMode("none");
        updateQuickEdits({ volume: 100, voiceBoost: 0 });
        break;
      case "Mask":
        setMaskMode("none");
        applyPatchToTimelineTools({ maskMode: "none" });
        break;
      case "Overlay":
        setOverlayMode("mainTrack");
        applyPatchToTimelineTools({ overlayMode: "mainTrack", reverseEnabled: false, freezeEnabled: false });
        break;
      case "Opacity":
        setClipOpacityPercent(100);
        applyPatchToTimelineTools({ opacity: 100 });
        break;
      case "Reverse":
        applyPatchToTimelineTools({ reverseEnabled: false });
        break;
      case "Freeze":
        applyPatchToTimelineTools({ freezeEnabled: false, freezeAtSec: 0 });
        break;
      default:
        break;
    }
  }

  function buildHistorySnapshot(): EditorHistorySnapshot {
    return {
      activeTab,
      activePresetId,
      categoryFilter,
      fontLibraryMode,
      fontPanelMode,
      customFontFamily,
      captionMode,
      manualPlacement,
      selectedPlacement,
      manualStyle: { ...manualStyle },
      selectedCandidateId,
      segmentOverrides: { ...segmentOverrides },
      deletedSegmentIds: [...deletedSegmentIds],
      deletedSegments: [...deletedSegments],
      selectedSegmentId,
      totalDurationMs,
      videoAspect,
      verticalPreviewCompact: isVerticalPreviewCompact,
      transcriptSegments: [...transcriptSegments],
      transcriptText,
      selectedTranscriptionAssetId,
      activeQuickTool,
      activeMainRibbonTool,
      activeEditRibbonTool,
      activeSoundRibbonTool,
      selectedToolTab,
      animationMode,
      animationPreset,
      selectedEffectsCategory,
      selectedEffectName,
      cropAspectPreset,
      noiseReductionLevel,
      maskMode,
      overlayMode,
      textPanelMode,
      textObjects: textObjects.map((obj) => ({ ...obj })),
      selectedTextObjectId,
      voiceEffectMode,
      clipOpacityPercent,
      selectedTimelineClipId,
      selectedTimelineClipTools: Object.fromEntries(
        Object.entries(selectedTimelineClipTools).map(([clipId, tools]) => [clipId, { ...tools }]),
      ),
      applyToolsToAllClips,
      timelineZoom,
      dockTimelineAssets: dockTimelineAssets.map((asset) => ({
        ...asset,
        toolSettings: asset.toolSettings ? { ...asset.toolSettings } : asset.toolSettings,
      })),
      quickEditSettings: { ...quickEditSettings },
      cutPointsMs: [...cutPointsMs],
    };
  }

  function applyHistorySnapshot(snapshot: EditorHistorySnapshot) {
    setActiveTab(snapshot.activeTab);
    setActivePresetId(snapshot.activePresetId);
    setCategoryFilter(snapshot.categoryFilter);
    setFontLibraryMode(snapshot.fontLibraryMode);
    setFontPanelMode(snapshot.fontPanelMode);
    setCustomFontFamily(snapshot.customFontFamily);
    setCaptionMode(snapshot.captionMode);
    setManualPlacement(snapshot.manualPlacement);
    setSelectedPlacement(snapshot.selectedPlacement);
    setManualStyle(snapshot.manualStyle);
    setSelectedCandidateId(snapshot.selectedCandidateId);
    setSegmentOverrides(snapshot.segmentOverrides);
    setDeletedSegmentIds(snapshot.deletedSegmentIds);
    setDeletedSegments(snapshot.deletedSegments);
    setSelectedSegmentId(snapshot.selectedSegmentId);
    setTotalDurationMs(snapshot.totalDurationMs);
    setVideoAspect(snapshot.videoAspect);
    setIsVerticalPreviewCompact(snapshot.verticalPreviewCompact);
    setTranscriptSegments(snapshot.transcriptSegments);
    setTranscriptText(snapshot.transcriptText);
    setSelectedTranscriptionAssetId(snapshot.selectedTranscriptionAssetId);
    setActiveQuickTool(snapshot.activeQuickTool);
    setActiveMainRibbonTool(snapshot.activeMainRibbonTool);
    setActiveEditRibbonTool(snapshot.activeEditRibbonTool);
    setActiveSoundRibbonTool(snapshot.activeSoundRibbonTool);
    setSelectedToolTab(snapshot.selectedToolTab);
    setAnimationMode(snapshot.animationMode);
    setAnimationPreset(snapshot.animationPreset);
    setSelectedEffectsCategory(snapshot.selectedEffectsCategory);
    setSelectedEffectName(snapshot.selectedEffectName);
    setCropAspectPreset(snapshot.cropAspectPreset);
    setNoiseReductionLevel(snapshot.noiseReductionLevel);
    setMaskMode(snapshot.maskMode);
    setOverlayMode(snapshot.overlayMode);
    setTextPanelMode(snapshot.textPanelMode);
    setTextObjects(snapshot.textObjects.map((obj) => ({ ...obj })));
    setSelectedTextObjectId(snapshot.selectedTextObjectId);
    setVoiceEffectMode(snapshot.voiceEffectMode);
    setClipOpacityPercent(snapshot.clipOpacityPercent);
    setSelectedTimelineClipId(snapshot.selectedTimelineClipId);
    setSelectedTimelineClipTools(
      Object.fromEntries(Object.entries(snapshot.selectedTimelineClipTools).map(([clipId, tools]) => [clipId, { ...tools }])),
    );
    setApplyToolsToAllClips(snapshot.applyToolsToAllClips);
    setTimelineZoom(snapshot.timelineZoom);
    if (onDockTimelineAssetsChange) {
      onDockTimelineAssetsChange(
        snapshot.dockTimelineAssets.map((asset) => ({
          ...asset,
          toolSettings: asset.toolSettings ? { ...asset.toolSettings } : asset.toolSettings,
        })),
      );
    }
    setQuickEditSettings(snapshot.quickEditSettings);
    setCutPointsMs(snapshot.cutPointsMs);
  }

  function undoEditorHistory() {
    if (historyCommitTimerRef.current) {
      window.clearTimeout(historyCommitTimerRef.current);
      historyCommitTimerRef.current = null;
    }
    pendingHistorySnapshotRef.current = null;
    pendingHistorySignatureRef.current = null;

    setUndoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }

      const previous = stack[stack.length - 1];
      const current = historySnapshotRef.current ?? buildHistorySnapshot();
      setRedoStack((redo) => [...redo.slice(-79), current]);
      isRestoringHistoryRef.current = true;
      applyHistorySnapshot(previous);
      historySnapshotRef.current = previous;
      historySignatureRef.current = JSON.stringify(previous);
      return stack.slice(0, -1);
    });
  }

  function redoEditorHistory() {
    if (historyCommitTimerRef.current) {
      window.clearTimeout(historyCommitTimerRef.current);
      historyCommitTimerRef.current = null;
    }
    pendingHistorySnapshotRef.current = null;
    pendingHistorySignatureRef.current = null;

    setRedoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }

      const next = stack[stack.length - 1];
      const current = historySnapshotRef.current ?? buildHistorySnapshot();
      setUndoStack((undo) => [...undo.slice(-79), current]);
      isRestoringHistoryRef.current = true;
      applyHistorySnapshot(next);
      historySnapshotRef.current = next;
      historySignatureRef.current = JSON.stringify(next);
      return stack.slice(0, -1);
    });
  }

  useEffect(() => {
    const snapshot = buildHistorySnapshot();
    const signature = JSON.stringify(snapshot);

    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      historySnapshotRef.current = snapshot;
      historySignatureRef.current = signature;
      pendingHistorySnapshotRef.current = null;
      pendingHistorySignatureRef.current = null;
      return;
    }

    if (!historySignatureRef.current) {
      historySnapshotRef.current = snapshot;
      historySignatureRef.current = signature;
      return;
    }

    if (historySignatureRef.current === signature) {
      return;
    }

    pendingHistorySnapshotRef.current = snapshot;
    pendingHistorySignatureRef.current = signature;

    if (historyCommitTimerRef.current) {
      window.clearTimeout(historyCommitTimerRef.current);
    }

    historyCommitTimerRef.current = window.setTimeout(() => {
      const pendingSnapshot = pendingHistorySnapshotRef.current;
      const pendingSignature = pendingHistorySignatureRef.current;
      if (!pendingSnapshot || !pendingSignature) {
        historyCommitTimerRef.current = null;
        return;
      }

      if (historySnapshotRef.current) {
        setUndoStack((stack) => [...stack.slice(-79), historySnapshotRef.current as EditorHistorySnapshot]);
        setRedoStack([]);
      }

      historySnapshotRef.current = pendingSnapshot;
      historySignatureRef.current = pendingSignature;
      pendingHistorySnapshotRef.current = null;
      pendingHistorySignatureRef.current = null;
      historyCommitTimerRef.current = null;
    }, 180);
  }, [
    activeTab,
    activePresetId,
    categoryFilter,
    fontLibraryMode,
    fontPanelMode,
    customFontFamily,
    captionMode,
    manualPlacement,
    selectedPlacement,
    manualStyle,
    selectedCandidateId,
    segmentOverrides,
    deletedSegmentIds,
    deletedSegments,
    selectedSegmentId,
    totalDurationMs,
    videoAspect,
    isVerticalPreviewCompact,
    transcriptSegments,
    transcriptText,
    selectedTranscriptionAssetId,
    activeQuickTool,
    activeMainRibbonTool,
    activeEditRibbonTool,
    activeSoundRibbonTool,
    selectedToolTab,
    animationMode,
    animationPreset,
    selectedEffectsCategory,
    selectedEffectName,
    cropAspectPreset,
    noiseReductionLevel,
    maskMode,
    overlayMode,
    textPanelMode,
    textObjects,
    selectedTextObjectId,
    voiceEffectMode,
    clipOpacityPercent,
    selectedTimelineClipId,
    selectedTimelineClipTools,
    applyToolsToAllClips,
    timelineZoom,
    dockTimelineAssets,
    quickEditSettings,
    cutPointsMs,
  ]);

  useEffect(() => {
    return () => {
      if (historyCommitTimerRef.current) {
        window.clearTimeout(historyCommitTimerRef.current);
      }

      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }

      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [voicePreviewUrl]);

  function addTextObject(text: string = "New Text") {
    const newTextObject: TextObject = {
      id: `text-${Date.now()}`,
      kind: "text",
      text,
      startMs: Math.round(previewPlayheadMs),
      endMs: Math.round(previewPlayheadMs + 3000),
      x: 50,
      y: 50,
      fontSize: 24,
      fontFamily: customFontFamily || displayPreset?.fontFamily || "Arial",
      textColor: manualStyle.textColor,
      fontStyle: "normal",
      isActive: true,
    };
    setTextObjects((prev) => [...prev, newTextObject]);
    setSelectedTextObjectId(newTextObject.id);
  }

  function addStickerObject(sticker: string) {
    const newSticker: TextObject = {
      id: `sticker-${Date.now()}`,
      kind: "sticker",
      text: sticker,
      startMs: Math.round(previewPlayheadMs),
      endMs: Math.round(Math.min(totalDurationMs, previewPlayheadMs + 3000)),
      x: 50,
      y: 50,
      fontSize: 64,
      fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
      textColor: "#FFFFFF",
      fontStyle: "normal",
      isActive: true,
    };
    setTextObjects((prev) => [...prev, newSticker]);
    setSelectedTextObjectId(newSticker.id);
    setActiveTab("Placement");
  }

  function updateTextObject(id: string, updates: Partial<TextObject>) {
    setTextObjects((prev) =>
      prev.map((obj) =>
        obj.id === id ? { ...obj, ...updates } : obj
      )
    );
  }

  function deleteTextObject(id: string) {
    setTextObjects((prev) => prev.filter((obj) => obj.id !== id));
    if (selectedTextObjectId === id) {
      setSelectedTextObjectId(null);
    }
  }

  function cutAtPlayhead() {
    const cutMs = Math.max(0, Math.min(totalDurationMs, Math.round(previewPlayheadMs)));

    // If a lane clip is selected, cut it into two clips at the playhead position
    if (selectedTimelineClipId && onDockTimelineAssetsChange) {
      const target = dockTimelineAssets.find((e) => e.id === selectedTimelineClipId);
      if (target) {
        const clipStart = target.snapMs;
        const clipEnd = target.snapMs + target.durationMs;
        // Only cut if playhead is inside this clip's range
        if (cutMs > clipStart && cutMs < clipEnd) {
          const firstDuration = cutMs - clipStart;
          const secondDuration = clipEnd - cutMs;
          const firstHalf: typeof target = { ...target, durationMs: firstDuration };
          const secondHalf: typeof target = {
            ...target,
            id: target.id + "-cut",
            snapMs: cutMs,
            durationMs: secondDuration,
            createdAt: new Date().toISOString(),
          };
          const next = dockTimelineAssets.flatMap((e) =>
            e.id === selectedTimelineClipId ? [firstHalf, secondHalf] : [e],
          );
          onDockTimelineAssetsChange(next);
          setSelectedTimelineClipId(secondHalf.id);
          return;
        }
      }
    }

    // Fallback: add a global cut point marker on the caption timeline
    setCutPointsMs((current) => {
      if (cutMs <= 0 || cutMs >= totalDurationMs) {
        return current;
      }

      if (current.includes(cutMs)) {
        return current;
      }

      return [...current, cutMs].sort((a, b) => a - b);
    });
  }

  function removeCutPoint(cutMs: number) {
    setCutPointsMs((current) => current.filter((value) => value !== cutMs));
  }

  return (
    <section className="ll8-caption-studio-shell rounded-[30px] border border-cyan-400/15 bg-[linear-gradient(145deg,rgba(6,10,20,0.96),rgba(3,5,12,0.98))] p-4">
      <style>{`
        .caption-neon-text {
          background: linear-gradient(90deg, #06b6d4, #8b5cf6, #d946ef, #06b6d4);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
          letter-spacing: 0.04em;
          animation: captionNeonGlow 3s ease-in-out infinite;
        }
        @keyframes captionNeonGlow {
          0%, 100% { text-shadow: 0 0 8px rgba(6, 182, 212, 0.6), 0 0 16px rgba(6, 182, 212, 0.35); }
          50% { text-shadow: 0 0 16px rgba(6, 182, 212, 0.85), 0 0 28px rgba(139, 92, 246, 0.5); }
        }
      `}</style>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/75"><span className="caption-neon-text">Studio</span></p>
          <h3 className="mt-1 text-sm font-semibold text-white"><span className="caption-neon-text">{displayPreset?.name ?? "Preset"}</span></h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/65"><span className="caption-neon-text">{videoAspect} {videoAspect === "9:16" ? "Vertical" : "Horizontal"}</span></div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setVideoAspect("9:16")}
          className={`rounded-[14px] border px-2.5 py-2 text-center transition-colors duration-700 ${
            videoAspect === "9:16"
              ? neonFlip
                ? "border-cyan-300/70 bg-cyan-400/20 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                : "border-fuchsia-300/70 bg-fuchsia-500/20 shadow-[0_0_18px_rgba(217,70,239,0.35)]"
              : "border-white/10 bg-white/5"
          }`}
        >
          <p className="text-[11px] font-semibold text-white"><span className="caption-neon-text">9:16 vertical</span></p>
        </button>
        <button
          type="button"
          onClick={() => setVideoAspect("16:9")}
          className={`rounded-[14px] border px-2.5 py-2 text-center transition-colors duration-700 ${
            videoAspect === "16:9"
              ? neonFlip
                ? "border-emerald-300/70 bg-emerald-500/20 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                : "border-amber-300/70 bg-amber-500/20 shadow-[0_0_18px_rgba(245,158,11,0.35)]"
              : "border-white/10 bg-white/5"
          }`}
        >
          <p className="text-[11px] font-semibold text-white"><span className="caption-neon-text">16:9 horizontal</span></p>
        </button>
      </div>

      <div
        ref={previewRef}
        className="relative mb-4 w-full overflow-hidden rounded-[22px] border border-white/10 bg-black transition-[width] duration-300"
        style={{
          aspectRatio: videoAspect === "9:16" ? "9 / 16" : "16 / 9",
          width: videoAspect === "9:16" && isVerticalPreviewCompact ? "78%" : "100%",
          marginLeft: videoAspect === "9:16" && isVerticalPreviewCompact ? "auto" : undefined,
          marginRight: videoAspect === "9:16" && isVerticalPreviewCompact ? "auto" : undefined,
        }}
      >

        {activePreviewAsset && (activePreviewAsset.mimeType.startsWith("video/") || activePreviewAsset.mimeType.startsWith("image/") || activePreviewAsset.mimeType.startsWith("audio/")) ? (
          <div className="absolute inset-0 overflow-hidden" style={activePreviewVisualStyle}>
            {activePreviewAsset.mimeType.startsWith("video/") ? (
              <video
                ref={previewVideoRef}
                key={activePreviewAsset.id}
                src={activePreviewAsset.publicUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            ) : (
              activePreviewAsset.mimeType.startsWith("image/") ? (
                <img src={activePreviewAsset.publicUrl} alt={activePreviewAsset.fileName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col justify-end bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.28),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.22),transparent_48%),linear-gradient(180deg,rgba(6,10,18,0.72),rgba(2,4,10,0.98))] px-6 pb-8">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">Audio Source</p>
                  <div className="flex h-14 items-end gap-1">
                    {buildWaveformHeights(activePreviewAsset.fileName).map((height, index) => (
                      <span
                        key={`viewer-audio-${activePreviewAsset.id}-${index}`}
                        className="w-1 rounded-t bg-emerald-300/85"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <audio
                    ref={previewAudioRef}
                    key={activePreviewAsset.id}
                    src={activePreviewAsset.publicUrl}
                    className="hidden"
                  />
                </div>
              )
            )}
            <div className="pointer-events-none absolute inset-0" style={activeTintOverlayStyle} />
            {activeOverlayModeValue === "layers" ? (
              <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-55" style={{ background: "radial-gradient(circle at 20% 30%, rgba(34,211,238,0.24), transparent 40%), radial-gradient(circle at 80% 65%, rgba(217,70,239,0.2), transparent 38%)" }} />
            ) : null}
            {String(activeDockTimelineToolSettings.maskMode ?? maskMode) === "text" ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[20px] font-semibold uppercase tracking-[0.3em] text-white/45">Mask</div>
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-black/28" />
          </div>
        ) : null}

        {(manualPlacement || draggingSegmentId) ? (
          <>
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-300/30" />
            <div className="pointer-events-none absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-cyan-300/20" />
            <div
              className="pointer-events-none absolute border border-cyan-300/25"
              style={{
                left: `${manualStyle.safePadding * 100}%`,
                top: `${manualStyle.safePadding * 100}%`,
                right: `${manualStyle.safePadding * 100}%`,
                bottom: `${manualStyle.safePadding * 100}%`,
              }}
            />
          </>
        ) : null}

        {previewSegments.slice(0, 2).map((segment) => {
          const blockPreset = captionPresets.find((preset) => preset.id === segment.presetId) ?? displayPreset;
          const blockDecoration = resolveDecoration(blockPreset, {
            comicStyleMix,
            futuristicStyleMix,
            loveStyleMix,
          });

          return (
            <SegmentBlock
              key={segment.id}
              segment={segment}
              style={manualStyle}
              preset={blockPreset}
              decoration={blockDecoration}
              fontFamilyOverride={customFontFamily}
              isActive={draggingSegmentId === segment.id}
              scale={segmentOverrides[segment.id]?.fontScale ?? 1}
              onSelect={() => setSelectedSegmentId(segment.id)}
              previewRef={previewRef}
              onDragStart={() => {
                setManualPlacement(true);
                setDraggingSegmentId(segment.id);
                setSelectedSegmentId(segment.id);
              }}
              onDragMove={(x, y) => handleSegmentMove(segment.id, x, y)}
              onResizeWidth={(width) => handleSegmentWidthChange(segment.id, width)}
              onScale={(_delta, absoluteScale) => handleSegmentScaleChange(segment.id, absoluteScale)}
              mirrorX={segmentOverrides[segment.id]?.mirrorX ?? false}
              mirrorY={segmentOverrides[segment.id]?.mirrorY ?? false}
              decorationsAnimated={decorationsAnimated}
              decorationDensity={decorationDensity}
              decorationSpeed={decorationSpeed}
              onDragEnd={() => setDraggingSegmentId("")}
            />
          );
        })}

        {textObjects
          .filter((obj) => previewPlayheadMs >= obj.startMs && previewPlayheadMs <= obj.endMs)
          .map((textObj) => (
            <div
              key={textObj.id}
              onClick={() => setSelectedTextObjectId(textObj.id)}
              className={`absolute cursor-move transition-opacity ${
                selectedTextObjectId === textObj.id ? "opacity-100" : "opacity-80 hover:opacity-95"
              }`}
              style={{
                left: `${textObj.x}%`,
                top: `${textObj.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 20,
              }}
            >
              <div
                className={`font-semibold whitespace-nowrap rounded-lg border-2 px-3 py-1 ${
                  selectedTextObjectId === textObj.id
                    ? "border-amber-400 shadow-[0_0_12px_rgba(217,119,6,0.4)]"
                    : "border-white/20 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                }`}
                style={{
                  fontSize: `${textObj.fontSize * (videoAspect === "9:16" ? 0.9 : 1)}px`,
                  fontFamily: textObj.fontFamily,
                  color: textObj.textColor,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  textShadow: `0 2px 4px rgba(0,0,0,0.8)`,
                }}
              >
                {textObj.text}
              </div>
            </div>
          ))}

        {videoAspect === "9:16" ? (
          <button
            type="button"
            onClick={() => setIsVerticalPreviewCompact((current) => !current)}
            className="absolute bottom-2 right-2 z-30 rounded-full border border-white/15 bg-black/15 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/45 backdrop-blur-[1px] transition hover:border-white/30 hover:bg-black/25 hover:text-white/70"
            title={isVerticalPreviewCompact ? "Expand 9:16 preview" : "Compact 9:16 preview"}
          >
            {isVerticalPreviewCompact ? "Expand" : "Compact"}
          </button>
        ) : null}
      </div>

      <div className="ll8-player-tools-shell mb-4 rounded-[14px] border border-white/10 bg-white/5 p-2">
        {/* ============================================
            UNIFIED RIBBON SYSTEM
            Single container with 5 clear levels:
            1. Header (Undo/Redo)
            2. Main ribbon (Edit/Sound/Text/etc)
            3. Secondary ribbon (tool-specific)
            4. Controls panel (tool config)
            5. Footer (Apply/Reset)
            ============================================ */}
        
        <div className="ll8-unified-ribbon-system mb-4 rounded-[14px] border border-white/10 bg-black/20 p-3">
          {/* HEADER: Title + Undo/Redo */}
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55"><span className="caption-neon-text">Tools &amp; Controls</span></p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={undoEditorHistory}
                disabled={undoStack.length === 0}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/75 disabled:opacity-40 hover:bg-white/10"
              >
                <span className="caption-neon-text">Undo</span>
              </button>
              <button
                type="button"
                onClick={redoEditorHistory}
                disabled={redoStack.length === 0}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/75 disabled:opacity-40 hover:bg-white/10"
              >
                <span className="caption-neon-text">Redo</span>
              </button>
            </div>
          </div>

          {/* LEVEL 1: MAIN RIBBON (Tool Category Selection) */}
          <div className="mb-3 space-y-2">
            <div className="flex gap-1.5 overflow-x-auto rounded-[10px] border border-white/8 bg-white/3 p-2 pb-1.5">
              {mainRibbonOrder.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => handleSelectMainRibbonTool(tool)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    activeMainRibbonTool === tool
                      ? "border-cyan-300/55 bg-cyan-400/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8"
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          {/* LEVEL 2: SECONDARY RIBBON (Tool-Specific Options) */}
          {activeMainRibbonTool && (
            <div className="mb-3 space-y-2">
              {activeMainRibbonTool === "Edit" && (
                <div className="flex gap-1.5 overflow-x-auto rounded-[10px] border border-fuchsia-300/20 bg-fuchsia-500/8 p-2 pb-1.5">
                  {editRibbonOrder.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleSelectEditRibbonTool(tool)}
                      className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${
                        activeEditRibbonTool === tool
                          ? "border-fuchsia-300/55 bg-fuchsia-500/20 text-fuchsia-100"
                          : "border-fuchsia-300/20 bg-fuchsia-500/8 text-white/70 hover:bg-fuchsia-500/12"
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              )}
              
              {activeMainRibbonTool === "Sound" && (
                <div className="flex gap-1.5 overflow-x-auto rounded-[10px] border border-emerald-300/20 bg-emerald-500/8 p-2 pb-1.5">
                  {soundRibbonOrder.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleSelectSoundRibbonTool(tool)}
                      className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${
                        activeSoundRibbonTool === tool
                          ? "border-emerald-300/55 bg-emerald-500/20 text-emerald-100"
                          : "border-emerald-300/20 bg-emerald-500/8 text-white/70 hover:bg-emerald-500/12"
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
      )}

              {activeMainRibbonTool === "Captions" && (
                <div className="space-y-2">
                  <div className="flex gap-1.5 overflow-x-auto rounded-[10px] border border-violet-300/20 bg-violet-500/8 p-2 pb-1.5">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${
                          activeTab === tab
                            ? "border-violet-300/55 bg-violet-500/20 text-violet-100"
                            : "border-violet-300/20 bg-violet-500/8 text-white/70 hover:bg-violet-500/12"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto rounded-[10px] border border-violet-300/20 bg-violet-500/8 p-2 pb-1.5">
                    {activeTab === "Styles" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter("all");
                            setActiveTab("Styles");
                          }}
                          className="whitespace-nowrap rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2.5 py-1 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          All Styles
                        </button>
                        <button
                          type="button"
                          onClick={() => setCaptionMode("punchy")}
                          className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${
                            captionMode === "punchy"
                              ? "border-violet-300/55 bg-violet-500/20 text-violet-100"
                              : "border-violet-300/30 bg-violet-500/12 text-white/70 hover:bg-violet-500/20"
                          }`}
                        >
                          Punchy
                        </button>
                        <button
                          type="button"
                          onClick={() => setCaptionMode("hybrid")}
                          className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${
                            captionMode === "hybrid"
                              ? "border-violet-300/55 bg-violet-500/20 text-violet-100"
                              : "border-violet-300/30 bg-violet-500/12 text-white/70 hover:bg-violet-500/20"
                          }`}
                        >
                          Hybrid
                        </button>
                      </>
                    )}

                    {activeTab === "Fonts" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setFontPanelMode("library")}
                          className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${fontPanelMode === "library" ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-violet-300/30 bg-violet-500/12 text-white/70 hover:bg-violet-500/20"}`}
                        >
                          Font Library
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontPanelMode("size")}
                          className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${fontPanelMode === "size" ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-violet-300/30 bg-violet-500/12 text-white/70 hover:bg-violet-500/20"}`}
                        >
                          Text Size
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontPanelMode("case")}
                          className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${fontPanelMode === "case" ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-violet-300/30 bg-violet-500/12 text-white/70 hover:bg-violet-500/20"}`}
                        >
                          Case
                        </button>
                      </>
                    )}

                    {activeTab === "Voice" && (
                      <>
                        <button
                          type="button"
                          onClick={isVoiceRecording ? stopVoiceRecording : () => void startVoiceRecording()}
                          className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${isVoiceRecording ? "border-rose-300/45 bg-rose-500/18 text-rose-100" : "border-violet-300/30 bg-violet-500/12 text-violet-100 hover:bg-violet-500/20"}`}
                        >
                          {isVoiceRecording ? "Stop" : "Record"}
                        </button>
                        <button
                          type="button"
                          onClick={playVoicePreview}
                          disabled={!voicePreviewUrl}
                          className="whitespace-nowrap rounded-[8px] border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1 text-[10px] text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={pauseVoicePreview}
                          disabled={!voicePreviewUrl}
                          className="whitespace-nowrap rounded-[8px] border border-amber-300/35 bg-amber-500/12 px-2.5 py-1 text-[10px] text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
                        >
                          Pause
                        </button>
                        <button
                          type="button"
                          onClick={applyVoiceRecordingToLane}
                          disabled={!voicePreviewBlob || !onDockTimelineAssetsChange}
                          className="whitespace-nowrap rounded-[8px] border border-cyan-300/35 bg-cyan-500/12 px-2.5 py-1 text-[10px] text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:opacity-40"
                        >
                          Apply
                        </button>
                      </>
                    )}

                    {activeTab === "Placement" && (
                      <>
                        {([
                          ["top", "Top"],
                          ["middle", "Center"],
                          ["lowerThird", "Lower Third"],
                          ["bottom", "Bottom"],
                        ] as [PlacementMode, string][]).map(([placement, label]) => (
                          <button
                            key={placement}
                            type="button"
                            onClick={() => setSelectedPlacement(placement)}
                            className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${
                              selectedPlacement === placement
                                ? "border-violet-300/55 bg-violet-500/20 text-violet-100"
                                : "border-violet-300/30 bg-violet-500/12 text-white/70 hover:bg-violet-500/20"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </>
                    )}

                    {activeTab === "Colors" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Colors")}
                          className="whitespace-nowrap rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2.5 py-1 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          Theme Colors
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const palette = captionThemePalettes[0];
                            updateStyle("textColor", palette.text);
                            updateStyle("strokeColor", palette.stroke);
                            updateStyle("glowColor", palette.glow);
                            updateStyle("backgroundColor", normalizeHex(palette.background));
                            updateStyle("backgroundOpacity", extractAlpha(palette.background));
                            updateStyle("accentColor", palette.accent);
                          }}
                          className="whitespace-nowrap rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2.5 py-1 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          Reset Theme
                        </button>
                      </>
                    )}

                    {activeTab === "Manual" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Manual")}
                          className="whitespace-nowrap rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2.5 py-1 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          Segment Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Timing")}
                          className="whitespace-nowrap rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2.5 py-1 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          Offset Timing
                        </button>
                      </>
                    )}

                    {activeTab === "Timing" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Timing")}
                          className="whitespace-nowrap rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2.5 py-1 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          Auto Split
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Timing")}
                          className="whitespace-nowrap rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2.5 py-1 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          Fine Tune
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

                    {activeMainRibbonTool === "Text" && (
                      <div className="space-y-2">
                        <div className="flex gap-1.5 flex-wrap rounded-[10px] border border-amber-300/20 bg-amber-500/8 p-2">
                          <button
                            type="button"
                            onClick={() => addTextObject()}
                            className="whitespace-nowrap rounded-[8px] border border-amber-300/50 bg-amber-500/20 px-3 py-1.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/30 transition-colors"
                          >
                            + Add Text
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("Fonts");
                              setTextPanelMode("font");
                            }}
                            className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${textPanelMode === "font" ? "border-amber-300/55 bg-amber-500/22 text-amber-100" : "border-amber-300/30 bg-amber-500/12 text-amber-100 hover:bg-amber-500/20"}`}
                          >
                            Font
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("Colors");
                              setTextPanelMode("color");
                            }}
                            className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${textPanelMode === "color" ? "border-amber-300/55 bg-amber-500/22 text-amber-100" : "border-amber-300/30 bg-amber-500/12 text-amber-100 hover:bg-amber-500/20"}`}
                          >
                            Color
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("Timing");
                              setTextPanelMode("timing");
                            }}
                            className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${textPanelMode === "timing" ? "border-amber-300/55 bg-amber-500/22 text-amber-100" : "border-amber-300/30 bg-amber-500/12 text-amber-100 hover:bg-amber-500/20"}`}
                          >
                            Timing
                          </button>
                        </div>
                      </div>
                    )}

                    {activeMainRibbonTool === "Stickers" && (
                      <div className="space-y-2">
                        <div className="flex gap-1.5 overflow-x-auto rounded-[10px] border border-pink-300/20 bg-pink-500/8 p-2 pb-1.5">
                          {(["Styles", "Placement"] as const).map((section) => (
                            <button
                              key={section}
                              type="button"
                              onClick={() => setActiveTab(section)}
                              className={`whitespace-nowrap rounded-[8px] border px-2.5 py-1 text-[10px] transition-colors ${
                                activeTab === section
                                  ? "border-pink-300/55 bg-pink-500/20 text-pink-100"
                                  : "border-pink-300/20 bg-pink-500/8 text-white/70 hover:bg-pink-500/12"
                              }`}
                            >
                              {section}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5 rounded-[10px] border border-pink-300/20 bg-pink-500/8 p-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab("Styles")}
                            className="flex-1 rounded-[8px] border border-pink-300/30 bg-pink-500/12 px-3 py-1.5 text-[10px] text-pink-100 hover:bg-pink-500/20 transition-colors"
                          >
                            Browse Stickers
                          </button>
                        </div>
                      </div>
                    )}
            </div>
          )}

          {/* LEVEL 3: CONTROLS PANEL (Tool-Specific Configuration) */}
          {(activeQuickTool || activeMainRibbonTool === "Captions" || activeMainRibbonTool === "Text" || activeMainRibbonTool === "Stickers") && activeMainRibbonTool && (
            <div className={`mb-3 space-y-2 rounded-[10px] border p-2.5 ${
              activeMainRibbonTool === "Captions"
                ? "border-violet-300/20 bg-violet-500/8"
                : activeMainRibbonTool === "Text"
                ? "border-amber-300/20 bg-amber-500/8"
                : activeMainRibbonTool === "Stickers"
                ? "border-pink-300/20 bg-pink-500/8"
                : "border-white/12 bg-white/5"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase text-white/65">
                  {activeMainRibbonTool === "Edit" 
                    ? activeEditRibbonTool 
                    : activeMainRibbonTool === "Sound" 
                    ? activeSoundRibbonTool 
                    : activeMainRibbonTool}
                </span>
                {selectedTimelineClipId && (
                  <label className="flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/5 px-2.5 py-0.5 text-[10px]">
                    <input
                      type="checkbox"
                      checked={applyToolsToAllClips}
                      onChange={(e) => setApplyToolsToAllClips(e.target.checked)}
                      className="h-3 w-3 rounded"
                    />
                    <span className="text-cyan-100/70">Apply to all</span>
                  </label>
                )}
              </div>

              {/* Individual Tool Control Panels */}
              <div className="space-y-2">
                {/* CUT TOOL */}
                {activeQuickTool === "cut" && (
                  <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                    <div className="relative z-10 mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                      <span>Timeline Cut</span>
                      <span className="text-[10px]">{(previewPlayheadMs / 1000).toFixed(1)}s</span>
                    </div>
                    <button
                      type="button"
                      onClick={cutAtPlayhead}
                      className="relative z-10 w-full rounded-[10px] border border-fuchsia-300/50 bg-[linear-gradient(90deg,rgba(34,211,238,0.35),rgba(217,70,239,0.38),rgba(16,185,129,0.35))] px-3 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(217,70,239,0.28)] hover:shadow-[0_0_20px_rgba(217,70,239,0.35)]"
                    >
                      Cut At Playhead
                    </button>
                    <p className="relative z-10 mt-2 text-[10px] text-cyan-100/75">
                      {transitionLinks.length > 0
                        ? `${quickEditSettings.transitionType} transition auto-applies at each cut.`
                        : "Add a cut point to enable clip-to-clip transitions."}
                    </p>
                    {normalizedCutPoints.length > 0 && (
                      <div className="relative z-10 mt-2 flex flex-wrap gap-1.5">
                        {normalizedCutPoints.map((point) => (
                          <button
                            key={point}
                            type="button"
                            onClick={() => removeCutPoint(point)}
                            className="rounded-full border border-cyan-200/35 bg-black/35 px-2 py-0.5 text-[10px] text-cyan-50 hover:bg-black/50"
                          >
                            {point}ms ✕
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SPEED TOOL */}
                {activeQuickTool === "speed" && (
                  <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                      <span>Speed Control</span>
                      <span>{(quickEditSettings.speed / 100).toFixed(1)}x</span>
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {[0.1, 1, 2, 5, 10].map((mark) => (
                        <button
                          key={`speed-${mark}`}
                          type="button"
                          onClick={() => updateQuickEdits({ speed: Math.round(mark * 100) })}
                          className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] transition-colors ${Math.abs(quickEditSettings.speed / 100 - mark) < 0.05 ? "border-cyan-200/70 bg-cyan-400/20 text-cyan-50" : "border-cyan-300/30 bg-black/35 text-cyan-100/75 hover:bg-black/45"}`}
                        >
                          {mark}x
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={1000}
                      step={5}
                      value={quickEditSettings.speed}
                      onChange={(event) => updateQuickEdits({ speed: Number(event.target.value) })}
                      className="relative z-10 w-full"
                    />
                    <p className="text-[10px] text-cyan-100/70">{'<1x slows | >1x speeds up'}</p>
                  </div>
                )}

                {/* CROP TOOL */}
                {activeQuickTool === "crop" && (
                  <div className="space-y-2">
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                        <span>Aspect Ratio</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCropAspectPreset("freeform");
                            updateQuickEdits({ zoom: 100, rotation: 0 });
                          }}
                          className="rounded-full border border-white/20 bg-white/8 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/12"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {(["freeform", "9:16", "16:9", "1:1", "3:4", "4:3"] as const).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setCropAspectPreset(preset);
                              applyPatchToTimelineTools({ cropAspectPreset: preset });
                            }}
                            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] transition-colors ${cropAspectPreset === preset ? "border-cyan-200/70 bg-cyan-400/20 text-cyan-50" : "border-cyan-300/30 bg-black/35 text-cyan-100/75 hover:bg-black/45"}`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                          <span>Zoom</span>
                          <span>{quickEditSettings.zoom}%</span>
                        </div>
                        <input
                          type="range"
                          min={80}
                          max={180}
                          value={quickEditSettings.zoom}
                          onChange={(event) => updateQuickEdits({ zoom: Number(event.target.value) })}
                          className="relative z-10 w-full"
                        />
                      </div>
                      <div className="ll8-neon-tool-panel ll8-neon-tool-panel--b rounded-[12px] border border-fuchsia-300/40 bg-fuchsia-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-fuchsia-50/90 font-medium">
                          <span>Rotate</span>
                          <span>{quickEditSettings.rotation}°</span>
                        </div>
                        <input
                          type="range"
                          min={-30}
                          max={30}
                          value={quickEditSettings.rotation}
                          onChange={(event) => updateQuickEdits({ rotation: Number(event.target.value) })}
                          className="relative z-10 w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* FADE TOOL */}
                {activeQuickTool === "fade" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                        <span>Fade In</span>
                        <span>{quickEditSettings.fadeInMs}ms</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2000}
                        value={quickEditSettings.fadeInMs}
                        onChange={(event) => updateQuickEdits({ fadeInMs: Number(event.target.value) })}
                        className="relative z-10 w-full"
                      />
                    </div>
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--b rounded-[12px] border border-fuchsia-300/40 bg-fuchsia-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-fuchsia-50/90 font-medium">
                        <span>Fade Out</span>
                        <span>{quickEditSettings.fadeOutMs}ms</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2000}
                        value={quickEditSettings.fadeOutMs}
                        onChange={(event) => updateQuickEdits({ fadeOutMs: Number(event.target.value) })}
                        className="relative z-10 w-full"
                      />
                    </div>
                  </div>
                )}

                {/* ADJUST TOOL */}
                {activeQuickTool === "color" && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "brightness", label: "Brightness", min: 40, max: 160, value: quickEditSettings.brightness },
                      { key: "contrast", label: "Contrast", min: 40, max: 180, value: quickEditSettings.contrast },
                      { key: "saturation", label: "Saturation", min: 0, max: 180, value: quickEditSettings.saturation },
                      { key: "temperature", label: "Temp", min: -100, max: 100, value: quickEditSettings.temperature },
                    ].map((control) => (
                      <div key={control.key} className="ll8-neon-tool-panel rounded-[12px] border border-cyan-300/30 bg-cyan-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                          <span>{control.label}</span>
                          <span className="text-[10px]">{control.value}%</span>
                        </div>
                        <input
                          type="range"
                          min={control.min}
                          max={control.max}
                          value={control.value}
                          onChange={(event) => updateQuickEdits({ [control.key]: Number(event.target.value) } as Partial<QuickEditSettings>)}
                          className="relative z-10 w-full"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* VOLUME TOOL */}
                {activeQuickTool === "volume" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-emerald-300/40 bg-emerald-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-emerald-50/90 font-medium">
                        <span>Master Volume</span>
                        <span>{quickEditSettings.volume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={quickEditSettings.volume}
                        onChange={(event) => updateQuickEdits({ volume: Number(event.target.value) })}
                        className="relative z-10 w-full"
                      />
                    </div>
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--b rounded-[12px] border border-emerald-300/40 bg-emerald-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-emerald-50/90 font-medium">
                        <span>Voice Boost</span>
                        <span>{quickEditSettings.voiceBoost}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={quickEditSettings.voiceBoost}
                        onChange={(event) => updateQuickEdits({ voiceBoost: Number(event.target.value) })}
                        className="relative z-10 w-full"
                      />
                    </div>
                  </div>
                )}

                {/* EFFECTS TOOL */}
                {activeQuickTool === "fx" && (
                  <div className="space-y-2">
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                        <span>Effects Library</span>
                        <span className="text-[10px]">{selectedEffectsCategory}</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {effectsCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setSelectedEffectsCategory(category)}
                            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] transition-colors ${selectedEffectsCategory === category ? "border-cyan-200/70 bg-cyan-400/20 text-cyan-50" : "border-cyan-300/30 bg-black/35 text-cyan-100/75 hover:bg-black/45"}`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      <div className="relative z-10 mt-2 max-h-20 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-1">
                          {effectsCatalog[selectedEffectsCategory].map((effectName) => (
                            <button
                              key={effectName}
                              type="button"
                              onClick={() => {
                                setSelectedEffectName(effectName);
                                applyPatchToTimelineTools({ effectName, effectsCategory: selectedEffectsCategory });
                              }}
                              className={`rounded-md border px-2 py-1 text-left text-[10px] transition-colors ${selectedEffectName === effectName ? "border-fuchsia-200/70 bg-fuchsia-500/20 text-fuchsia-50" : "border-white/12 bg-black/35 text-white/75 hover:bg-black/45"}`}
                            >
                              {effectName}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="ll8-neon-tool-panel rounded-[12px] border border-cyan-300/30 bg-cyan-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                          <span>Vignette</span>
                          <span className="text-[10px]">{quickEditSettings.vignette}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={quickEditSettings.vignette}
                          onChange={(event) => updateQuickEdits({ vignette: Number(event.target.value) })}
                          className="relative z-10 w-full"
                        />
                      </div>
                      <div className="ll8-neon-tool-panel rounded-[12px] border border-cyan-300/30 bg-cyan-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                          <span>Grain</span>
                          <span className="text-[10px]">{quickEditSettings.grain}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={quickEditSettings.grain}
                          onChange={(event) => updateQuickEdits({ grain: Number(event.target.value) })}
                          className="relative z-10 w-full"
                        />
                      </div>
                      <div className="ll8-neon-tool-panel rounded-[12px] border border-cyan-300/30 bg-cyan-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                          <span>Sharpen</span>
                          <span className="text-[10px]">{quickEditSettings.sharpen}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={quickEditSettings.sharpen}
                          onChange={(event) => updateQuickEdits({ sharpen: Number(event.target.value) })}
                          className="relative z-10 w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ANIMATION/TRANSITION TOOL */}
                {activeQuickTool === "transition" && (
                  <div className="space-y-2">
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                        <span>Animation Mode</span>
                        <span className="text-[10px]">{animationMode}</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {animationModes.map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setAnimationMode(mode);
                              applyPatchToTimelineTools({ animationMode: mode });
                            }}
                            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] transition-colors ${animationMode === mode ? "border-cyan-200/70 bg-cyan-400/20 text-cyan-50" : "border-cyan-300/30 bg-black/35 text-cyan-100/75 hover:bg-black/45"}`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="ll8-neon-tool-panel rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                          <span>Type</span>
                        </div>
                        <select
                          value={quickEditSettings.transitionType}
                          onChange={(event) => updateQuickEdits({ transitionType: event.target.value as QuickEditSettings["transitionType"] })}
                          className="ll8-neon-select relative z-10 w-full rounded-[8px] border border-cyan-200/50 px-2 py-1.5 text-[10px] text-cyan-50 bg-black/25"
                        >
                          <option value="cut">Cut</option>
                          <option value="crossfade">Crossfade</option>
                          <option value="dip">Dip To Black</option>
                          <option value="zoom">Zoom Push</option>
                        </select>
                      </div>
                      <div className="ll8-neon-tool-panel rounded-[12px] border border-fuchsia-300/40 bg-fuchsia-500/8 p-2.5">
                        <div className="mb-2 flex items-center justify-between text-xs text-fuchsia-50/90 font-medium">
                          <span>Duration</span>
                          <span className="text-[10px]">{quickEditSettings.transitionMs}ms</span>
                        </div>
                        <input
                          type="range"
                          min={80}
                          max={2000}
                          value={quickEditSettings.transitionMs}
                          onChange={(event) => updateQuickEdits({ transitionMs: Number(event.target.value) })}
                          className="relative z-10 w-full"
                        />
                      </div>
                    </div>
                    <div className="ll8-neon-tool-panel ll8-neon-tool-panel--a rounded-[12px] border border-cyan-300/40 bg-cyan-500/8 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-cyan-50/90 font-medium">
                        <span>Presets</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAnimationPreset("Fade In");
                            setAnimationMode("Combo");
                            applyPatchToTimelineTools({ animationPreset: "Fade In", animationMode: "Combo" });
                          }}
                          className="rounded-full border border-white/20 bg-white/8 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/12"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {animationPresetOptions.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setAnimationPreset(preset);
                              applyPatchToTimelineTools({ animationPreset: preset });
                            }}
                            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] transition-colors ${animationPreset === preset ? "border-fuchsia-200/70 bg-fuchsia-500/20 text-fuchsia-50" : "border-fuchsia-300/30 bg-black/35 text-fuchsia-100/75 hover:bg-black/45"}`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CAPTIONS PANEL */}
              {activeMainRibbonTool === "Captions" && (
                <div className="space-y-2">
                  {/* Style Preset Carousel */}
                  {activeTab === "Captions" ? (
                    <div className="max-h-[260px] overflow-y-auto rounded-[10px] border border-violet-300/15 bg-black/20 p-2 pr-1">
                      <CaptionStyleCarousel
                        categories={captionCategories as unknown as CaptionCategory[]}
                        activeCategory={categoryFilter}
                        onCategoryChange={setCategoryFilter}
                        presets={filteredPresets}
                        activePresetId={activePresetId}
                        onPresetChange={setActivePresetId}
                      />
                    </div>
                  ) : null}

                  {/* Active Tab Content */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {activeTab === "Styles" ? (
                      <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => setCaptionMode("punchy")} className={`rounded-[10px] border px-2 py-1 text-[10px] transition-colors ${captionMode === "punchy" ? "border-violet-300/60 bg-violet-500/20 text-violet-100" : "border-violet-300/28 bg-black/30 text-white/70"}`}>Punchy</button>
                        <button onClick={() => setCaptionMode("hybrid")} className={`rounded-[10px] border px-2 py-1 text-[10px] transition-colors ${captionMode === "hybrid" ? "border-violet-300/60 bg-violet-500/20 text-violet-100" : "border-violet-300/28 bg-black/30 text-white/70"}`}>Hybrid</button>
                        <button onClick={() => { const p = captionThemePalettes[0]; updateStyle("textColor", p.text); updateStyle("strokeColor", p.stroke); updateStyle("glowColor", p.glow); updateStyle("backgroundColor", normalizeHex(p.background)); updateStyle("backgroundOpacity", extractAlpha(p.background)); updateStyle("accentColor", p.accent); }} className="rounded-[10px] border border-emerald-300/40 bg-emerald-500/12 px-2 py-1 text-[10px] text-emerald-100">Reset Theme</button>
                      </div>
                    ) : null}

                    {activeTab === "Fonts" ? (
                      <div className="space-y-1.5">
                        {fontPanelMode === "library" ? (
                          <>
                            <div className="grid grid-cols-2 gap-1">
                              <button type="button" onClick={() => setFontLibraryMode("suggested")} className={`rounded-[10px] border px-2 py-1 text-[10px] transition-colors ${fontLibraryMode === "suggested" ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-white/10 bg-black/30 text-white/70"}`}>Suggested</button>
                              <button type="button" onClick={() => setFontLibraryMode("all")} className={`rounded-[10px] border px-2 py-1 text-[10px] transition-colors ${fontLibraryMode === "all" ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-white/10 bg-black/30 text-white/70"}`}>All Fonts</button>
                            </div>
                            {customFontFamily ? <button type="button" onClick={clearFontOverride} className="w-full rounded-[10px] border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-white/75">Reset to Preset Font</button> : null}
                            <div className="max-h-[180px] space-y-1 overflow-y-auto">
                              {fontOptions.slice(0, 10).map((fontFamily) => {
                                const isActive = (customFontFamily || displayPreset?.fontFamily) === fontFamily;
                                return (
                                  <button key={fontFamily} type="button" onClick={() => applyFontFamily(fontFamily)} className={`w-full rounded-[10px] border px-2 py-1 text-left text-[10px] transition-colors ${isActive ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-white/10 bg-black/30 text-white/80"}`}>
                                    <span style={{ fontFamily: `"${fontFamily}"` }}>{fontFamily}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : null}

                        {fontPanelMode === "size" ? (
                          <div className="space-y-2 rounded-[10px] border border-violet-300/20 bg-black/20 p-2">
                            <label className="block text-[10px]">
                              <span className="text-white/60">Caption Font Size ({manualStyle.fontSize}px)</span>
                              <input
                                type="range"
                                min={12}
                                max={96}
                                value={manualStyle.fontSize}
                                onChange={(e) => updateStyle("fontSize", Number(e.target.value))}
                                className="mt-1 w-full"
                              />
                            </label>
                            <div className="grid grid-cols-4 gap-1">
                              {[24, 32, 42, 56].map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => updateStyle("fontSize", size)}
                                  className={`rounded-[8px] border px-2 py-1 text-[10px] transition-colors ${manualStyle.fontSize === size ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-white/10 bg-black/30 text-white/75 hover:bg-black/40"}`}
                                >
                                  {size}px
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {fontPanelMode === "case" ? (
                          <div className="space-y-2 rounded-[10px] border border-violet-300/20 bg-black/20 p-2">
                            <p className="text-[10px] text-white/65">
                              Applies to {selectedSegmentId ? "selected caption" : "all captions"}.
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                              <button type="button" onClick={() => applyCaptionCase("upper")} className="rounded-[8px] border border-violet-300/35 bg-violet-500/12 px-2 py-1 text-[10px] text-violet-100 hover:bg-violet-500/20">UPPERCASE</button>
                              <button type="button" onClick={() => applyCaptionCase("lower")} className="rounded-[8px] border border-violet-300/35 bg-violet-500/12 px-2 py-1 text-[10px] text-violet-100 hover:bg-violet-500/20">lowercase</button>
                              <button type="button" onClick={() => applyCaptionCase("title")} className="rounded-[8px] border border-violet-300/35 bg-violet-500/12 px-2 py-1 text-[10px] text-violet-100 hover:bg-violet-500/20">Title Case</button>
                              <button type="button" onClick={() => applyCaptionCase("original")} className="rounded-[8px] border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white/80 hover:bg-black/40">Original</button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {activeTab === "Captions" ? (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-[0.16em] text-white/45">Caption Blocks ({segments.length})</p>
                        <div className="max-h-[200px] space-y-1 overflow-y-auto">
                          {segments.map((segment) => (
                            <button key={segment.id} onClick={() => setSelectedSegmentId(segment.id)} className={`w-full rounded-[10px] border p-1.5 text-left text-[10px] ${selectedSegmentId === segment.id ? "border-violet-300/55 bg-violet-500/15" : "border-white/10 bg-black/30"}`}>
                              <span className="text-white/55 text-[9px]">{Math.round(segment.startMs)}ms–{Math.round(segment.endMs)}ms</span>
                              <p className="text-white/80 truncate">{segment.text}</p>
                            </button>
                          ))}
                        </div>
                        {selectedSegmentId && (
                          <div className="mt-1 space-y-1 rounded-[10px] border border-violet-300/20 bg-black/25 p-2">
                            <div className="flex gap-1 justify-end">
                              <button type="button" onClick={() => updateSegmentPreset(selectedSegmentId, activePresetId)} className="rounded-[8px] border border-violet-300/30 bg-violet-500/12 px-2 py-0.5 text-[10px] text-violet-100">Apply Style</button>
                              <button type="button" onClick={() => deleteSegment(selectedSegmentId)} className="rounded-[8px] border border-rose-300/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-100">Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {activeTab === "Voice" ? (
                      <div className="space-y-2 text-[10px]">
                        <p className="text-[9px] uppercase tracking-[0.16em] text-white/45">Caption Text Editor</p>
                        <div className="max-h-[140px] space-y-1 overflow-y-auto">
                          {segments.map((segment) => (
                            <button
                              key={segment.id}
                              type="button"
                              onClick={() => setSelectedSegmentId(segment.id)}
                              className={`w-full rounded-[10px] border p-1.5 text-left ${selectedSegmentId === segment.id ? "border-violet-300/55 bg-violet-500/15" : "border-white/10 bg-black/30"}`}
                            >
                              <div className="flex items-center justify-between text-[9px] text-white/60">
                                <span>{Math.round(segment.startMs)}-{Math.round(segment.endMs)}ms</span>
                                <span className="truncate pl-2">{segment.id}</span>
                              </div>
                              <p className="truncate text-white/80">{segment.text}</p>
                            </button>
                          ))}
                        </div>
                        {selectedSegment ? (
                          <div className="space-y-1 rounded-[10px] border border-violet-300/20 bg-black/25 p-2">
                            <label className="block text-[9px] text-white/55">Caption Text</label>
                            <SegmentTextarea
                              value={selectedSegment.text}
                              onChange={(text) => updateSegmentText(selectedSegment.id, text)}
                            />
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <label className="block text-[9px] text-white/55">Start</label>
                                <input
                                  type="number"
                                  value={Math.round(segmentOverrides[selectedSegment.id]?.startMs ?? selectedSegment.startMs)}
                                  onChange={(e) => updateSegmentTiming(selectedSegment.id, "startMs", Number(e.target.value))}
                                  className="w-full rounded-[6px] border border-violet-300/20 bg-black/40 px-1 py-0.5 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-white/55">End</label>
                                <input
                                  type="number"
                                  value={Math.round(segmentOverrides[selectedSegment.id]?.endMs ?? selectedSegment.endMs)}
                                  onChange={(e) => updateSegmentTiming(selectedSegment.id, "endMs", Number(e.target.value))}
                                  className="w-full rounded-[6px] border border-violet-300/20 bg-black/40 px-1 py-0.5 text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-white/55">No caption selected.</p>
                        )}
                      </div>
                    ) : null}

                    {activeTab === "Placement" ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1">
                          <button onClick={() => setManualPlacement(false)} className={`rounded-[10px] border px-2 py-1 text-[10px] ${!manualPlacement ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/5 text-white/70"}`}>Smart</button>
                          <button onClick={() => setManualPlacement(true)} className={`rounded-[10px] border px-2 py-1 text-[10px] ${manualPlacement ? "border-violet-300/55 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/5 text-white/70"}`}>Manual</button>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-[10px]">
                          {(["bottom","lowerThird","center","top"] as PlacementMode[]).map((p) => (
                            <button key={p} onClick={() => setSelectedPlacement(p)} className={`rounded-[10px] border px-1 py-0.5 capitalize ${selectedPlacement === p ? "border-violet-400/35 bg-violet-400/10 text-violet-100" : "border-white/10 bg-white/5 text-white/65"}`}>{p}</button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {activeTab === "Colors" ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1 max-h-[140px] overflow-y-auto">
                          {captionThemePalettes.slice(0, 9).map((palette) => (
                            <button key={palette.id} onClick={() => { updateStyle("textColor", palette.text); updateStyle("strokeColor", palette.stroke); updateStyle("glowColor", palette.glow); updateStyle("backgroundColor", normalizeHex(palette.background)); updateStyle("backgroundOpacity", extractAlpha(palette.background)); updateStyle("accentColor", palette.accent); }} className="rounded-[10px] border border-white/10 bg-white/5 p-1 text-[9px]">
                              <p className="text-white/70 truncate">{palette.name}</p>
                              <div className="mt-0.5 flex gap-0.5">{[palette.text, palette.stroke, palette.glow].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />)}</div>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                          <ColorWheel
                            label="Text"
                            value={manualStyle.textColor}
                            opacity={manualStyle.textOpacity}
                            onChange={(value) => updateStyle("textColor", value)}
                            onOpacityChange={(value) => updateStyle("textOpacity", value)}
                          />
                          <ColorWheel
                            label="Stroke"
                            value={manualStyle.strokeColor}
                            opacity={manualStyle.strokeOpacity}
                            onChange={(value) => updateStyle("strokeColor", value)}
                            onOpacityChange={(value) => updateStyle("strokeOpacity", value)}
                          />
                          <ColorWheel
                            label="Glow"
                            value={manualStyle.glowColor}
                            opacity={manualStyle.glowOpacity}
                            onChange={(value) => updateStyle("glowColor", value)}
                            onOpacityChange={(value) => updateStyle("glowOpacity", value)}
                          />
                          <ColorWheel
                            label="Background"
                            value={manualStyle.backgroundColor}
                            opacity={manualStyle.backgroundOpacity}
                            onChange={(value) => updateStyle("backgroundColor", value)}
                            onOpacityChange={(value) => updateStyle("backgroundOpacity", value)}
                          />
                        </div>

                        <div className="rounded-[10px] border border-white/10 bg-black/20 p-2 space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Gradients</p>
                          <div className="space-y-2">
                            <div>
                              <p className="mb-1 text-[10px] text-white/60">Text Gradient</p>
                              <GradientPicker value={manualStyle.textGradient ?? ""} baseColor={manualStyle.textColor} onChange={(css) => updateStyle("textGradient", css)} />
                              <button type="button" onClick={() => updateStyle("textGradient", undefined)} className="mt-1 rounded-[8px] border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/75 hover:bg-white/10">Clear Text Gradient</button>
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] text-white/60">Background Gradient</p>
                              <GradientPicker value={manualStyle.backgroundGradient ?? ""} baseColor={manualStyle.backgroundColor} onChange={(css) => updateStyle("backgroundGradient", css)} />
                              <button type="button" onClick={() => updateStyle("backgroundGradient", undefined)} className="mt-1 rounded-[8px] border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/75 hover:bg-white/10">Clear Background Gradient</button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[10px] border border-white/10 bg-black/20 p-2">
                          <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-white/50">Accent</p>
                          <input type="color" value={normalizeHex(manualStyle.accentColor)} onChange={(e) => updateStyle("accentColor", e.target.value)} className="h-8 w-full rounded border border-white/15 bg-transparent" />
                        </div>
                      </div>
                    ) : null}

                    {activeTab === "Manual" ? (
                      <div className="space-y-2">
                        <label className="block text-[10px]">
                          <span className="text-white/60">Font Size ({manualStyle.fontSize}px)</span>
                          <input type="range" min={12} max={96} value={manualStyle.fontSize} onChange={(e) => updateStyle("fontSize", Number(e.target.value))} className="w-full mt-1" />
                        </label>
                        <label className="block text-[10px]">
                          <span className="text-white/60">Stroke Width ({manualStyle.strokeWidth}px)</span>
                          <input type="range" min={0} max={12} value={manualStyle.strokeWidth} onChange={(e) => updateStyle("strokeWidth", Number(e.target.value))} className="w-full mt-1" />
                        </label>
                        <label className="block text-[10px]">
                          <span className="text-white/60">Glow ({manualStyle.glowIntensity}%)</span>
                          <input type="range" min={0} max={100} value={manualStyle.glowIntensity} onChange={(e) => updateStyle("glowIntensity", Number(e.target.value))} className="w-full mt-1" />
                        </label>
                        {selectedSegment && (
                          <div className="grid grid-cols-2 gap-1 pt-1">
                            <button onClick={() => toggleSelectedMirror("x")} className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/80">Mirror</button>
                            <button onClick={() => toggleSelectedMirror("y")} className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/80">Flip</button>
                            <button onClick={() => deleteSegment(selectedSegment.id)} className="col-span-2 rounded-[10px] border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-100">Delete Selected</button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {activeTab === "Timing" ? (
                      <div className="space-y-2">
                        <label className="block text-[10px]">
                          <span className="text-white/60">Total Duration ({totalDurationMs}ms)</span>
                          <input type="range" min={3000} max={Math.max(60000, Math.ceil(totalDurationMs / 500) * 500)} step={500} value={totalDurationMs} onChange={(e) => setTotalDurationMs(Number(e.target.value))} className="w-full mt-1" />
                        </label>
                        <div className="max-h-[180px] space-y-1 overflow-y-auto">
                          {segments.map((segment) => {
                            const isSelected = selectedSegment?.id === segment.id;
                            const startMs = segmentOverrides[segment.id]?.startMs ?? segment.startMs;
                            const endMs = segmentOverrides[segment.id]?.endMs ?? segment.endMs;
                            return (
                              <button key={segment.id} type="button" onClick={() => setSelectedSegmentId(segment.id)} className={`w-full rounded-[10px] border p-1.5 text-left text-[10px] ${isSelected ? "border-violet-400/35 bg-violet-400/10" : "border-white/10 bg-white/5"}`}>
                                <div className="flex items-center justify-between text-[9px] text-white/60">
                                  <span className="truncate pr-1">{segment.text}</span>
                                  <span className="whitespace-nowrap">{Math.round(endMs - startMs)}ms</span>
                                </div>
                                <div className="relative mt-1 h-1.5 rounded-full bg-white/10">
                                  <div className="absolute h-1.5 rounded-full bg-violet-300/70" style={{ left: `${(startMs / totalDurationMs) * 100}%`, width: `${Math.max(2, ((endMs - startMs) / totalDurationMs) * 100)}%` }} />
                                  <div className="pointer-events-none absolute top-1/2 h-2 w-px -translate-y-1/2 bg-white/55" style={{ left: `${(previewPlayheadMs / totalDurationMs) * 100}%` }} />
                                </div>
                                {isSelected && (
                                  <div className="mt-1.5 space-y-1">
                                    <label className="block text-[10px] text-white/70">Start {Math.round(startMs)}ms<input type="range" min={0} max={totalDurationMs} value={startMs} onChange={(e) => updateSegmentTiming(segment.id, "startMs", Number(e.target.value))} className="mt-0.5 w-full" /></label>
                                    <label className="block text-[10px] text-white/70">End {Math.round(endMs)}ms<input type="range" min={0} max={totalDurationMs} value={endMs} onChange={(e) => updateSegmentTiming(segment.id, "endMs", Number(e.target.value))} className="mt-0.5 w-full" /></label>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* TEXT OBJECTS PANEL */}
              {activeMainRibbonTool === "Text" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/65">Text Objects ({textToolObjects.length})</p>
                    <button type="button" onClick={() => addTextObject()} className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/25">+ Add</button>
                  </div>
                  <div className="max-h-[120px] space-y-1 overflow-y-auto">
                    {textToolObjects.length === 0 ? (
                      <div className="rounded-[8px] border border-white/10 bg-white/5 p-2 text-center text-[10px] text-white/50">No text objects yet — click + Add</div>
                    ) : (
                      textToolObjects.map((textObj) => (
                        <button key={textObj.id} onClick={() => setSelectedTextObjectId(textObj.id)} className={`w-full rounded-[8px] border p-1.5 text-left text-[10px] transition-colors ${selectedTextObjectId === textObj.id ? "border-amber-300/50 bg-amber-500/15" : "border-white/10 bg-white/5 hover:bg-white/8"}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-white/85">{textObj.text}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); deleteTextObject(textObj.id); }} className="rounded border border-rose-300/20 bg-rose-500/10 px-1 py-0.5 text-[10px] text-rose-100 hover:bg-rose-500/20">✕</button>
                          </div>
                          <span className="text-[9px] text-white/45">{Math.round(textObj.startMs)}ms – {Math.round(textObj.endMs)}ms</span>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedTextObjectId && (
                    <div className="rounded-[8px] border border-amber-300/20 bg-black/20 p-2 space-y-2 text-[10px]">
                      <input type="text" value={textObjects.find((o) => o.id === selectedTextObjectId)?.text || ""} onChange={(e) => updateTextObject(selectedTextObjectId, { text: e.target.value })} className="w-full rounded-[6px] border border-amber-300/20 bg-black/40 px-2 py-1 text-white text-[11px]" placeholder="Edit text" />

                      {textPanelMode === "font" ? (
                        <div className="grid grid-cols-2 gap-1">
                          <div><label className="text-[9px] text-white/50">Size</label><input type="number" value={textObjects.find((o) => o.id === selectedTextObjectId)?.fontSize || 24} onChange={(e) => updateTextObject(selectedTextObjectId, { fontSize: Number(e.target.value) })} className="w-full rounded-[6px] border border-amber-300/20 bg-black/40 px-1 py-0.5 text-white" /></div>
                          <div>
                            <label className="text-[9px] text-white/50">Font</label>
                            <select value={textObjects.find((o) => o.id === selectedTextObjectId)?.fontFamily || (customFontFamily || displayPreset?.fontFamily || "Arial")} onChange={(e) => updateTextObject(selectedTextObjectId, { fontFamily: e.target.value })} className="w-full rounded-[6px] border border-amber-300/20 bg-black/40 px-1 py-0.5 text-white">
                              {fontOptions.slice(0, 16).map((fontFamily) => (
                                <option key={fontFamily} value={fontFamily}>{fontFamily}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : null}

                      {textPanelMode === "color" ? (
                        <div className="flex items-center gap-1">
                          <label className="text-[9px] text-white/50">Color</label>
                          <input type="color" value={textObjects.find((o) => o.id === selectedTextObjectId)?.textColor || "#ffffff"} onChange={(e) => updateTextObject(selectedTextObjectId, { textColor: e.target.value })} className="h-6 w-10 rounded border border-amber-300/20 cursor-pointer bg-transparent" />
                        </div>
                      ) : null}

                      {textPanelMode === "timing" ? (
                        <div className="grid grid-cols-2 gap-1">
                          <div><label className="text-[9px] text-white/50">Start ms</label><input type="number" value={Math.round(textObjects.find((o) => o.id === selectedTextObjectId)?.startMs || 0)} onChange={(e) => updateTextObject(selectedTextObjectId, { startMs: Math.max(0, Math.min(totalDurationMs, Number(e.target.value))) })} className="w-full rounded-[6px] border border-amber-300/20 bg-black/40 px-1 py-0.5 text-white" /></div>
                          <div><label className="text-[9px] text-white/50">End ms</label><input type="number" value={Math.round(textObjects.find((o) => o.id === selectedTextObjectId)?.endMs || 3000)} onChange={(e) => updateTextObject(selectedTextObjectId, { endMs: Math.max(0, Math.min(totalDurationMs, Number(e.target.value))) })} className="w-full rounded-[6px] border border-amber-300/20 bg-black/40 px-1 py-0.5 text-white" /></div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* STICKERS PANEL */}
              {activeMainRibbonTool === "Stickers" && (
                <div className="space-y-2">
                  {activeTab === "Styles" ? (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/65">Free Sticker Packs</p>
                      <div className="space-y-2">
                        {stickerPacks.map((pack) => (
                          <div key={pack.id} className="rounded-[8px] border border-pink-300/20 bg-black/20 p-2">
                            <p className="mb-1 text-[10px] font-semibold text-pink-100/90">{pack.name}</p>
                            <div className="grid grid-cols-8 gap-1">
                              {pack.stickers.map((sticker) => (
                                <button
                                  key={`${pack.id}-${sticker}`}
                                  type="button"
                                  onClick={() => addStickerObject(sticker)}
                                  className="rounded-[8px] border border-pink-300/25 bg-pink-500/10 px-1 py-1 text-base leading-none text-white hover:bg-pink-500/20"
                                  title={`Add ${sticker}`}
                                >
                                  {sticker}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {activeTab === "Placement" ? (
                    <div className="space-y-2 rounded-[8px] border border-pink-300/20 bg-black/20 p-2 text-[10px]">
                      <p className="text-white/65">Sticker Objects ({stickerObjects.length})</p>
                      {stickerObjects.length === 0 ? (
                        <p className="text-white/50">No stickers yet. Open Styles and click a sticker to add one.</p>
                      ) : (
                        <div className="space-y-1">
                          {stickerObjects.map((obj) => (
                            <button
                              key={obj.id}
                              type="button"
                              onClick={() => setSelectedTextObjectId(obj.id)}
                              className={`w-full rounded-[8px] border px-2 py-1 text-left ${selectedTextObjectId === obj.id ? "border-pink-300/55 bg-pink-500/20 text-pink-100" : "border-white/10 bg-white/5 text-white/75"}`}
                            >
                              <span className="mr-2 text-sm leading-none">{obj.text}</span>
                              <span>{Math.round(obj.startMs)}ms - {Math.round(obj.endMs)}ms</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedStickerObject ? (
                        <>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { label: "Top", x: 50, y: 16 },
                              { label: "Center", x: 50, y: 50 },
                              { label: "Bottom", x: 50, y: 84 },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => updateTextObject(selectedStickerObject.id, { x: preset.x, y: preset.y })}
                                className="rounded-[8px] border border-pink-300/30 bg-pink-500/12 px-2 py-1 text-pink-100 hover:bg-pink-500/20"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          <label className="block">
                            <span className="text-white/65">Size ({Math.round(selectedStickerObject.fontSize)}px)</span>
                            <input
                              type="range"
                              min={24}
                              max={160}
                              value={selectedStickerObject.fontSize}
                              onChange={(event) => updateTextObject(selectedStickerObject.id, { fontSize: Number(event.target.value) })}
                              className="mt-1 w-full"
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 4: SPECIALIZED PANELS (Edit: Adjust, Mask, Overlay, Opacity, Reverse, Freeze) */}
          {!activeQuickTool && activeMainRibbonTool === "Edit" && activeEditRibbonTool && (
            <div className="mb-3 space-y-2 rounded-[10px] border border-fuchsia-300/20 bg-fuchsia-500/8 p-2.5">
              {/* ADJUST PANEL */}
              {activeEditRibbonTool === "Adjust" && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "brightness", label: "Brightness", min: 20, max: 220, value: quickEditSettings.brightness },
                    { key: "contrast", label: "Contrast", min: 20, max: 220, value: quickEditSettings.contrast },
                    { key: "saturation", label: "Saturation", min: 0, max: 220, value: quickEditSettings.saturation },
                    { key: "brilliance", label: "Brilliance", min: 20, max: 220, value: quickEditSettings.brilliance },
                    { key: "sharpen", label: "Sharpness", min: 0, max: 100, value: quickEditSettings.sharpen },
                    { key: "hue", label: "HSL (Hue)", min: -180, max: 180, value: quickEditSettings.hue },
                    { key: "shadow", label: "Shadow", min: 0, max: 100, value: quickEditSettings.shadow },
                    { key: "temperature", label: "Temp", min: -100, max: 100, value: quickEditSettings.temperature },
                    { key: "tint", label: "Tint", min: -100, max: 100, value: quickEditSettings.tint },
                    { key: "fade", label: "Fade", min: 0, max: 100, value: quickEditSettings.fade },
                    { key: "vignette", label: "Vignette", min: 0, max: 100, value: quickEditSettings.vignette },
                    { key: "grain", label: "Grain", min: 0, max: 100, value: quickEditSettings.grain },
                  ].map((control) => (
                    <label key={control.key} className="rounded-[10px] border border-white/12 bg-black/28 px-2 py-1.5 cursor-pointer hover:bg-black/35">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-fuchsia-100/85 font-medium">
                        <span>{control.label}</span>
                        <span>{control.value}</span>
                      </div>
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        value={control.value}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          updateQuickEdits({ [control.key]: value } as Partial<QuickEditSettings>);
                          applyPatchToTimelineTools({ [control.key]: value });
                        }}
                        className="w-full"
                      />
                    </label>
                  ))}
                </div>
              )}

              {/* MASK PANEL */}
              {activeEditRibbonTool === "Mask" && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {(["none", "line", "mirror", "circle", "rectangle", "text"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMaskMode(option);
                        applyPatchToTimelineTools({ maskMode: option });
                      }}
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] transition-colors capitalize ${maskMode === option ? "border-fuchsia-200/70 bg-fuchsia-500/20 text-fuchsia-50" : "border-fuchsia-300/30 bg-black/30 text-fuchsia-100/78 hover:bg-black/40"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {/* OVERLAY PANEL */}
              {activeEditRibbonTool === "Overlay" && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {([
                    ["mainTrack", "Main Track"],
                    ["reverse", "Reverse"],
                    ["freeze", "Freeze"],
                    ["mask", "Mask"],
                    ["opacity", "Opacity"],
                    ["layers", "Layers"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setOverlayMode(value);
                        applyPatchToTimelineTools({ overlayMode: value });
                      }}
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] transition-colors ${overlayMode === value ? "border-fuchsia-200/70 bg-fuchsia-500/20 text-fuchsia-50" : "border-fuchsia-300/30 bg-black/30 text-fuchsia-100/78 hover:bg-black/40"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* OPACITY PANEL */}
              {activeEditRibbonTool === "Opacity" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-fuchsia-100 font-medium">
                    <span>Opacity Control</span>
                    <span>{clipOpacityPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={clipOpacityPercent}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setClipOpacityPercent(value);
                      applyPatchToTimelineTools({ opacity: value });
                    }}
                    className="w-full"
                  />
                </div>
              )}

              {/* REVERSE/FREEZE PANEL */}
              {(activeEditRibbonTool === "Reverse" || activeEditRibbonTool === "Freeze") && (
                <div className="text-[11px] text-fuchsia-100/82 space-y-1.5">
                  <p className="font-medium text-fuchsia-100">{activeEditRibbonTool}</p>
                  <p className="text-fuchsia-100/75 text-[10px]">Apply to commit this behavior to selected clip{applyToolsToAllClips ? "s" : ""}.</p>
                  {activeEditRibbonTool === "Freeze" && (
                    <button
                      type="button"
                      onClick={() => {
                        const freezeAtSec = Math.max(0, (previewPlayheadMs - (activeDockTimelineEntry?.clampedSnapMs ?? 0)) / 1000);
                        applyPatchToTimelineTools({ freezeAtSec });
                      }}
                      className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[10px] text-white/85 hover:bg-white/12"
                    >
                      🎬 Capture Freeze Frame
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 5: FOOTER (Apply/Reset/Close Actions) */}
          <div className="border-t border-white/10 pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveQuickTool(null);
                setActiveMainRibbonTool(null);
              }}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] text-white/70 hover:bg-white/8 transition-colors"
            >
              Close Tools
            </button>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={resetActiveRibbonFeature}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] text-white/75 hover:bg-white/8 transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyActiveRibbonFeature}
                disabled={!selectedTimelineClipId}
                className="rounded-full border border-cyan-300/50 bg-cyan-400/15 px-3 py-1 text-[10px] text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_12px_rgba(34,211,238,0.2)]"
              >
                ✓ Apply
              </button>
            </div>
          </div>
        </div>
            <div className="mb-1 flex items-center gap-2">
              <button
                onClick={togglePlayback}
                className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <span className="text-[11px] text-white/60">
                {(previewPlayheadMs / 1000).toFixed(1)}s / {(totalDurationMs / 1000).toFixed(1)}s
              </span>
              <div className="ml-auto flex items-center gap-0.5">
                <button
                  onClick={zoomOut}
                  disabled={timelineZoom <= 1}
                  className="rounded-[7px] border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] leading-none text-white/60 disabled:opacity-30"
                  title="Zoom out"
                >
                  −
                </button>
                <span className="min-w-[22px] text-center text-[10px] text-white/40">{timelineZoom}×</span>
                <button
                  onClick={zoomIn}
                  disabled={timelineZoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  className="rounded-[7px] border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] leading-none text-white/60 disabled:opacity-30"
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/55">
                <span>Master Timeline Zoom</span>
                <span>{timelineZoom}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={16}
                step={1}
                value={timelineZoom}
                onChange={(event) => setTimelineZoom(clamp(Number(event.target.value), 1, 16))}
                className="w-full"
              />
            </div>

            <div className="relative">
              <input
                type="range"
                min={0}
                max={totalDurationMs}
                value={previewPlayheadMs}
                onChange={(event) => {
                  setPreviewPlayheadMs(Number(event.target.value));
                  setIsPlaying(false);
                }}
                className="w-full"
              />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                {normalizedCutPoints.map((point) => (
                  <span
                    key={`marker-${point}`}
                    className="pointer-events-none absolute h-3 w-0.5 bg-fuchsia-300/80 shadow-[0_0_8px_rgba(217,70,239,0.7)]"
                    style={{ left: `${(point / Math.max(1, totalDurationMs)) * 100}%` }}
                  />
                ))}
                {sortedDockTimelineAssets.map((entry) => (
                  <span
                    key={`dock-marker-${entry.id}`}
                    onMouseEnter={() => setHoveredDockTimelineAssetId(entry.id)}
                    onMouseLeave={() => setHoveredDockTimelineAssetId((current) => (current === entry.id ? "" : current))}
                    onClick={() => {
                      setPreviewPlayheadMs(entry.clampedSnapMs);
                      setIsPlaying(false);
                    }}
                    className={`absolute h-4 w-0.5 cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.8)] ${entry.kind === "audio" ? "bg-emerald-300/95" : entry.kind === "logo" ? "bg-fuchsia-300/95" : "bg-cyan-300/95"}`}
                    style={{ left: `${(entry.clampedSnapMs / Math.max(1, totalDurationMs)) * 100}%` }}
                  />
                ))}
              </div>
            </div>

            <div ref={timelineViewportRef} className="relative mt-1 overflow-x-auto rounded-md touch-pan-x">
              <div ref={timelineInnerRef} style={{ width: `${timelineZoom * 100}%`, minWidth: "100%" }} className="relative">
                <div
                  className="relative h-4 cursor-crosshair touch-none rounded-md border border-white/10 bg-black/25"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const el = e.currentTarget;
                    el.setPointerCapture(e.pointerId);
                    const rect = el.getBoundingClientRect();
                    const ms = clamp(Math.round(((e.clientX - rect.left) / rect.width) * totalDurationMs), 0, totalDurationMs);
                    setPreviewPlayheadMs(ms);
                    setIsPlaying(false);
                    rulerPointerRef.current = { pointerId: e.pointerId };
                  }}
                  onPointerMove={(e) => {
                    const ref = rulerPointerRef.current;
                    if (!ref || ref.pointerId !== e.pointerId) return;
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const ms = clamp(Math.round(((e.clientX - rect.left) / rect.width) * totalDurationMs), 0, totalDurationMs);
                    setPreviewPlayheadMs(ms);
                    setIsPlaying(false);
                  }}
                  onPointerUp={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    rulerPointerRef.current = null;
                  }}
                  onPointerCancel={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    rulerPointerRef.current = null;
                  }}
                >
                  {miniRulerTicks.map((tick) => (
                    <span
                      key={`ruler-${tick.ms}`}
                      className={`absolute top-0 w-px ${tick.major ? "h-4 bg-white/40" : "h-2 bg-white/25"}`}
                      style={{ left: `${(tick.ms / Math.max(1, totalDurationMs)) * 100}%` }}
                      title={formatMsLabel(tick.ms)}
                    />
                  ))}
                  {/* Draggable playhead */}
                  <span
                    className="absolute top-0 h-4 w-3 -translate-x-1/2 cursor-ew-resize touch-none"
                    style={{ left: `${(previewPlayheadMs / Math.max(1, totalDurationMs)) * 100}%` }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                      const inner = timelineInnerRef.current;
                      if (!inner) return;
                      const rect = inner.getBoundingClientRect();
                      const ms = clamp(Math.round(((e.clientX - rect.left) / rect.width) * totalDurationMs), 0, totalDurationMs);
                      setPreviewPlayheadMs(ms);
                      setIsPlaying(false);
                    }}
                    onPointerUp={(e) => {
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }
                    }}
                    onPointerCancel={(e) => {
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-x-1/2 top-0 h-4 w-px -translate-x-1/2 bg-fuchsia-300 shadow-[0_0_6px_rgba(217,70,239,0.9)]"
                    />
                  </span>
                </div>

            {sortedDockTimelineAssets.length > 0 || (activeMainRibbonTool === "Captions" && segments.length > 0) || (activeMainRibbonTool === "Text" && textObjects.length > 0) ? (
              <div className="mt-2 space-y-1.5">
                {dockTimelineLanes.map((lane) => {
                  // Logo/Overlay lane: only show when Edit tool is active
                  if (lane.key === "overlay" && activeMainRibbonTool !== "Edit") return null;
                  // Audio lane: only show when Sound tool is active
                  if (lane.key === "audio" && activeMainRibbonTool !== "Sound") return null;
                  if (lane.entries.length === 0) return null;
                  return (
                    <div key={`lane-${lane.key}`}>
                    <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-white/55">{lane.label}</p>
                    <div className={`relative h-10 rounded-lg border ${lane.accent}`}>
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/10" />
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10" />
                      <span
                        className="pointer-events-none absolute inset-y-0 w-px bg-fuchsia-300/85 shadow-[0_0_5px_rgba(217,70,239,0.78)]"
                        style={{ left: `${(previewPlayheadMs / Math.max(1, totalDurationMs)) * 100}%` }}
                      />
                      {lane.entries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            setDraggingDockTimelineAssetId(entry.id);
                            dockDragStartRef.current = { assetId: entry.id, x: event.clientX, moved: false };
                            event.currentTarget.setPointerCapture(event.pointerId);
                          }}
                          onPointerMove={(event) => {
                            if (draggingDockTimelineAssetId !== entry.id || !event.currentTarget.hasPointerCapture(event.pointerId)) {
                              return;
                            }
                            const inner = timelineInnerRef.current;
                            if (!inner) return;
                            const rect = inner.getBoundingClientRect();
                            const ratio = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
                            const nextMs = ratio * totalDurationMs;
                            const dragStart = dockDragStartRef.current;
                            if (dragStart && dragStart.assetId === entry.id && Math.abs(event.clientX - dragStart.x) > 4) {
                              dockDragStartRef.current = { ...dragStart, moved: true };
                            }
                            updateDockTimelineEntrySnap(entry.id, nextMs);
                            setHoveredDockTimelineAssetId(entry.id);
                          }}
                          onPointerUp={(event) => {
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                            const dragStart = dockDragStartRef.current;
                            if (dragStart && dragStart.assetId === entry.id && dragStart.moved) {
                              recentlyDraggedDockAssetRef.current = { assetId: entry.id, at: Date.now() };
                            }
                            dockDragStartRef.current = null;
                            setDraggingDockTimelineAssetId("");
                          }}
                          onPointerCancel={(event) => {
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                            dockDragStartRef.current = null;
                            setDraggingDockTimelineAssetId("");
                          }}
                          onMouseEnter={() => setHoveredDockTimelineAssetId(entry.id)}
                          onMouseLeave={() => setHoveredDockTimelineAssetId((current) => (current === entry.id ? "" : current))}
                          onClick={() => {
                            const recentlyDragged = recentlyDraggedDockAssetRef.current;
                            if (recentlyDragged && recentlyDragged.assetId === entry.id && Date.now() - recentlyDragged.at < 300) {
                              return;
                            }
                            setPreviewPlayheadMs(entry.clampedSnapMs);
                            setIsPlaying(false);
                            setHoveredDockTimelineAssetId(entry.id);
                            setSelectedTimelineClipId(entry.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ clipId: entry.id, x: e.clientX, y: e.clientY });
                            setSelectedTimelineClipId(entry.id);
                          }}
                          className={`absolute top-1/2 h-8 -translate-y-1/2 touch-none overflow-hidden rounded-md border ${
                            selectedTimelineClipId === entry.id
                              ? "border-cyan-300/90 shadow-[0_0_14px_rgba(34,211,238,0.4)]"
                              : hoveredDockTimelineAssetId === entry.id
                                ? "border-cyan-200/80 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                                : "border-white/15"
                          }`}
                          style={{
                            left: `${(entry.clampedSnapMs / Math.max(1, totalDurationMs)) * 100}%`,
                            minWidth: "44px",
                            width: `${(entry.durationMs / Math.max(1, totalDurationMs)) * 100}%`,
                          }}
                          title={`${lane.label} • ${entry.fileName}`}
                        >
                          {lane.key === "audio" ? (
                            <div className="flex h-full items-end gap-0.5 bg-black/45 px-0.5 pb-0.5">
                              {buildWaveformHeights(entry.fileName).map((height, waveIndex) => (
                                <span
                                  key={`wave-${entry.id}-${waveIndex}`}
                                  className="w-0.5 rounded-t bg-emerald-300/90"
                                  style={{ height: `${height}%` }}
                                />
                              ))}
                            </div>
                          ) : entry.mimeType.startsWith("video/") ? (
                            <video src={entry.publicUrl} className="h-full w-full object-cover" muted playsInline />
                          ) : entry.mimeType.startsWith("image/") ? (
                            <img src={entry.publicUrl} alt={entry.fileName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-black/40 text-[9px] uppercase tracking-[0.12em] text-cyan-100/85">
                              {lane.key}
                            </div>
                          )}
                          <span className="pointer-events-none absolute left-0 top-0 rounded-br-sm bg-black/60 px-0.5 text-[7px] text-white/85">{(entry.durationMs / 1000).toFixed(1)}s</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeDockTimelineEntry(entry.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                removeDockTimelineEntry(entry.id);
                              }
                            }}
                            className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-bl-sm bg-black/65 text-[9px] leading-none text-white/85"
                            title="Remove asset"
                          >
                            x
                          </span>
                          {/* Left resize handle (from resize-controls pattern) */}
                          <span
                            className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize touch-none rounded-l-sm bg-white/0 hover:bg-white/20"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                              event.currentTarget.setPointerCapture(event.pointerId);
                              clipResizeDragRef.current = { id: entry.id, edge: "left", startX: event.clientX, startSnapMs: entry.snapMs, startDurationMs: entry.durationMs };
                              setResizingClipId(entry.id);
                            }}
                            onPointerMove={(event) => {
                              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                              const drag = clipResizeDragRef.current;
                              if (!drag || drag.id !== entry.id) return;
                              const inner = timelineInnerRef.current;
                              if (!inner) return;
                              const innerWidth = inner.getBoundingClientRect().width;
                              const deltaMs = ((event.clientX - drag.startX) / innerWidth) * totalDurationMs;
                              updateDockTimelineEntryDuration(entry.id, drag.startSnapMs + deltaMs, drag.startDurationMs - deltaMs);
                            }}
                            onPointerUp={(event) => {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                              clipResizeDragRef.current = null;
                              setResizingClipId("");
                            }}
                            onPointerCancel={(event) => {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                              clipResizeDragRef.current = null;
                              setResizingClipId("");
                            }}
                          />
                          {/* Right resize handle (from resize-controls pattern) */}
                          <span
                            className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize touch-none rounded-r-sm bg-white/0 hover:bg-white/20"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                              event.currentTarget.setPointerCapture(event.pointerId);
                              clipResizeDragRef.current = { id: entry.id, edge: "right", startX: event.clientX, startSnapMs: entry.snapMs, startDurationMs: entry.durationMs };
                              setResizingClipId(entry.id);
                            }}
                            onPointerMove={(event) => {
                              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                              const drag = clipResizeDragRef.current;
                              if (!drag || drag.id !== entry.id) return;
                              const inner = timelineInnerRef.current;
                              if (!inner) return;
                              const innerWidth = inner.getBoundingClientRect().width;
                              const deltaMs = ((event.clientX - drag.startX) / innerWidth) * totalDurationMs;
                              updateDockTimelineEntryDuration(entry.id, drag.startSnapMs, drag.startDurationMs + deltaMs);
                            }}
                            onPointerUp={(event) => {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                              clipResizeDragRef.current = null;
                              setResizingClipId("");
                            }}
                            onPointerCancel={(event) => {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                              clipResizeDragRef.current = null;
                              setResizingClipId("");
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  );
                })}

                {/* Captions Lane — visible only when Captions tool is active */}
                {activeMainRibbonTool === "Captions" && segments.length > 0 && (
                  <div>
                    <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-violet-300/70">Captions Track</p>
                    <div className="relative h-10 rounded-lg border border-violet-300/30 bg-violet-400/8">
                      <span className="pointer-events-none absolute inset-y-0 w-px bg-cyan-300/85 shadow-[0_0_5px_rgba(34,211,238,0.75)]" style={{ left: `${(previewPlayheadMs / Math.max(1, totalDurationMs)) * 100}%` }} />
                      {segments.map((segment) => {
                        const startMs = segmentOverrides[segment.id]?.startMs ?? segment.startMs;
                        const endMs = segmentOverrides[segment.id]?.endMs ?? segment.endMs;
                        const isActive = selectedSegmentId === segment.id;
                        return (
                          <button
                            key={segment.id}
                            type="button"
                            onClick={() => { setSelectedSegmentId(segment.id); setPreviewPlayheadMs(startMs); }}
                            className={`absolute top-1/2 h-8 -translate-y-1/2 overflow-hidden rounded-md border text-[8px] px-1 text-white/80 ${isActive ? "border-violet-300/90 bg-violet-500/40 shadow-[0_0_10px_rgba(167,139,250,0.4)]" : "border-violet-300/35 bg-violet-500/20 hover:bg-violet-500/30"}`}
                            style={{ left: `${(startMs / Math.max(1, totalDurationMs)) * 100}%`, width: `${Math.max(2, ((endMs - startMs) / Math.max(1, totalDurationMs)) * 100)}%`, minWidth: "24px" }}
                            title={segment.text}
                          >
                            <span className="truncate block leading-none mt-1">{segment.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Text Lane — visible only when Text tool is active */}
                {activeMainRibbonTool === "Text" && textObjects.length > 0 && (
                  <div>
                    <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-amber-300/70">Text Layer</p>
                    <div className="relative h-10 rounded-lg border border-amber-300/30 bg-amber-400/8">
                      <span className="pointer-events-none absolute inset-y-0 w-px bg-cyan-300/85 shadow-[0_0_5px_rgba(34,211,238,0.75)]" style={{ left: `${(previewPlayheadMs / Math.max(1, totalDurationMs)) * 100}%` }} />
                      {textObjects.map((textObj) => {
                        const isActive = selectedTextObjectId === textObj.id;
                        return (
                          <button
                            key={textObj.id}
                            type="button"
                            onClick={() => { setSelectedTextObjectId(textObj.id); setPreviewPlayheadMs(textObj.startMs); }}
                            className={`absolute top-1/2 h-8 -translate-y-1/2 overflow-hidden rounded-md border text-[8px] px-1 text-white/80 ${isActive ? "border-amber-300/90 bg-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)]" : "border-amber-300/35 bg-amber-500/20 hover:bg-amber-500/30"}`}
                            style={{ left: `${(textObj.startMs / Math.max(1, totalDurationMs)) * 100}%`, width: `${Math.max(2, ((textObj.endMs - textObj.startMs) / Math.max(1, totalDurationMs)) * 100)}%`, minWidth: "24px" }}
                            title={textObj.text}
                          >
                            <span className="truncate block leading-none mt-1">{textObj.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={resetTimeline}
                className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75"
              >
                <span className="caption-neon-text">Reset</span>
              </button>
              <button
                type="button"
                onClick={restoreSegments}
                className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75"
              >
                <span className="caption-neon-text">Restore All</span>
              </button>
            </div>

        {deletedSegments.length > 0 ? (
          <div className="mt-2 space-y-1 rounded-[10px] border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Deleted Segments</p>
            {deletedSegments.slice(0, 6).map((segment) => (
              <div key={segment.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-white/70">{segment.text}</span>
                <button
                  onClick={() => restoreSingleSegment(segment.id)}
                  className="rounded border border-cyan-300/20 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] text-cyan-100"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Clip Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 rounded-lg border border-white/20 bg-black/95 shadow-lg overflow-hidden"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={() => {
              if (contextMenu.clipId) duplicateClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-2 text-sm text-white/80 hover:bg-white/10 text-left"
          >
            Duplicate
          </button>
          <button
            onClick={() => {
              if (contextMenu.clipId) copyClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-2 text-sm text-white/80 hover:bg-white/10 text-left border-t border-white/10"
          >
            Copy
          </button>
          {copiedClipId && (
            <button
              onClick={() => {
                pasteClip();
                setContextMenu(null);
              }}
              className="block w-full px-3 py-2 text-sm text-white/80 hover:bg-white/10 text-left border-t border-white/10"
            >
              Paste
            </button>
          )}
          <button
            onClick={() => {
              if (contextMenu.clipId) {
                removeDockTimelineEntry(contextMenu.clipId);
                setSelectedTimelineClipId('');
              }
              setContextMenu(null);
            }}
            className="block w-full px-3 py-2 text-sm text-red-400/80 hover:bg-red-500/20 text-left border-t border-white/10"
          >
            Delete
          </button>
        </div>
      )}
    </section>
  );
}

function SegmentBlock({
  segment,
  style,
  preset,
  decoration,
  fontFamilyOverride,
  isActive,
  scale,
  previewRef,
  onSelect,
  onDragStart,
  onDragMove,
  onResizeWidth,
  onScale,
  mirrorX,
  mirrorY,
  decorationsAnimated,
  decorationDensity,
  decorationSpeed,
  onDragEnd,
}: {
  segment: CaptionSegment;
  style: CaptionManualStyle;
  preset: CaptionPreset | undefined;
  decoration: CaptionDecoration | undefined;
  fontFamilyOverride?: string;
  isActive: boolean;
  scale: number;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onDragStart: () => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onResizeWidth: (width: number) => void;
  onScale: (deltaScale: number, absoluteScale: number) => void;
  mirrorX: boolean;
  mirrorY: boolean;
  decorationsAnimated: boolean;
  decorationDensity: number;
  decorationSpeed: number;
  onDragEnd: () => void;
}) {
  const align = segment.align;
  const textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
  const xPercent = segment.x * 100;
  const yPercent = segment.y * 100;
  const widthPercent = segment.width * 100;
  const mirrorScaleX = mirrorX ? -1 : 1;
  const mirrorScaleY = mirrorY ? -1 : 1;
  const baseFontSize = segment.fontSize ?? (segment.isPunch ? style.fontSize + 8 : style.fontSize) * scale;
  const fitScale = estimateFontFitScale(segment.text, widthPercent);
  const computedFontSize = Math.max(12, baseFontSize * fitScale);

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(scale);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const scaleStartRef = useRef<{ y: number; scale: number } | null>(null);

  const onPinchMove = (event: { pointerId: number; clientX: number; clientY: number }) => {
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size !== 2) {
      return;
    }

    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchStartDistanceRef.current <= 0) {
      pinchStartDistanceRef.current = Math.max(1, distance);
      pinchStartScaleRef.current = scale;
      return;
    }

    const absolute = pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current);
    onScale(distance / pinchStartDistanceRef.current, absolute);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelect();
        // Capture the offset between the pointer and the segment's current center
        // so dragging maintains position rather than jumping to pointer.
        const pr = previewRef.current?.getBoundingClientRect();
        if (pr && pr.width > 0 && pr.height > 0) {
          dragOffsetRef.current = {
            x: event.clientX - (pr.left + segment.x * pr.width),
            y: event.clientY - (pr.top + segment.y * pr.height),
          };
        } else {
          dragOffsetRef.current = { x: 0, y: 0 };
        }
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointersRef.current.size === 2) {
          const [a, b] = [...pointersRef.current.values()];
          pinchStartDistanceRef.current = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
          pinchStartScaleRef.current = scale;
        }
        onDragStart();
        // Don't move on initial pointer-down — only move on actual pointer movement.
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          onPinchMove(event);
          if (pointersRef.current.size < 2) {
            onDragMove(
              event.clientX - dragOffsetRef.current.x,
              event.clientY - dragOffsetRef.current.y,
            );
          }
        }
      }}
      onPointerUp={(event) => {
        pointersRef.current.delete(event.pointerId);
        if (pointersRef.current.size < 2) {
          pinchStartDistanceRef.current = 0;
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        onDragEnd();
      }}
      onPointerCancel={() => {
        pointersRef.current.clear();
        pinchStartDistanceRef.current = 0;
        onDragEnd();
      }}
      style={{
        position: "absolute",
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        width: `${widthPercent}%`,
        transform: `translate(-50%, -50%) scale(${mirrorScaleX}, ${mirrorScaleY})`,
        textAlign,
        color: style.textGradient ? "transparent" : withAlpha(style.textColor, style.textOpacity),
        fontFamily: preset
          ? `${fontFamilyOverride ? `"${fontFamilyOverride}"` : preset.fontFamily}, ${preset.fallbackFonts.join(", ")}`
          : fontFamilyOverride
            ? `"${fontFamilyOverride}", system-ui, sans-serif`
            : "inherit",
        fontWeight: preset?.fontWeight ?? 700,
        fontSize: computedFontSize,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: preset?.textTransform,
        WebkitTextStroke: `${style.strokeWidth}px ${withAlpha(style.strokeColor, style.strokeOpacity)}`,
        textShadow: `0 0 ${Math.max(1, style.glowIntensity / 2)}px ${withAlpha(style.glowColor, style.glowOpacity)}, 0 0 ${Math.max(1, style.shadowIntensity / 3)}px #000000`,
        background: style.backgroundGradient ?? withAlpha(style.backgroundColor, style.backgroundOpacity),
        borderRadius: 12,
        padding: "8px 10px",
        overflowWrap: "anywhere",
        whiteSpace: "pre-wrap",
        cursor: "grab",
        touchAction: "none",
        boxShadow: isActive ? "0 0 0 1px rgba(34,211,238,0.8), 0 0 26px rgba(34,211,238,0.35)" : undefined,
      }}
    >
      <CaptionDecorationLayer
        decoration={colorizeDecoration(decoration, style)}
        animated={decorationsAnimated}
        density={decorationDensity}
        speed={decorationSpeed}
      />

      <div
        className="relative z-10"
        style={style.textGradient ? {
          background: style.textGradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text" as "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        } : undefined}
      >
        {segment.text}
      </div>

      <div
        role="button"
        tabIndex={0}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          const previewRect = previewRef.current?.getBoundingClientRect();
          if (!previewRect || previewRect.width <= 0) return;
          resizeStartRef.current = {
            x: event.clientX,
            width: segment.width,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }
          const previewRect = previewRef.current?.getBoundingClientRect();
          const start = resizeStartRef.current;
          if (!previewRect || !start || previewRect.width <= 0) {
            return;
          }
          // Delta in preview-relative fraction — exact 1:1 mapping
          const delta = (event.clientX - start.x) / previewRect.width;
          onResizeWidth(start.width + delta * 2);
        }}
        onPointerUp={(event) => {
          resizeStartRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          resizeStartRef.current = null;
        }}
        className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/70 bg-cyan-300/80"
        style={{ touchAction: "none" }}
      />

      <div
        role="button"
        tabIndex={0}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          scaleStartRef.current = {
            y: event.clientY,
            scale,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }

          const start = scaleStartRef.current;
          if (!start) {
            return;
          }

          const delta = (start.y - event.clientY) / 160;
          onScale(delta, start.scale + delta);
        }}
        onPointerUp={(event) => {
          scaleStartRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          scaleStartRef.current = null;
        }}
        className="absolute -bottom-2 right-3 h-4 w-4 rounded-full border border-white/70 bg-fuchsia-300/80"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildWaveformHeights(seed: string, bars = 14) {
  const normalizedSeed = seed.trim() || "wave";
  return Array.from({ length: bars }, (_, index) => {
    const code = normalizedSeed.charCodeAt(index % normalizedSeed.length);
    return 20 + (code % 68);
  });
}

function formatMsLabel(ms: number) {
  const wholeSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(wholeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (wholeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function withAlpha(color: string, opacity: number) {
  const value = color.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    const hex = Math.round(clamp(opacity, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
    return `${value}${hex}`;
  }

  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    const hex = Math.round(clamp(opacity, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
    return `${value.slice(0, 7)}${hex}`;
  }

  return value;
}

function normalizeHex(value: string) {
  const match = value.trim().match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) {
    return "#22D3EE";
  }

  return match[0].slice(0, 7);
}

function extractAlpha(value: string) {
  const match = value.trim().match(/^#[0-9a-fA-F]{8}$/);
  if (!match) {
    return 1;
  }

  const alphaHex = match[0].slice(7, 9);
  return Number.parseInt(alphaHex, 16) / 255;
}

function resolveDecoration(
  preset: CaptionPreset | undefined,
  controls: {
    comicStyleMix: number;
    futuristicStyleMix: number;
    loveStyleMix: number;
  },
): CaptionDecoration | undefined {
  if (!preset?.decoration) {
    return preset?.decoration;
  }

  if (preset.category === "comic") {
    const baseType =
      preset.decoration.type === "comicThought" ||
      preset.decoration.type === "comicBubble" ||
      preset.decoration.type === "comicPunch" ||
      preset.decoration.type === "comicShatter" ||
      preset.decoration.type === "comicZap"
        ? preset.decoration.type
        : "comicBubble";

    const type =
      controls.comicStyleMix < 34
        ? "comicThought"
        : controls.comicStyleMix > 66
          ? "comicPunch"
          : baseType;
    return { ...preset.decoration, type };
  }

  if (preset.category === "futuristic") {
    const type = controls.futuristicStyleMix < 50 ? "metallicPanel" : "particles";
    const intensity = 0.6 + controls.futuristicStyleMix / 250;
    return { ...preset.decoration, type, intensity };
  }

  if (preset.category === "love") {
    const type = controls.loveStyleMix < 50 ? "stars" : "hearts";
    const intensity = 0.55 + controls.loveStyleMix / 220;
    return { ...preset.decoration, type, intensity };
  }

  return preset.decoration;
}

function colorizeDecoration(decoration: CaptionDecoration | undefined, style: CaptionManualStyle): CaptionDecoration | undefined {
  if (!decoration) {
    return decoration;
  }

  return {
    ...decoration,
    accentA: style.accentColor,
    accentB: style.strokeColor,
    accentC: style.glowColor,
  };
}

function buildJsonHeaders(token: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function estimateFontFitScale(text: string, widthPercent: number) {
  const charCount = Math.max(1, text.trim().length);
  const capacity = Math.max(10, widthPercent * 0.42);

  if (charCount <= capacity) {
    return 1;
  }

  return clamp(capacity / charCount, 0.6, 1);
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/5 p-2">
      <div className="flex items-center justify-between text-xs text-white/65">
        <span>{label}</span>
        <span>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

function modeClass(active: boolean) {
  return `rounded-[14px] border px-3 py-2 text-xs ${
    active ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/5 text-white/65"
  }`;
}

function quickEditSettingsEqual(left: QuickEditSettings, right: QuickEditSettings) {
  return (
    left.fadeInMs === right.fadeInMs &&
    left.fadeOutMs === right.fadeOutMs &&
    left.transitionType === right.transitionType &&
    left.transitionMs === right.transitionMs &&
    left.brightness === right.brightness &&
    left.contrast === right.contrast &&
    left.saturation === right.saturation &&
    left.temperature === right.temperature &&
    left.volume === right.volume &&
    left.voiceBoost === right.voiceBoost &&
    left.speed === right.speed &&
    left.zoom === right.zoom &&
    left.rotation === right.rotation &&
    left.vignette === right.vignette &&
    left.grain === right.grain &&
    left.sharpen === right.sharpen
  );
}

