"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, Wand2 } from "lucide-react";
import { CaptionEditor } from "@/components/caption-studio/CaptionEditor";
import { MobileNav } from "@/components/MobileNav";
import { createClientId } from "@/lib/client-id";
import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { DockTimelineAsset, Entitlement, ExportJob, MediaAsset, MediaAssetKind, Project } from "@/lib/types";

const userStorageKey = "limitlabs8.user_id";
const mediaAccessKey = "limitlabs8.media_access_granted";
const selectedProjectStorageKeyPrefix = "limitlabs8.studio.selected_project";

type AuthUser = {
  id: string;
  email: string | null;
};

type DeviceMediaPickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<Array<{ getFile: () => Promise<File> }>>;
};

const defaultEntitlement: Entitlement = {
  userId: "",
  plan: "free",
  status: "inactive",
  canExport: false,
  lifecycle: deriveSubscriptionLifecycle({ plan: "free", status: "inactive" }),
};

export default function StudioMagicPage() {
  const [localUserId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const existing = localStorage.getItem(userStorageKey);
    if (existing) {
      return existing;
    }

    const created = createClientId();
    localStorage.setItem(userStorageKey, created);
    return created;
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [entitlement, setEntitlement] = useState<Entitlement>(defaultEntitlement);
  const [projects, setProjects] = useState<Project[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedBackgroundAssetId, setSelectedBackgroundAssetId] = useState("");
  const [selectedLogoAssetId, setSelectedLogoAssetId] = useState("");
  const [selectedAudioAssetId, setSelectedAudioAssetId] = useState("");
  const [selectedVideoAssetId, setSelectedVideoAssetId] = useState("");
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isQueueingRender, setIsQueueingRender] = useState(false);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);
  const [error, setError] = useState("");
  const [requestedProjectId, setRequestedProjectId] = useState("");
  const [hasDeviceMediaAccess, setHasDeviceMediaAccess] = useState(false);
  const [showMediaAccessPrompt, setShowMediaAccessPrompt] = useState(false);
  const [pendingUploadKind, setPendingUploadKind] = useState<MediaAssetKind | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [groupedClipIds, setGroupedClipIds] = useState<string[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoadedProjectExpanded, setIsLoadedProjectExpanded] = useState(false);
  const [isAssetDockExpanded, setIsAssetDockExpanded] = useState(false);
  const [isClipTimelineExpanded, setIsClipTimelineExpanded] = useState(false);
  const [captionTargetAssetId, setCaptionTargetAssetId] = useState("");
  const [previewTargetAssetId, setPreviewTargetAssetId] = useState("");
  const [dockTimelineAssets, setDockTimelineAssets] = useState<DockTimelineAsset[]>([]);
  const [assetActionAsset, setAssetActionAsset] = useState<MediaAsset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const autosaveProjectRef = useRef<Project | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAssetTapRef = useRef<{ assetId: string; at: number } | null>(null);
  const assetHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressAssetTapAssetIdRef = useRef<string>("");
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextProjectId = new URLSearchParams(window.location.search).get("projectId") ?? "";
    setRequestedProjectId(nextProjectId);
    setHasDeviceMediaAccess(window.localStorage.getItem(mediaAccessKey) === "true");
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setAuthUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? null } : null);
      setSessionToken(data.session?.access_token ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
      setSessionToken(session?.access_token ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const activeUserId = authUser?.id ?? localUserId;

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    void refreshEntitlement(activeUserId, sessionToken, setEntitlement);
    void refreshProjects(activeUserId, sessionToken, setProjects);
    void refreshExportJobs(activeUserId, sessionToken, setExportJobs);
    void refreshMediaAssets(activeUserId, sessionToken, setMediaAssets);
  }, [activeUserId, sessionToken]);

  useEffect(() => {
    return () => {
      if (assetHoldTimerRef.current) {
        clearTimeout(assetHoldTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!projects.length) {
      return;
    }

    const persistedProjectId =
      typeof window !== "undefined" && activeUserId
        ? window.localStorage.getItem(`${selectedProjectStorageKeyPrefix}:${activeUserId}`) ?? ""
        : "";

    if (requestedProjectId && projects.some((project) => project.id === requestedProjectId)) {
      setSelectedProjectId((current) => (current === requestedProjectId ? current : requestedProjectId));
      return;
    }

    if (persistedProjectId && projects.some((project) => project.id === persistedProjectId)) {
      setSelectedProjectId((current) => (current === persistedProjectId ? current : persistedProjectId));
      return;
    }

    if (!selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, requestedProjectId, selectedProjectId, activeUserId]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeUserId || !selectedProjectId) {
      return;
    }

    window.localStorage.setItem(`${selectedProjectStorageKeyPrefix}:${activeUserId}`, selectedProjectId);
  }, [activeUserId, selectedProjectId]);

  const latestProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects[0], [projects, selectedProjectId]);
  const availableClips = useMemo(() => {
    if (!latestProject?.clips?.length) {
      return [];
    }

    const limit = entitlement.plan === "pro" ? 10 : 3;
    return latestProject.clips.slice(0, limit);
  }, [latestProject, entitlement.plan]);
  const groupedClips = useMemo(() => {
    if (!latestProject?.clips?.length) {
      return [];
    }

    return latestProject.clips.filter((clip) => groupedClipIds.includes(clip.id));
  }, [groupedClipIds, latestProject]);
  const groupedCaptionSource = useMemo(() => {
    if (groupedClips.length === 0) {
      return "";
    }

    return groupedClips
      .map((clip, index) => `Clip ${index + 1} [${clip.time}]\n${clip.text}`)
      .join("\n\n----- CLIP BREAK -----\n\n");
  }, [groupedClips]);
  const finalClipEndMs = useMemo(() => {
    return resolveFinalClipEndMs(availableClips);
  }, [availableClips]);
  const backgroundAssets = mediaAssets.filter((asset) => asset.kind === "background");
  const logoAssets = mediaAssets.filter((asset) => asset.kind === "logo");
  const audioAssets = mediaAssets.filter((asset) => asset.kind === "audio");
  const videoAssets = mediaAssets.filter((asset) => asset.kind === "video");
  const recommendedCaption = latestProject?.workspaceState?.recommendedCaption ?? latestProject?.captions?.[0] ?? "";
  const recommendedPresetId = latestProject?.workspaceState?.recommendedCaptionPresetId ?? "";
  const recommendedFontFamily = latestProject?.workspaceState?.recommendedFontFamily ?? "";

  useEffect(() => {
    if (!latestProject) {
      autosaveProjectRef.current = null;
      return;
    }

    autosaveProjectRef.current = {
      ...latestProject,
      workspaceState: {
        ...latestProject.workspaceState,
        selectedClipIds,
        groupedClipIds,
        selectedBackgroundAssetId,
        selectedLogoAssetId,
        selectedAudioAssetId,
        selectedVideoAssetId,
        dockTimelineAssets,
        studioLoadedProjectExpanded: isLoadedProjectExpanded,
        studioAssetDockExpanded: isAssetDockExpanded,
        studioClipTimelineExpanded: isClipTimelineExpanded,
      },
      updatedAt: new Date().toISOString(),
    };
  }, [
    latestProject,
    selectedClipIds,
    groupedClipIds,
    selectedBackgroundAssetId,
    selectedLogoAssetId,
    selectedAudioAssetId,
    selectedVideoAssetId,
    dockTimelineAssets,
    isLoadedProjectExpanded,
    isAssetDockExpanded,
    isClipTimelineExpanded,
  ]);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setInterval(() => {
      if (!autosaveProjectRef.current) {
        return;
      }

      void saveProject(activeUserId, sessionToken, autosaveProjectRef.current, setProjects);
    }, 2500);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activeUserId, sessionToken]);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    const flushAutosave = () => {
      const snapshot = autosaveProjectRef.current;
      if (!snapshot) {
        return;
      }

      void fetch("/api/projects", {
        method: "POST",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({ userId: activeUserId, project: snapshot }),
        keepalive: true,
      }).catch(() => {
        // Best-effort flush for refresh/close; interval autosave remains primary.
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushAutosave();
      }
    };

    window.addEventListener("pagehide", flushAutosave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushAutosave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeUserId, sessionToken]);

  useEffect(() => {
    if (!latestProject?.workspaceState) {
      setSelectedVideoAssetId(latestProject?.sourceAssetId ?? "");
      setDockTimelineAssets([]);
      setIsLoadedProjectExpanded(false);
      setIsAssetDockExpanded(false);
      setIsClipTimelineExpanded(false);
      return;
    }

    setSelectedClipIds(latestProject.workspaceState.selectedClipIds ?? []);
    setGroupedClipIds(latestProject.workspaceState.groupedClipIds ?? []);
    setSelectedBackgroundAssetId(latestProject.workspaceState.selectedBackgroundAssetId ?? "");
    setSelectedLogoAssetId(latestProject.workspaceState.selectedLogoAssetId ?? "");
    setSelectedAudioAssetId(latestProject.workspaceState.selectedAudioAssetId ?? "");
    setSelectedVideoAssetId(latestProject.workspaceState.selectedVideoAssetId ?? latestProject.sourceAssetId ?? "");
    setDockTimelineAssets(latestProject.workspaceState.dockTimelineAssets ?? []);
    setIsLoadedProjectExpanded(latestProject.workspaceState.studioLoadedProjectExpanded ?? false);
    setIsAssetDockExpanded(latestProject.workspaceState.studioAssetDockExpanded ?? false);
    setIsClipTimelineExpanded(latestProject.workspaceState.studioClipTimelineExpanded ?? false);
  }, [latestProject?.id]);

  async function handleQueueRender() {
    if (!activeUserId || !latestProject) {
      return;
    }

    setIsQueueingRender(true);
    setError("");
    try {
      await saveProject(
        activeUserId,
        sessionToken,
        {
          ...latestProject,
          workspaceState: {
            ...latestProject.workspaceState,
            selectedClipIds,
            groupedClipIds,
            selectedBackgroundAssetId,
            selectedLogoAssetId,
            selectedAudioAssetId,
            selectedVideoAssetId,
            dockTimelineAssets,
            studioLoadedProjectExpanded: isLoadedProjectExpanded,
            studioAssetDockExpanded: isAssetDockExpanded,
            studioClipTimelineExpanded: isClipTimelineExpanded,
          },
          updatedAt: new Date().toISOString(),
        },
        setProjects,
      );

      const response = await fetch("/api/export/jobs", {
        method: "POST",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({
          userId: activeUserId,
          projectId: latestProject.id,
          backgroundAssetId: selectedBackgroundAssetId || null,
          logoAssetId: selectedLogoAssetId || null,
          audioAssetId: selectedAudioAssetId || null,
          clipIds: groupedClipIds.length > 0 ? groupedClipIds : selectedClipIds,
        }),
      });

      const payload = (await response.json()) as { job?: ExportJob; error?: string };
      if (!response.ok || !payload.job) {
        throw new Error(payload.error ?? "Unable to queue render.");
      }

      setExportJobs((current) => [payload.job!, ...current]);
    } catch {
      setError(entitlement.canExport ? "MP4 queue failed." : "MP4 export is blocked while the subscription is on hold.");
    } finally {
      setIsQueueingRender(false);
    }
  }

  async function handleAssetUpload(kind: MediaAssetKind, file: File | null) {
    if (!activeUserId || !file) {
      return;
    }

    setIsUploadingAsset(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("userId", activeUserId);
      formData.set("kind", kind);
      formData.set("file", file);

      const response = await fetch("/api/media-assets", {
        method: "POST",
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
        body: formData,
      });

      const payload = (await response.json()) as { asset?: MediaAsset; error?: string };
      if (!response.ok || !payload.asset) {
        throw new Error(payload.error ?? "Upload failed");
      }

      setMediaAssets((current) => [payload.asset!, ...current]);
      if (kind === "background") setSelectedBackgroundAssetId(payload.asset.id);
      if (kind === "logo") setSelectedLogoAssetId(payload.asset.id);
      if (kind === "audio") setSelectedAudioAssetId(payload.asset.id);
      if (kind === "video") setSelectedVideoAssetId(payload.asset.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Media upload failed.");
    } finally {
      setIsUploadingAsset(false);
    }
  }

  async function handleRetryPayment() {
    if (!activeUserId) {
      return;
    }

    setIsOpeningBillingPortal(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({ userId: activeUserId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to open billing portal.");
      }

      window.location.href = payload.url;
    } catch {
      setError("Unable to open billing portal for payment retry.");
    } finally {
      setIsOpeningBillingPortal(false);
    }
  }

  async function openDeviceMediaPicker(kind: MediaAssetKind) {
    if (typeof window === "undefined") {
      return;
    }

    const pickerWindow = window as DeviceMediaPickerWindow;
    if (pickerWindow.showOpenFilePicker) {
      try {
        const handles = await pickerWindow.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: false,
          types: [pickerType(kind)],
        });
        const file = await handles[0]?.getFile();
        await handleAssetUpload(kind, file ?? null);
        return;
      } catch {
        return;
      }
    }

    const input =
      kind === "background"
        ? backgroundInputRef.current
        : kind === "logo"
          ? logoInputRef.current
          : kind === "audio"
            ? audioInputRef.current
            : videoInputRef.current;
    input?.click();
  }

  async function requestDeviceMediaAccess(kind: MediaAssetKind) {
    if (!hasDeviceMediaAccess) {
      setPendingUploadKind(kind);
      setShowMediaAccessPrompt(true);
      return;
    }

    await openDeviceMediaPicker(kind);
  }

  async function confirmDeviceMediaAccess() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(mediaAccessKey, "true");
    }

    setHasDeviceMediaAccess(true);
    setShowMediaAccessPrompt(false);

    if (pendingUploadKind) {
      const nextKind = pendingUploadKind;
      setPendingUploadKind(null);
      await openDeviceMediaPicker(nextKind);
    }
  }

  function toggleClipSelection(clipId: string) {
    setSelectedClipIds((current) =>
      current.includes(clipId) ? current.filter((id) => id !== clipId) : [...current, clipId],
    );
  }

  function handleGroupSelectedClips() {
    if (selectedClipIds.length === 0) {
      return;
    }

    setGroupedClipIds(selectedClipIds);
  }

  async function sendAssetToCaptionStudio(asset: MediaAsset) {
    const importedDurationMs = await resolveDockAssetDurationMs(asset);
    setPreviewTargetAssetId(asset.id);
    setDockTimelineAssets((current) => {
      // Determine which lane this asset belongs to
      const isAudio = asset.kind === "audio" || asset.mimeType.startsWith("audio/");
      const isOverlay = asset.kind === "logo";

      // Find the last asset in this lane and calculate its end position
      let snapMs = 0;
      let maxEndMs = 0;

      current.forEach((entry) => {
        const entryIsAudio = entry.kind === "audio" || entry.mimeType.startsWith("audio/");
        const entryIsOverlay = entry.kind === "logo";

        // Check if this entry is in the same lane
        const isSameLane =
          (isAudio && entryIsAudio) ||
          (isOverlay && entryIsOverlay) ||
          (!isAudio && !isOverlay && !entryIsAudio && !entryIsOverlay);

        if (isSameLane) {
          const entryEndMs = entry.snapMs + entry.durationMs;
          if (entryEndMs > maxEndMs) {
            maxEndMs = entryEndMs;
            snapMs = entryEndMs;
          }
        }
      });

      const boundedSnapMs = finalClipEndMs > 0 ? Math.min(snapMs, finalClipEndMs) : snapMs;

      return [
        ...current,
        {
          id: createClientId(),
          assetId: asset.id,
          kind: asset.kind,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          publicUrl: asset.publicUrl,
          snapMs: boundedSnapMs,
          durationMs: importedDurationMs,
          createdAt: new Date().toISOString(),
        },
      ];
    });

    if (asset.kind === "background") setSelectedBackgroundAssetId(asset.id);
    if (asset.kind === "logo") setSelectedLogoAssetId(asset.id);
    if (asset.kind === "audio") {
      setSelectedAudioAssetId(asset.id);
      setCaptionTargetAssetId(asset.id);
    }
    if (asset.kind === "video") {
      setSelectedVideoAssetId(asset.id);
      setCaptionTargetAssetId(asset.id);
    }
  }

  function handleAssetTap(asset: MediaAsset) {
    const now = Date.now();
    const previous = lastAssetTapRef.current;
    const isDoubleTap = previous && previous.assetId === asset.id && now - previous.at <= 320;

    if (isDoubleTap) {
      void sendAssetToCaptionStudio(asset);
      lastAssetTapRef.current = null;
      return;
    }

    lastAssetTapRef.current = { assetId: asset.id, at: now };
  }

  function clearAssetHoldTimer() {
    if (!assetHoldTimerRef.current) {
      return;
    }

    clearTimeout(assetHoldTimerRef.current);
    assetHoldTimerRef.current = null;
  }

  function openAssetActions(asset: MediaAsset) {
    clearAssetHoldTimer();
    setAssetActionAsset(asset);
  }

  function downloadAsset(asset: MediaAsset) {
    if (typeof window === "undefined") {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = asset.publicUrl;
    anchor.download = asset.fileName;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function deleteAssetFromDock(asset: MediaAsset) {
    if (!activeUserId) {
      return;
    }

    setIsDeletingAsset(true);
    setError("");
    try {
      const response = await fetch("/api/media-assets", {
        method: "DELETE",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({ userId: activeUserId, assetId: asset.id }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete asset.");
      }

      setMediaAssets((current) => current.filter((entry) => entry.id !== asset.id));
      setDockTimelineAssets((current) => current.filter((entry) => entry.assetId !== asset.id));
      setSelectedBackgroundAssetId((current) => (current === asset.id ? "" : current));
      setSelectedLogoAssetId((current) => (current === asset.id ? "" : current));
      setSelectedAudioAssetId((current) => (current === asset.id ? "" : current));
      setSelectedVideoAssetId((current) => (current === asset.id ? "" : current));
      setCaptionTargetAssetId((current) => (current === asset.id ? "" : current));
      setPreviewTargetAssetId((current) => (current === asset.id ? "" : current));
      setAssetActionAsset(null);
    } catch {
      setError("Unable to delete selected asset.");
    } finally {
      setIsDeletingAsset(false);
    }
  }

  function moveSelectedClip(clipId: string, direction: "up" | "down") {
    if (!latestProject) {
      return;
    }

    const index = latestProject.clips.findIndex((clip) => clip.id === clipId);
    if (index < 0) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= latestProject.clips.length) {
      return;
    }

    const nextClips = [...latestProject.clips];
    const [moved] = nextClips.splice(index, 1);
    nextClips.splice(targetIndex, 0, moved);

    const patchedProject: Project = {
      ...latestProject,
      clips: nextClips,
      analysis: latestProject.analysis
        ? { ...latestProject.analysis, suggestedClips: nextClips }
        : latestProject.analysis,
      updatedAt: new Date().toISOString(),
    };

    setProjects((current) => current.map((project) => (project.id === patchedProject.id ? patchedProject : project)));
  }

  async function handleCreateNewProject() {
    if (!activeUserId) {
      return;
    }

    const project: Project = {
      id: createClientId(),
      name: newProjectName.trim() || `Studio Project ${projects.length + 1}`,
      input: "",
      inputType: "idea",
      tone: "Futuristic",
      platform: "TikTok",
      scripts: [],
      hooks: [],
      captions: [],
      tweets: [],
      thread: [],
      overlays: [],
      clips: [],
      blogs: [],
      fonts: [],
      coverImageUrl: null,
      sourceAssetId: null,
      analysis: null,
      workspaceState: {
        selectedClipIds: [],
        groupedClipIds: [],
        dockTimelineAssets: [],
        studioLoadedProjectExpanded: false,
        studioAssetDockExpanded: false,
        studioClipTimelineExpanded: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveProject(activeUserId, sessionToken, project, setProjects);
    setSelectedProjectId(project.id);
    setSelectedClipIds([]);
    setGroupedClipIds([]);
    setShowNewProjectModal(false);
    setNewProjectName("");
  }

  async function handleDeleteSelectedProject() {
    if (!activeUserId || !latestProject) {
      return;
    }

    const response = await fetch("/api/projects", {
      method: "DELETE",
      headers: buildHeaders(sessionToken),
      body: JSON.stringify({ userId: activeUserId, projectId: latestProject.id }),
    });

    if (!response.ok) {
      setError("Unable to delete selected project.");
      return;
    }

    const payload = (await response.json()) as { projects: Project[] };
    setProjects(payload.projects);
    setSelectedProjectId(payload.projects[0]?.id ?? "");
  }

  return (
    <>
      <style>{`
        @keyframes neonFloat1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(-20px, -30px) scale(1.1); opacity: 0.6; }
          50% { transform: translate(10px, 20px) scale(0.9); opacity: 0.8; }
          75% { transform: translate(-15px, 15px) scale(1.05); opacity: 0.5; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
        }
        @keyframes neonFloat2 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          33% { transform: translate(25px, -25px) scale(1.15); opacity: 0.7; }
          66% { transform: translate(-20px, 30px) scale(0.85); opacity: 0.4; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
        }
        @keyframes neonFloat3 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.25; }
          50% { transform: translate(-30px, 20px) rotate(180deg); opacity: 0.65; }
          100% { transform: translate(0, 0) rotate(360deg); opacity: 0.25; }
        }
        @keyframes neonGlow {
          0%, 100% { text-shadow: 0 0 8px rgba(6, 182, 212, 0.6), 0 0 16px rgba(6, 182, 212, 0.4), 0 0 24px rgba(6, 182, 212, 0.2); }
          50% { text-shadow: 0 0 16px rgba(6, 182, 212, 0.8), 0 0 32px rgba(6, 182, 212, 0.6), 0 0 48px rgba(6, 182, 212, 0.4); }
        }
        .neon-text {
          background: linear-gradient(90deg, #06b6d4, #8b5cf6, #d946ef, #06b6d4);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
          letter-spacing: 0.05em;
          animation: neonGlow 3s ease-in-out infinite;
        }
        .neon-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          border-radius: 28px;
          background: radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.08), transparent 40%),
                      radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.06), transparent 35%),
                      radial-gradient(circle at 15% 70%, rgba(217, 70, 239, 0.05), transparent 45%);
        }
        .neon-particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
        }
        .neon-particle-1 {
          width: 24px;
          height: 24px;
          top: 15%;
          left: 10%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.6), rgba(6, 182, 212, 0));
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.5), 0 0 24px rgba(6, 182, 212, 0.25);
          animation: neonFloat1 8s ease-in-out infinite, neonPulse 3s ease-in-out infinite 0.5s;
        }
        .neon-particle-2 {
          width: 32px;
          height: 32px;
          top: 45%;
          left: 5%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.5), rgba(139, 92, 246, 0));
          box-shadow: 0 0 16px rgba(139, 92, 246, 0.6), 0 0 32px rgba(139, 92, 246, 0.3);
          animation: neonFloat2 10s ease-in-out infinite, neonPulse 4s ease-in-out infinite 1s;
        }
        .neon-particle-3 {
          width: 20px;
          height: 20px;
          top: 70%;
          left: 15%;
          background: radial-gradient(circle, rgba(217, 70, 239, 0.55), rgba(217, 70, 239, 0));
          box-shadow: 0 0 10px rgba(217, 70, 239, 0.6), 0 0 20px rgba(217, 70, 239, 0.3);
          animation: neonFloat3 12s linear infinite, neonPulse 5s ease-in-out infinite 1.5s;
        }
        .neon-particle-4 {
          width: 28px;
          height: 28px;
          top: 25%;
          left: 20%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.45), rgba(6, 182, 212, 0));
          box-shadow: 0 0 14px rgba(6, 182, 212, 0.55), 0 0 28px rgba(6, 182, 212, 0.25);
          animation: neonFloat1 9s ease-in-out infinite 1s, neonPulse 3.5s ease-in-out infinite 2s;
        }
      `}</style>
      <div className="min-h-screen bg-[#02030a] px-4 py-5 text-white">
        <div className="mx-auto max-w-sm space-y-4 pb-24">
          <header
            className="neon-header relative rounded-[28px] border border-cyan-400/12 p-4 backdrop-blur-xl overflow-hidden"
            style={{
              backgroundImage:
                "linear-gradient(145deg, rgba(2, 6, 14, 0.5), rgba(5, 8, 18, 0.6)), url('/images/futuristic-limit-labs-logo.png')",
              backgroundSize: "contain",
              backgroundPosition: "right center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="neon-particle neon-particle-1" />
            <div className="neon-particle neon-particle-2" />
            <div className="neon-particle neon-particle-3" />
            <div className="neon-particle neon-particle-4" />
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">Studio Magic</h1>
                <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/60 bg-fuchsia-500/18 px-3 py-1.5 text-xs font-semibold text-fuchsia-50 shadow-[0_0_12px_rgba(217,70,239,0.45)] transition hover:bg-fuchsia-500/28 hover:shadow-[0_0_18px_rgba(217,70,239,0.6)]">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Home
                </Link>
              </div>
              <p className="mt-2 max-w-xs text-sm text-white/58">Asset Dock, Clip Timeline, <span className="neon-text">Studio</span>, and Render Queue in one workspace.</p>
            </div>
          </header>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}

        {!entitlement.canExport && entitlement.lifecycle.phase === "on_hold" ? (
          <section className="rounded-[22px] border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p>Exports are on hold because payment was not recovered. If payment is not made by the 30-day hold deadline, the account is deleted.</p>
            <p className="mt-2 text-xs text-rose-100/80">{entitlement.lifecycle.daysLeftOnHold ?? 0} day{entitlement.lifecycle.daysLeftOnHold === 1 ? "" : "s"} remain before deletion.</p>
            <button type="button" onClick={handleRetryPayment} disabled={isOpeningBillingPortal} className="mt-3 rounded-full border border-rose-100/20 bg-white/10 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
              {isOpeningBillingPortal ? "Opening Billing..." : "Retry Payment"}
            </button>
          </section>
        ) : null}

        <section className={`ll8-panel-shell ll8-panel-fuchsia rounded-[30px] border ${isLoadedProjectExpanded ? "p-4" : "px-3 py-2.5"}`}>
          <div className={`${isLoadedProjectExpanded ? "mb-3" : "mb-0"} flex items-center justify-between`}>
            <button
              type="button"
              onClick={() => setIsLoadedProjectExpanded((current) => !current)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white"
            >
              <span className="neon-text">Loaded Project</span>
              <ChevronDown className={`h-4 w-4 text-fuchsia-200 transition-transform duration-300 ${isLoadedProjectExpanded ? "rotate-180" : "rotate-0"}`} />
            </button>
            <span className="text-[10px] text-fuchsia-200/75">{projects.length} saved</span>
          </div>
          {isLoadedProjectExpanded ? latestProject ? (
            <>
              <div className="flex items-start gap-3">
                {latestProject.coverImageUrl ? (
                  <img src={latestProject.coverImageUrl} alt={latestProject.name ?? "Project cover"} className="h-16 w-16 rounded-xl border border-white/10 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] text-white/45">No image</div>
                )}
                <div>
                  <p className="text-sm font-medium text-white line-clamp-1">{latestProject.name || "Untitled Project"}</p>
                  <p className="mt-1 text-sm text-white/75 line-clamp-2">{latestProject.input || "No source text yet"}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-white/55">
                {latestProject.clips.length} clips • {latestProject.captions.length} captions • {formatRelativeDate(latestProject.createdAt)}
              </p>
            </>
          ) : (
            <p className="text-sm text-white/58">No saved project loaded yet. Generate one in Create or open one from Projects.</p>
          ) : null}
          {isLoadedProjectExpanded && projects.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`rounded-full border px-3 py-2 text-xs ${
                    latestProject?.id === project.id
                      ? "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
                      : "border-white/10 bg-white/5 text-white/65"
                  }`}
                >
                  {project.name || project.input.slice(0, 28) || "Untitled project"}
                </button>
              ))}
            </div>
          ) : null}
          {isLoadedProjectExpanded ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewProjectModal(true)}
              className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-medium text-fuchsia-100"
            >
              New Project
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteSelectedProject()}
              disabled={!latestProject}
              className="rounded-full border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-100 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
          ) : null}
        </section>

        <section className={`ll8-panel-shell ll8-panel-cyan rounded-[30px] border ${isAssetDockExpanded ? "p-4" : "px-3 py-2.5"}`}>
          <div className={`${isAssetDockExpanded ? "mb-3" : "mb-0"} flex items-center justify-between`}>
            <button
              type="button"
              onClick={() => setIsAssetDockExpanded((current) => !current)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white"
            >
              <span className="neon-text">Asset Dock</span>
              <ChevronDown className={`h-4 w-4 text-cyan-200 transition-transform duration-300 ${isAssetDockExpanded ? "rotate-180" : "rotate-0"}`} />
            </button>
            <span className="text-[10px] text-cyan-300/78">{isAssetDockExpanded ? "background • logo • audio • media" : "4 types"}</span>
          </div>
          {isAssetDockExpanded ? (
            <div className="space-y-3">
            {[
              ["background", "Background", backgroundAssets, selectedBackgroundAssetId, setSelectedBackgroundAssetId],
              ["logo", "Logo", logoAssets, selectedLogoAssetId, setSelectedLogoAssetId],
              ["audio", "Audio", audioAssets, selectedAudioAssetId, setSelectedAudioAssetId],
              ["video", "Media", videoAssets, selectedVideoAssetId, setSelectedVideoAssetId],
            ].map(([kind, label, assets, selectedId, onSelect]) => (
              <div key={String(kind)} className="rounded-[22px] border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">{String(label)}</p>
                  <button type="button" onClick={() => void requestDeviceMediaAccess(kind as MediaAssetKind)} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
                    Upload
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/52">{isUploadingAsset ? "Uploading asset..." : `Use uploaded ${String(label).toLowerCase()} media in queued renders. Device media access opens your local media storage chooser.`}</p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {(assets as MediaAsset[]).length === 0 ? <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">No assets yet</div> : (assets as MediaAsset[]).map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => {
                        if (suppressAssetTapAssetIdRef.current === asset.id) {
                          suppressAssetTapAssetIdRef.current = "";
                          return;
                        }
                        (onSelect as (value: string) => void)(asset.id);
                        handleAssetTap(asset);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openAssetActions(asset);
                      }}
                      onPointerDown={(event) => {
                        if (event.pointerType !== "touch") {
                          return;
                        }

                        clearAssetHoldTimer();
                        assetHoldTimerRef.current = setTimeout(() => {
                          suppressAssetTapAssetIdRef.current = asset.id;
                          openAssetActions(asset);
                        }, 480);
                      }}
                      onPointerMove={clearAssetHoldTimer}
                      onPointerUp={clearAssetHoldTimer}
                      onPointerCancel={clearAssetHoldTimer}
                      className={`w-32 shrink-0 overflow-hidden rounded-2xl border text-left ${selectedId === asset.id ? "border-cyan-400/35 bg-cyan-400/12" : "border-white/10 bg-white/5"}`}
                    >
                      <AssetPreview asset={asset} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            </div>
          ) : null}
        </section>

        <input ref={backgroundInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={(event) => { void handleAssetUpload("background", event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
        <input ref={logoInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={(event) => { void handleAssetUpload("logo", event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
        <input ref={audioInputRef} type="file" className="hidden" accept="audio/*" onChange={(event) => { void handleAssetUpload("audio", event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
        <input ref={videoInputRef} type="file" className="hidden" accept="video/*" onChange={(event) => { void handleAssetUpload("video", event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />

        <section className={`ll8-panel-shell ll8-panel-emerald rounded-[30px] border ${isClipTimelineExpanded ? "p-4" : "px-3 py-2.5"}`}>
          <div className={`${isClipTimelineExpanded ? "mb-3" : "mb-0"} flex items-center justify-between`}>
            <button
              type="button"
              onClick={() => setIsClipTimelineExpanded((current) => !current)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white"
            >
              <span className="neon-text">Clip Timeline</span>
              <ChevronDown className={`h-4 w-4 text-emerald-200 transition-transform duration-300 ${isClipTimelineExpanded ? "rotate-180" : "rotate-0"}`} />
            </button>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/55">{entitlement.plan === "pro" ? "1-10 clips" : "1-3 clips"}</span>
          </div>
          {isClipTimelineExpanded ? (
          <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGroupSelectedClips}
              disabled={selectedClipIds.length === 0}
              className="rounded-[16px] border border-cyan-300/30 bg-cyan-400/12 px-3 py-2 text-xs font-medium text-cyan-100 disabled:opacity-50"
            >
              Group Me ({selectedClipIds.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedClipIds(availableClips.map((clip) => clip.id))}
              disabled={availableClips.length === 0}
              className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/78 disabled:opacity-50"
            >
              Select All
            </button>
          </div>
          <div className="space-y-3">
            {(availableClips.length > 0 ? availableClips : sampleClips).map((clip, index) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                index={index}
                selected={selectedClipIds.includes(clip.id)}
                onToggle={toggleClipSelection}
                onMove={moveSelectedClip}
              />
            ))}
          </div>
          {groupedClips.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-cyan-300/16 bg-cyan-500/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/72">Grouped Timeline Sent To Caption Studio</p>
              <div className="mt-2 space-y-1">
                {groupedClips.map((clip) => (
                  <div key={`group-${clip.id}`} className="rounded-xl border border-white/10 bg-black/30 p-2 text-xs text-white/75">
                    {clip.id} • {clip.time} • {clip.title}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </>
          ) : null}
        </section>

        <CaptionEditor
          sourceText={groupedCaptionSource || recommendedCaption || latestProject?.scripts.join(" ") || latestProject?.input || "One idea can become your full content week."}
          userId={activeUserId}
          sessionToken={sessionToken}
          transcriptionSources={mediaAssets.filter((asset) => asset.mimeType.startsWith("audio/") || asset.mimeType.startsWith("video/"))}
          preferredTranscriptionAssetId={captionTargetAssetId}
          previewSources={mediaAssets}
          preferredPreviewAssetId={previewTargetAssetId}
          dockTimelineAssets={dockTimelineAssets}
          onDockTimelineAssetsChange={setDockTimelineAssets}
          preferredPresetId={recommendedPresetId}
          preferredFontFamily={recommendedFontFamily}
          requireCaptionSelection
        />

        <section className="rounded-[30px] border border-cyan-400/10 bg-[linear-gradient(145deg,rgba(3,10,16,0.96),rgba(3,5,12,0.98))] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold"><span className="neon-text">Render Queue</span></h2>
            <span className="text-xs text-cyan-300/75">FFmpeg worker</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={handleQueueRender} disabled={!entitlement.canExport || entitlement.plan === "free" || isQueueingRender || !latestProject} className="rounded-[18px] bg-[linear-gradient(90deg,#22d3ee,#3b82f6)] px-3 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-50">{isQueueingRender ? "Queueing" : "Queue MP4"}</button>
          </div>
          <div className="mt-3 rounded-[20px] border border-white/10 bg-black/25 p-3 text-xs text-white/58">
            Background: {selectedBackgroundAssetId || "none"}
            <br />
            Logo: {selectedLogoAssetId || "none"}
            <br />
            Audio: {selectedAudioAssetId || "none"}
            <br />
            Media: {selectedVideoAssetId || "none"}
          </div>
          <div className="mt-3 space-y-2">
            {exportJobs.length === 0 ? <div className="rounded-[20px] border border-white/10 bg-black/25 p-3 text-sm text-white/58">No render jobs queued yet.</div> : exportJobs.map((job) => (
              <div key={job.id} className="rounded-[20px] border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{job.format.toUpperCase()} • {job.status}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">{job.engine}</p>
                </div>
                <p className="mt-2 text-xs text-white/48">bg: {job.backgroundAssetId ?? "none"} • logo: {job.logoAssetId ?? "none"} • audio: {job.audioAssetId ?? "none"}</p>
                <p className="mt-2 text-xs leading-5 text-white/54">{job.commandPreview}</p>
                {job.outputUrl ? <a href={job.outputUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-cyan-300 underline-offset-4 hover:underline">Open render</a> : null}
              </div>
            ))}
          </div>
        </section>

        </div>
        {showMediaAccessPrompt ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm rounded-3xl border border-cyan-400/20 bg-[#06101a] p-4 shadow-[0_0_40px_rgba(34,211,238,0.16)]">
              <h3 className="text-base font-semibold text-white">Grant Local Media Access?</h3>
              <p className="mt-2 text-sm leading-6 text-white/66">When you continue, the app opens your device media picker so you can choose photos, videos, or audio files for upload. Only the files you explicitly choose are uploaded.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setShowMediaAccessPrompt(false); setPendingUploadKind(null); }} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80">Not Now</button>
                <button type="button" onClick={() => void confirmDeviceMediaAccess()} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-sm font-medium text-cyan-100">Grant Access</button>
              </div>
            </div>
          </div>
        ) : null}
        {showNewProjectModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm rounded-3xl border border-fuchsia-400/20 bg-[#150818] p-4 shadow-[0_0_40px_rgba(217,70,239,0.2)]">
              <h3 className="text-base font-semibold text-white">Create New Project</h3>
              <p className="mt-2 text-sm leading-6 text-white/66">Name your project so every action is saved and easy to reopen later.</p>
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
                className="mt-3 w-full rounded-2xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
              />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowNewProjectModal(false)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80">Cancel</button>
                <button type="button" onClick={() => void handleCreateNewProject()} className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/15 px-3 py-2.5 text-sm font-medium text-fuchsia-100">Create</button>
              </div>
            </div>
          </div>
        ) : null}
        {assetActionAsset ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6 sm:items-center sm:pb-0" onClick={() => setAssetActionAsset(null)}>
            <div className="w-full max-w-sm rounded-3xl border border-cyan-400/20 bg-[#07131f] p-4 shadow-[0_0_40px_rgba(34,211,238,0.16)]" onClick={(event) => event.stopPropagation()}>
              <h3 className="text-base font-semibold text-white">Asset Actions</h3>
              <p className="mt-1 text-xs text-white/60">{assetActionAsset.fileName}</p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadAsset(assetActionAsset);
                    setAssetActionAsset(null);
                  }}
                  className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2.5 text-sm font-medium text-cyan-100"
                >
                  Download Asset
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAssetFromDock(assetActionAsset)}
                  disabled={isDeletingAsset}
                  className="rounded-2xl border border-rose-300/25 bg-rose-500/12 px-3 py-2.5 text-sm font-medium text-rose-100 disabled:opacity-55"
                >
                  {isDeletingAsset ? "Deleting..." : "Delete Asset"}
                </button>
                <button
                  type="button"
                  onClick={() => setAssetActionAsset(null)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <MobileNav />
      </div>
    </>
  );
}

async function saveProject(userId: string, token: string, project: Project, setProjects: (value: Project[]) => void) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({ userId, project }),
  });

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as { projects: Project[] };
  setProjects(payload.projects);
}

function pickerType(kind: MediaAssetKind) {
  if (kind === "audio") {
    return {
      description: "Audio files",
      accept: { "audio/*": [".mp3", ".wav", ".m4a", ".aac"] } as Record<string, string[]>,
    };
  }

  if (kind === "video") {
    return {
      description: "Video files",
      accept: { "video/*": [".mp4", ".mov", ".webm", ".mkv"] } as Record<string, string[]>,
    };
  }

  return {
    description: kind === "logo" ? "Logo files" : "Background media",
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "video/*": [".mp4", ".mov", ".webm"],
    } as Record<string, string[]>,
  };
}

async function refreshEntitlement(userId: string, token: string, setEntitlement: (value: Entitlement) => void) {
  const response = await fetch(`/api/entitlement?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) return;
  setEntitlement((await response.json()) as Entitlement);
}

async function refreshProjects(userId: string, token: string, setProjects: (value: Project[]) => void) {
  const response = await fetch(`/api/projects?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) return;
  const payload = (await response.json()) as { projects: Project[] };
  setProjects(payload.projects);
}

async function refreshExportJobs(userId: string, token: string, setExportJobs: (value: ExportJob[]) => void) {
  const response = await fetch(`/api/export/jobs?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) return;
  const payload = (await response.json()) as { jobs: ExportJob[] };
  setExportJobs(payload.jobs);
}

async function refreshMediaAssets(userId: string, token: string, setMediaAssets: (value: MediaAsset[]) => void) {
  const response = await fetch(`/api/media-assets?userId=${encodeURIComponent(userId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!response.ok) return;
  const payload = (await response.json()) as { assets: MediaAsset[] };
  setMediaAssets(payload.assets);
}

function buildHeaders(token: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function resolveFinalClipEndMs(clips: Array<{ time?: string; startMs?: number; endMs?: number }>) {
  if (clips.length === 0) {
    return 0;
  }

  const msFromClips = clips
    .map((clip, index) => {
      if (typeof clip.endMs === "number" && Number.isFinite(clip.endMs)) {
        return Math.max(0, Math.round(clip.endMs));
      }

      const fromRange = parseClipRangeEndMs(clip.time ?? "");
      if (fromRange !== null) {
        return fromRange;
      }

      return (index + 1) * 3000;
    })
    .filter((value) => Number.isFinite(value));

  return msFromClips.length > 0 ? Math.max(...msFromClips) : clips.length * 3000;
}

function parseClipRangeEndMs(timeRange: string) {
  const [startRaw, endRaw] = timeRange.split("-").map((part) => part.trim());
  if (!startRaw || !endRaw) {
    return null;
  }

  const startMs = parseClockToMs(startRaw);
  const endMs = parseClockToMs(endRaw);
  if (startMs === null || endMs === null) {
    return null;
  }

  return Math.max(startMs, endMs);
}

function parseClockToMs(value: string) {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return Math.round((minutes * 60 + seconds) * 1000);
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }

  return null;
}

async function resolveDockAssetDurationMs(asset: MediaAsset) {
  const isImage = asset.mimeType.startsWith("image/");
  if (isImage) {
    return 10000;
  }

  const isAudio = asset.kind === "audio" || asset.mimeType.startsWith("audio/");
  const fallbackMs = isAudio ? 10000 : 8000;
  const mediaDurationMs = await loadMediaDurationMs(asset.publicUrl, isAudio ? "audio" : "video");
  if (mediaDurationMs !== null && mediaDurationMs > 0) {
    return mediaDurationMs;
  }

  return fallbackMs;
}

async function loadMediaDurationMs(url: string, tag: "audio" | "video") {
  if (typeof window === "undefined") {
    return null;
  }

  return new Promise<number | null>((resolve) => {
    const element = document.createElement(tag);
    let settled = false;

    const cleanup = () => {
      element.onloadedmetadata = null;
      element.onerror = null;
      element.removeAttribute("src");
      element.load();
    };

    const settle = (value: number | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const seconds = Number.isFinite(element.duration) ? element.duration : 0;
      settle(seconds > 0 ? Math.max(1000, Math.round(seconds * 1000)) : null);
    };
    element.onerror = () => settle(null);
    element.src = url;

    window.setTimeout(() => settle(null), 4000);
  });
}

function ClipCard({
  clip,
  index,
  selected,
  onToggle,
  onMove,
}: {
  clip: { id: string; time?: string; range?: string; title?: string; label?: string; text: string };
  index: number;
  selected: boolean;
  onToggle: (clipId: string) => void;
  onMove: (clipId: string, direction: "up" | "down") => void;
}) {
  const accent = index === 0 ? "bg-cyan-400" : index === 1 ? "bg-fuchsia-400" : "bg-emerald-400";
  const label = clip.label ?? clip.title ?? "Clip";
  const range = clip.range ?? clip.time ?? "00:00-00:06";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(clip.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle(clip.id);
        }
      }}
      className={`relative w-full cursor-pointer overflow-hidden rounded-3xl border p-3 text-left ${selected ? "border-cyan-300/35 bg-cyan-400/10" : "border-white/10 bg-black/28"}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="ml-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/78">{label}</div>
            <h4 className="mt-1 text-sm font-semibold text-white">Clip {clip.id}</h4>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/70">Confidence {(clip as { hookScore?: number }).hookScore ?? 0}%</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/58">{range}</div>
            <div className={`h-4 w-4 rounded-full border ${selected ? "border-cyan-200 bg-cyan-300/80" : "border-white/40 bg-transparent"}`} />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMove(clip.id, "up");
            }}
            className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] text-white/75"
          >
            Rank Up
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMove(clip.id, "down");
            }}
            className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] text-white/75"
          >
            Rank Down
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/68">{clip.text}</p>
      </div>
    </div>
  );
}

function AssetPreview({ asset }: { asset: MediaAsset }) {
  const isImage = asset.mimeType.startsWith("image/");
  const isVideo = asset.mimeType.startsWith("video/");
  const isAudio = asset.mimeType.startsWith("audio/");
  const extension = asset.fileName.split(".").pop()?.toLowerCase() ?? "file";

  return (
    <div className="h-full">
      <div className="relative h-20 w-full overflow-hidden bg-black/40">
        {isImage ? (
          <img src={asset.publicUrl} alt={asset.fileName} className="h-full w-full object-cover" loading="lazy" />
        ) : null}
        {isVideo ? (
          <video src={asset.publicUrl} className="h-full w-full object-cover" preload="metadata" muted playsInline />
        ) : null}
        {isAudio ? (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(14,165,233,0.2),rgba(99,102,241,0.2))] text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
            {extension}
          </div>
        ) : null}
      </div>
      <div className="border-t border-white/10 p-2">
        <p className="line-clamp-2 text-[11px] leading-4 text-white/80">{asset.fileName}</p>
      </div>
    </div>
  );
}

const sampleClips = [
  { id: "01", range: "00:00-00:05", label: "HOOK", text: "Stop making one post at a time when one idea can power your full week." },
  { id: "02", range: "00:05-00:12", label: "BUILD", text: "Drop in a transcript, blog, or rough note and get clips, tweets, captions, and overlays." },
  { id: "03", range: "00:12-00:18", label: "CTA", text: "Generate faster, save projects, and export pro-ready vertical content." },
];

function formatRelativeDate(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
