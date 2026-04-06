export type InputType = "youtube" | "blog" | "transcript" | "idea" | "video";

export type PlanType = "free" | "pro";

export type SubscriptionStatus = "inactive" | "active" | "trialing" | "past_due";

export type SubscriptionPhase = "inactive" | "active" | "renewal_countdown" | "grace_period" | "on_hold";

export type OutputTab = "Scripts" | "Clips" | "Captions" | "Tweets" | "Overlays" | "Fonts";

export type Clip = {
  id: string;
  time: string;
  title: string;
  text: string;
  overlay: string;
  startMs?: number;
  endMs?: number;
  hookScore?: number;
  reason?: string;
};

export type MediaAnalysisSummary = {
  assetId: string;
  assetName: string;
  durationSeconds: number;
  hasMusic: boolean;
  musicConfidence: number;
  musicNote: string;
  exactScript: string;
  wordCount: number;
  suggestedClipCount: number;
  suggestedClips: Clip[];
};

export type Project = {
  id: string;
  name?: string;
  input: string;
  inputType: InputType;
  tone: string;
  platform: string;
  scripts: string[];
  hooks: string[];
  captions: string[];
  tweets: string[];
  thread: string[];
  overlays: string[];
  clips: Clip[];
  blogs: string[];
  fonts: string[];
  coverImageUrl?: string | null;
  sourceAssetId?: string | null;
  workspaceState?: {
    dockTimelineAssets?: DockTimelineAsset[];
    selectedClipIds?: string[];
    groupedClipIds?: string[];
    selectedBackgroundAssetId?: string;
    selectedLogoAssetId?: string;
    selectedAudioAssetId?: string;
    selectedVideoAssetId?: string;
    inputProjectWorkspaceExpanded?: boolean;
    inputOutputPackExpanded?: boolean;
    studioLoadedProjectExpanded?: boolean;
    studioAssetDockExpanded?: boolean;
    studioClipTimelineExpanded?: boolean;
    recommendedCaption?: string;
    recommendedCaptionPresetId?: string;
    recommendedFontFamily?: string;
    recommendedOverlay?: string;
  };
  analysis?: MediaAnalysisSummary | null;
  createdAt: string;
  updatedAt?: string;
};

export type GenerationResponse = Omit<Project, "id" | "createdAt">;

export type Entitlement = {
  userId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  canExport: boolean;
  lifecycle: SubscriptionLifecycle;
};

export type AuthIdentity = {
  userId: string;
  email: string | null;
  source: "supabase" | "local";
};

export type InvoiceSummary = {
  id: string;
  amountPaid: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  createdAt: string;
};

export type BillingSummary = {
  email: string | null;
  customerId: string | null;
  invoices: InvoiceSummary[];
  lifecycle: SubscriptionLifecycle;
};

export type SubscriptionLifecycle = {
  phase: SubscriptionPhase;
  renewalDate: string | null;
  warningStartsAt: string | null;
  gracePeriodEndsAt: string | null;
  holdEndsAt: string | null;
  deleteAt: string | null;
  daysUntilRenewal: number | null;
  daysLeftInGrace: number | null;
  daysLeftOnHold: number | null;
  canExport: boolean;
  notice: string | null;
  accountDeletionDue: boolean;
};

export type BillingProfile = {
  email: string;
  phone: string;
  dateOfBirth: string;
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type MediaAssetKind = "background" | "logo" | "audio" | "video";

export type DockTimelineAsset = {
  id: string;
  assetId: string;
  kind: MediaAssetKind;
  fileName: string;
  mimeType: string;
  publicUrl: string;
  snapMs: number;
  durationMs: number;
  createdAt: string;
  toolSettings?: Record<string, number | string | boolean>;
};

export type MediaAsset = {
  id: string;
  userId: string;
  kind: MediaAssetKind;
  fileName: string;
  mimeType: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
};

export type TranscriptionSegment = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
};

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

export type ExportJob = {
  id: string;
  userId: string;
  projectId: string;
  format: "json" | "txt" | "mp4";
  status: ExportJobStatus;
  engine: "ffmpeg-worker";
  commandPreview: string;
  outputUrl: string | null;
  backgroundAssetId: string | null;
  logoAssetId: string | null;
  audioAssetId: string | null;
  clipIds?: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
