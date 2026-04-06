import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BillingProfile, ExportJob, MediaAsset, PlanType, Project, SubscriptionStatus } from "@/lib/types";

type SubscriptionState = {
  plan: PlanType;
  status: SubscriptionStatus;
  trackingCode?: string;
  isOwner?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  renewalDate?: string;
  gracePeriodEndsAt?: string;
  deleteAt?: string;
  updatedAt?: string;
};

const projectsByUser = new Map<string, Project[]>();
const subscriptionsByUser = new Map<string, SubscriptionState>();
const jobsByUser = new Map<string, ExportJob[]>();
const mediaAssetsByUser = new Map<string, MediaAsset[]>();
const billingProfilesByUser = new Map<string, BillingProfile>();

const storePath = join(process.cwd(), ".limitlabs", "local-store.json");

type StoreSnapshot = {
  projectsByUser: Record<string, Project[]>;
  subscriptionsByUser: Record<string, SubscriptionState>;
  jobsByUser: Record<string, ExportJob[]>;
  mediaAssetsByUser: Record<string, MediaAsset[]>;
  billingProfilesByUser: Record<string, BillingProfile>;
};

function ensureLoaded() {
  projectsByUser.clear();
  subscriptionsByUser.clear();
  jobsByUser.clear();
  mediaAssetsByUser.clear();
  billingProfilesByUser.clear();

  if (!existsSync(storePath)) {
    return;
  }

  const parsed = JSON.parse(readFileSync(storePath, "utf8")) as StoreSnapshot;
  hydrateMap(projectsByUser, parsed.projectsByUser);
  hydrateMap(subscriptionsByUser, parsed.subscriptionsByUser);
  hydrateMap(jobsByUser, parsed.jobsByUser);
  hydrateMap(mediaAssetsByUser, parsed.mediaAssetsByUser);
  hydrateMap(billingProfilesByUser, parsed.billingProfilesByUser);
}

function persist() {
  const snapshot: StoreSnapshot = {
    projectsByUser: Object.fromEntries(projectsByUser.entries()),
    subscriptionsByUser: Object.fromEntries(subscriptionsByUser.entries()),
    jobsByUser: Object.fromEntries(jobsByUser.entries()),
    mediaAssetsByUser: Object.fromEntries(mediaAssetsByUser.entries()),
    billingProfilesByUser: Object.fromEntries(billingProfilesByUser.entries()),
  };

  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(snapshot, null, 2));
}

function hydrateMap<T>(target: Map<string, T>, source?: Record<string, T>) {
  for (const [key, value] of Object.entries(source ?? {})) {
    target.set(key, value);
  }
}

export function getMemoryProjects(userId: string): Project[] {
  ensureLoaded();
  return projectsByUser.get(userId) ?? [];
}

export function saveMemoryProject(userId: string, project: Project) {
  ensureLoaded();
  const current = getMemoryProjects(userId);
  projectsByUser.set(userId, [project, ...current]);
  persist();
}

export function setMemoryProjects(userId: string, projects: Project[]) {
  ensureLoaded();
  projectsByUser.set(userId, projects);
  persist();
}

export function getMemorySubscription(userId: string): SubscriptionState {
  ensureLoaded();
  return (
    subscriptionsByUser.get(userId) ?? {
      plan: "free",
      status: "inactive",
    }
  );
}

export function setMemorySubscription(userId: string, value: SubscriptionState) {
  ensureLoaded();
  subscriptionsByUser.set(userId, value);
  persist();
}

export function getMemoryJobs(userId: string): ExportJob[] {
  ensureLoaded();
  return jobsByUser.get(userId) ?? [];
}

export function saveMemoryJob(userId: string, job: ExportJob) {
  ensureLoaded();
  const current = getMemoryJobs(userId);
  jobsByUser.set(userId, [job, ...current]);
  persist();
}

export function setMemoryJobs(userId: string, jobs: ExportJob[]) {
  ensureLoaded();
  jobsByUser.set(userId, jobs);
  persist();
}

export function getMemoryMediaAssets(userId: string): MediaAsset[] {
  ensureLoaded();
  return mediaAssetsByUser.get(userId) ?? [];
}

export function saveMemoryMediaAsset(userId: string, asset: MediaAsset) {
  ensureLoaded();
  const current = getMemoryMediaAssets(userId);
  mediaAssetsByUser.set(userId, [asset, ...current]);
  persist();
}

export function deleteMemoryMediaAsset(userId: string, assetId: string): MediaAsset | null {
  ensureLoaded();
  const current = getMemoryMediaAssets(userId);
  const target = current.find((asset) => asset.id === assetId) ?? null;
  if (!target) {
    return null;
  }

  mediaAssetsByUser.set(userId, current.filter((asset) => asset.id !== assetId));
  persist();
  return target;
}

export function getMemoryBillingProfile(userId: string): BillingProfile | null {
  ensureLoaded();
  return billingProfilesByUser.get(userId) ?? null;
}

export function setMemoryBillingProfile(userId: string, profile: BillingProfile) {
  ensureLoaded();
  billingProfilesByUser.set(userId, profile);
  persist();
}

export function deleteMemoryUser(userId: string) {
  ensureLoaded();
  projectsByUser.delete(userId);
  subscriptionsByUser.delete(userId);
  jobsByUser.delete(userId);
  mediaAssetsByUser.delete(userId);
  billingProfilesByUser.delete(userId);
  persist();
}
