"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, GalleryVerticalEnd, Layers3, Sparkles } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { createClientId } from "@/lib/client-id";
import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Entitlement, GenerationResponse, InputType, MediaAnalysisSummary, MediaAsset, OutputTab, Project } from "@/lib/types";

const tabs: OutputTab[] = ["Scripts", "Clips", "Captions", "Tweets", "Overlays", "Fonts"];
const userStorageKey = "limitlabs8.user_id";

type AuthUser = {
  id: string;
  email: string | null;
};

const defaultEntitlement: Entitlement = {
  userId: "",
  plan: "free",
  status: "inactive",
  canExport: false,
  lifecycle: deriveSubscriptionLifecycle({ plan: "free", status: "inactive" }),
};

export default function InputChamberPage() {
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
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [inputType, setInputType] = useState<InputType>("idea");
  const [platform, setPlatform] = useState("TikTok");
  const [tone, setTone] = useState("Futuristic");
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("Scripts");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedSourceAssetId, setSelectedSourceAssetId] = useState("");
  const [latestAnalysis, setLatestAnalysis] = useState<MediaAnalysisSummary | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isProjectWorkspaceExpanded, setIsProjectWorkspaceExpanded] = useState(false);
  const [isOutputPackExpanded, setIsOutputPackExpanded] = useState(false);
  const [error, setError] = useState("");
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveProjectRef = useRef<Project | null>(null);

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

      setAuthUser(
        data.session?.user
          ? { id: data.session.user.id, email: data.session.user.email ?? null }
          : null,
      );
      setSessionToken(data.session?.access_token ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(
        session?.user ? { id: session.user.id, email: session.user.email ?? null } : null,
      );
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
    void refreshMediaAssets(activeUserId, sessionToken, setMediaAssets);
  }, [activeUserId, sessionToken]);

  const latestProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects[0], [projects, selectedProjectId]);
  const sourceMediaAssets = useMemo(() => mediaAssets.filter((asset) => asset.kind === "video" || asset.kind === "audio"), [mediaAssets]);
  const videoPreview = useMemo(() => getVideoPreview(input), [input]);

  useEffect(() => {
    if (!projects.length) {
      return;
    }

    if (!selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!latestProject) {
      autosaveProjectRef.current = null;
      return;
    }

    autosaveProjectRef.current = {
      ...latestProject,
      input,
      inputType,
      platform,
      tone,
      sourceAssetId: selectedSourceAssetId || latestProject.sourceAssetId || null,
      coverImageUrl: latestProject.coverImageUrl ?? resolveProjectCover({ input, selectedAsset: sourceMediaAssets.find((asset) => asset.id === selectedSourceAssetId) }),
      workspaceState: {
        ...(latestProject.workspaceState ?? {}),
        inputProjectWorkspaceExpanded: isProjectWorkspaceExpanded,
        inputOutputPackExpanded: isOutputPackExpanded,
      },
      analysis: latestAnalysis ?? latestProject.analysis ?? null,
      updatedAt: new Date().toISOString(),
    };
  }, [
    input,
    inputType,
    platform,
    tone,
    selectedSourceAssetId,
    latestAnalysis,
    latestProject,
    sourceMediaAssets,
    isProjectWorkspaceExpanded,
    isOutputPackExpanded,
  ]);

  useEffect(() => {
    if (!latestProject) {
      setIsProjectWorkspaceExpanded(false);
      setIsOutputPackExpanded(false);
      return;
    }

    setIsProjectWorkspaceExpanded(latestProject.workspaceState?.inputProjectWorkspaceExpanded ?? false);
    setIsOutputPackExpanded(latestProject.workspaceState?.inputOutputPackExpanded ?? false);
  }, [latestProject?.id]);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    const interval = setInterval(() => {
      if (isGenerating || !autosaveProjectRef.current) {
        return;
      }

      void saveProject(activeUserId, sessionToken, autosaveProjectRef.current, setProjects);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeUserId, sessionToken, isGenerating]);

  async function handleGenerate() {
    if (!input.trim() || !activeUserId) {
      setError("Add source link or text first.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      let analysis: MediaAnalysisSummary | null = null;
      let analysisWarning = "";
      const analysisAssetId = selectedSourceAssetId || latestProject?.sourceAssetId || sourceMediaAssets[0]?.id || "";
      const sourceUrl = extractFirstUrl(input);
      async function requestAnalysis(payload: Record<string, unknown>) {
        const analysisResponse = await fetch("/api/media-analysis", {
          method: "POST",
          headers: buildHeaders(sessionToken),
          body: JSON.stringify(payload),
        });

        const analysisPayload = (await analysisResponse.json()) as { analysis?: MediaAnalysisSummary; error?: string };
        if (!analysisResponse.ok || !analysisPayload.analysis) {
          return {
            ok: false,
            warning: analysisPayload.error ?? "Audio analysis unavailable. Generated pack uses source text only.",
          };
        }

        return { ok: true, analysis: analysisPayload.analysis };
      }

      // Prefer link-transcript analysis first so keyless flows (caption-track sources) still work.
      if (sourceUrl) {
        try {
          const result = await requestAnalysis({
            userId: activeUserId,
            sourceUrl,
            clipLimit: entitlement.plan === "pro" ? 10 : 3,
          });
          if (result.ok && result.analysis) {
            analysis = result.analysis;
            setLatestAnalysis(analysis);
          } else {
            analysisWarning = normalizeAnalysisWarning(result.warning);
          }
        } catch {
          analysisWarning = "Audio analysis failed. Generated pack uses source text only.";
        }
      }

      if (!analysis && analysisAssetId) {
        try {
          const result = await requestAnalysis({
            userId: activeUserId,
            assetId: analysisAssetId,
            clipLimit: entitlement.plan === "pro" ? 10 : 3,
          });
          if (result.ok && result.analysis) {
            analysis = result.analysis;
            setLatestAnalysis(analysis);
          } else {
            analysisWarning = normalizeAnalysisWarning(result.warning);
          }
        } catch {
          analysisWarning = "Audio analysis failed. Generated pack uses source text only.";
        }
      }

      const response = await fetch("/api/repurpose", {
        method: "POST",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({
          userId: activeUserId,
          input: input.trim() || analysis?.exactScript || "",
          inputType,
          tone,
          platform,
          clipLimit: entitlement.plan === "pro" ? 10 : 3,
          mediaAnalysis: analysis,
        }),
      });

      if (!response.ok) {
        const failurePayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(failurePayload.error ?? "Generation failed. Check API config and try again.");
      }

      const generated = (await response.json()) as GenerationResponse;
      const selectedAsset = sourceMediaAssets.find((asset) => asset.id === selectedSourceAssetId) ?? null;
      const projectId = latestProject?.id ?? createClientId();
      const projectName = latestProject?.name?.trim() || (newProjectName.trim() || `Project ${new Date().toLocaleDateString()}`);
      const recommendedCaption = generated.captions[0] ?? analysis?.suggestedClips?.[0]?.text ?? "";
      const recommendedOverlay = generated.overlays[0] ?? analysis?.suggestedClips?.[0]?.overlay ?? "";
      const recommendedPresetId = pickRecommendedPresetId(generated.fonts[0], tone);
      const recommendedFontFamily = pickRecommendedFontFamily(generated.fonts[0], tone);
      const project: Project = {
        ...generated,
        id: projectId,
        name: projectName,
        analysis,
        scripts: analysis ? buildScriptsFromAudioAnalysis(analysis) : generated.scripts,
        captions: analysis ? buildCaptionsFromAudioAnalysis(analysis, generated.captions) : generated.captions,
        clips: analysis?.suggestedClips?.length ? analysis.suggestedClips : generated.clips,
        hooks: analysis?.suggestedClips?.length
          ? analysis.suggestedClips.slice(0, 5).map((clip) => clip.text)
          : generated.hooks,
        sourceAssetId: analysisAssetId || selectedSourceAssetId || null,
        coverImageUrl: resolveProjectCover({ input: input.trim() || selectedAsset?.publicUrl || "", selectedAsset }),
        workspaceState: {
          ...(latestProject?.workspaceState ?? {}),
          inputProjectWorkspaceExpanded: isProjectWorkspaceExpanded,
          inputOutputPackExpanded: isOutputPackExpanded,
          recommendedCaption,
          recommendedCaptionPresetId: recommendedPresetId,
          recommendedFontFamily,
          recommendedOverlay,
          selectedVideoAssetId: selectedSourceAssetId || latestProject?.workspaceState?.selectedVideoAssetId || "",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveProject(activeUserId, sessionToken, project, setProjects);
      setLatestAnalysis(project.analysis ?? null);
      setSelectedProjectId(project.id);
      setActiveTab("Scripts");
      if (analysisWarning) {
        setError(analysisWarning);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed. Check API config and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCreateNewProject() {
    if (!activeUserId) {
      return;
    }

    const name = newProjectName.trim() || `Project ${projects.length + 1}`;
    const blankProject: Project = {
      id: createClientId(),
      name,
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
        inputProjectWorkspaceExpanded: false,
        inputOutputPackExpanded: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveProject(activeUserId, sessionToken, blankProject, setProjects);
    setSelectedProjectId(blankProject.id);
    setInput("");
    setInputType("idea");
    setPlatform("TikTok");
    setTone("Futuristic");
    setSelectedSourceAssetId("");
    setLatestAnalysis(null);
    setIsProjectWorkspaceExpanded(false);
    setIsOutputPackExpanded(false);
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
    const next = payload.projects[0];
    setSelectedProjectId(next?.id ?? "");
    setInput(next?.input ?? "");
    setInputType(next?.inputType ?? "idea");
    setPlatform(next?.platform ?? "TikTok");
    setTone(next?.tone ?? "Futuristic");
    setSelectedSourceAssetId(next?.sourceAssetId ?? "");
    setLatestAnalysis(next?.analysis ?? null);
    setIsProjectWorkspaceExpanded(next?.workspaceState?.inputProjectWorkspaceExpanded ?? false);
    setIsOutputPackExpanded(next?.workspaceState?.inputOutputPackExpanded ?? false);
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
                <h1 className="text-2xl font-semibold">Input Chamber</h1>
                <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/60 bg-fuchsia-500/18 px-3 py-1.5 text-xs font-semibold text-fuchsia-50 shadow-[0_0_12px_rgba(217,70,239,0.45)] transition hover:bg-fuchsia-500/28 hover:shadow-[0_0_18px_rgba(217,70,239,0.6)]">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Home
                </Link>
              </div>
              <p className="mt-2 max-w-xs text-sm text-white/58">Drop source material here, generate, and review the output <span className="neon-text">studio</span>.</p>
            </div>
          </header>
        <section className={`ll8-panel-shell ll8-panel-fuchsia rounded-[24px] border ${isProjectWorkspaceExpanded ? "p-3" : "px-3 py-2.5"}`}>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsProjectWorkspaceExpanded((current) => !current)}
              className="inline-flex items-center gap-1.5 text-xs text-fuchsia-100/85"
            >
              <span>Project Workspace: {latestProject?.name ?? "Untitled"}</span>
              <ChevronDown className={`h-4 w-4 text-fuchsia-200 transition-transform duration-300 ${isProjectWorkspaceExpanded ? "rotate-180" : "rotate-0"}`} />
            </button>
            <span className="text-[10px] text-fuchsia-100/68">{projects.length} saved</span>
          </div>
          {isProjectWorkspaceExpanded ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setShowNewProjectModal(true)} className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-medium text-fuchsia-100">
                  New Project
                </button>
                <button type="button" onClick={() => void handleDeleteSelectedProject()} disabled={!latestProject} className="rounded-full border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-100 disabled:opacity-50">
                  Delete
                </button>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setInput(project.input || "");
                      setInputType(project.inputType || "idea");
                      setPlatform(project.platform || "TikTok");
                      setTone(project.tone || "Futuristic");
                      setSelectedSourceAssetId(project.sourceAssetId ?? "");
                      setLatestAnalysis(project.analysis ?? null);
                      setIsProjectWorkspaceExpanded(project.workspaceState?.inputProjectWorkspaceExpanded ?? false);
                      setIsOutputPackExpanded(project.workspaceState?.inputOutputPackExpanded ?? false);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs ${selectedProjectId === project.id ? "border-fuchsia-300/45 bg-fuchsia-500/18 text-fuchsia-100" : "border-white/12 bg-white/5 text-white/70"}`}
                  >
                    {project.name || project.input.slice(0, 18) || "Untitled"}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section className="ll8-panel-shell ll8-panel-cyan rounded-[30px] border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-cyan-300" />
              <h2 className="text-sm font-semibold"><span className="neon-text">Source Input</span></h2>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/35 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/42">
              <GalleryVerticalEnd className="h-3.5 w-3.5 text-cyan-300" />
              <span className="neon-text">Source Input</span>
            </div>

            <textarea
              className="min-h-[140px] w-full rounded-[18px] border border-cyan-400/10 bg-[linear-gradient(180deg,rgba(3,6,14,0.9),rgba(1,2,8,0.95))] p-4 text-sm leading-6 text-white/75 outline-none placeholder:text-white/40"
              placeholder="Paste a YouTube link, transcript, blog post, product pitch, or raw idea here..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />

            {videoPreview ? (
              <div className="mt-3 rounded-[16px] border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(5,16,28,0.92),rgba(4,10,22,0.94))] p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">
                  <span>Video Preview</span>
                  <span>{videoPreview.sourceLabel}</span>
                </div>

                <div className="overflow-hidden rounded-[14px] border border-white/10 bg-black/45">
                  {videoPreview.kind === "embed" ? (
                    <iframe
                      src={videoPreview.url}
                      title="Source preview"
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video src={videoPreview.url} className="aspect-video w-full" controls playsInline preload="metadata" />
                  )}
                </div>

                {videoPreview.note ? <p className="mt-2 text-xs text-white/58">{videoPreview.note}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="ll8-select-shell ll8-select-cyan">
              <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="ll8-select-field">
                <option style={{ backgroundColor: "#081321", color: "#e6faff" }}>TikTok</option>
                <option style={{ backgroundColor: "#081321", color: "#e6faff" }}>Instagram Reels</option>
                <option style={{ backgroundColor: "#081321", color: "#e6faff" }}>YouTube Shorts</option>
                <option style={{ backgroundColor: "#081321", color: "#e6faff" }}>X</option>
              </select>
              <ChevronDown className="ll8-select-chevron h-4 w-4" />
            </div>
            <div className="ll8-select-shell ll8-select-fuchsia">
              <select value={tone} onChange={(event) => setTone(event.target.value)} className="ll8-select-field">
                <option style={{ backgroundColor: "#1a0d22", color: "#fde6ff" }}>Futuristic</option>
                <option style={{ backgroundColor: "#1a0d22", color: "#fde6ff" }}>Viral</option>
                <option style={{ backgroundColor: "#1a0d22", color: "#fde6ff" }}>Expert</option>
                <option style={{ backgroundColor: "#1a0d22", color: "#fde6ff" }}>Storytelling</option>
              </select>
              <ChevronDown className="ll8-select-chevron h-4 w-4" />
            </div>
            <div className="ll8-select-shell ll8-select-emerald">
              <select value={inputType} onChange={(event) => setInputType(event.target.value as InputType)} className="ll8-select-field">
                <option value="youtube" style={{ backgroundColor: "#0b1e18", color: "#e8fff7" }}>YouTube Link</option>
                <option value="blog" style={{ backgroundColor: "#0b1e18", color: "#e8fff7" }}>Blog Post</option>
                <option value="transcript" style={{ backgroundColor: "#0b1e18", color: "#e8fff7" }}>Transcript</option>
                <option value="idea" style={{ backgroundColor: "#0b1e18", color: "#e8fff7" }}>Raw Idea</option>
                <option value="video" style={{ backgroundColor: "#0b1e18", color: "#e8fff7" }}>Video Link</option>
              </select>
              <ChevronDown className="ll8-select-chevron h-4 w-4" />
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-2.5 text-white/72">Clips: {entitlement.plan === "pro" ? "1-10" : "1-3"}</div>
          </div>

          {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

          <button onClick={handleGenerate} disabled={isGenerating} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(90deg,#d946ef,#7c3aed,#22d3ee)] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60">
            {isGenerating ? "Generating..." : "Generate Full Content Pack"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        {latestAnalysis ? (
          <section className="rounded-[28px] border border-cyan-300/14 bg-[linear-gradient(145deg,rgba(4,13,26,0.95),rgba(4,8,18,0.97))] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">AI Listener Report</h2>
              <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">video-aware</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">Duration: {latestAnalysis.durationSeconds}s</div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">Words: {latestAnalysis.wordCount}</div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">Music: {latestAnalysis.hasMusic ? "Detected" : "Not detected"}</div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">Scenes: {latestAnalysis.suggestedClipCount}</div>
            </div>
            <p className="mt-2 text-xs text-white/62">{latestAnalysis.musicNote}</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Exact Script</p>
              <p className="mt-2 max-h-36 overflow-auto text-sm leading-6 text-white/78">{latestAnalysis.exactScript}</p>
            </div>
          </section>
        ) : null}

        <section className={`ll8-panel-shell ll8-panel-emerald rounded-[28px] border ${isOutputPackExpanded ? "p-4" : "px-3 py-2.5"}`}>
          <div className={`${isOutputPackExpanded ? "mb-3" : "mb-0"} flex items-center justify-between`}>
            <button
              type="button"
              onClick={() => setIsOutputPackExpanded((current) => !current)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
            >
              <span className="neon-text">Output Pack</span>
              <ChevronDown className={`h-4 w-4 text-emerald-200 transition-transform duration-300 ${isOutputPackExpanded ? "rotate-180" : "rotate-0"}`} />
            </button>
            <span className="text-[10px] text-emerald-100/68">{activeTab}</span>
          </div>
          {isOutputPackExpanded ? (
            <>
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-xs ${activeTab === tab ? "border border-cyan-400/25 bg-cyan-400/10 text-cyan-200" : "border border-white/10 bg-white/5 text-white/60"}`}
                  >
                    <span className="neon-text">{tab}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {renderTabContent(activeTab, latestProject)}
              </div>
            </>
          ) : null}
        </section>

        <Link href={latestProject?.id ? `/studio?projectId=${encodeURIComponent(latestProject.id)}` : "/studio"} className="flex items-center justify-between rounded-[24px] border border-fuchsia-400/12 bg-[linear-gradient(145deg,rgba(15,6,20,0.95),rgba(7,3,12,0.98))] p-4 text-white">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-fuchsia-200/75">Next Route</p>
            <p className="mt-2 text-base font-semibold">Open Studio Magic</p>
            <p className="mt-1 text-sm text-white/58">Asset Dock, Clip Timeline, Caption Studio, and Render Queue.</p>
          </div>
          <Sparkles className="h-5 w-5 text-fuchsia-200" />
        </Link>
      </div>
      {showNewProjectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-fuchsia-400/20 bg-[#150818] p-4 shadow-[0_0_40px_rgba(217,70,239,0.2)]">
            <h3 className="text-base font-semibold text-white">Create New Project</h3>
            <p className="mt-2 text-sm text-white/66">Name your project so you can return to it anytime.</p>
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
      <MobileNav />
      </div>
    </>
  );
}

async function saveProject(userId: string, token: string, project: Project, setProjects: (value: Project[]) => void) {
  const saveResponse = await fetch("/api/projects", {
    headers: buildHeaders(token),
    body: JSON.stringify({ userId, project }),
  });

  if (!saveResponse.ok) {
    throw new Error("save failed");
  }

  const saved = (await saveResponse.json()) as { projects: Project[] };
  setProjects(saved.projects);
}

function resolveProjectCover({ input, selectedAsset }: { input: string; selectedAsset: MediaAsset | null | undefined }) {
  if (selectedAsset?.mimeType.startsWith("image/") || selectedAsset?.mimeType.startsWith("video/")) {
    return selectedAsset.publicUrl;
  }

  const match = input.match(/https?:\/\/[^\s]+/i);
  const url = match?.[0] ?? "";
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    if (host.includes("youtube.com") || host === "youtu.be") {
      const videoId =
        parsed.searchParams.get("v") ||
        (host === "youtu.be" ? path.split("/").filter(Boolean)[0] : "") ||
        path.match(/\/shorts\/([^/?#]+)/)?.[1] ||
        "";
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }

    if (/\.(png|jpg|jpeg|webp)$/i.test(path)) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

async function refreshEntitlement(userId: string, token: string, setEntitlement: (value: Entitlement) => void) {
  const response = await fetch(`/api/entitlement?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) {
    return;
  }

  setEntitlement((await response.json()) as Entitlement);
}

async function refreshProjects(userId: string, token: string, setProjects: (value: Project[]) => void) {
  const response = await fetch(`/api/projects?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as { projects: Project[] };
  setProjects(payload.projects);
}

async function refreshMediaAssets(userId: string, token: string, setMediaAssets: (value: MediaAsset[]) => void) {
  const response = await fetch(`/api/media-assets?userId=${encodeURIComponent(userId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as { assets: MediaAsset[] };
  setMediaAssets(payload.assets.filter((asset) => asset.kind === "video" || asset.kind === "audio"));
}

function buildHeaders(token: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function renderTabContent(activeTab: OutputTab, project: Project | undefined) {
  if (!project) {
    return <div className="rounded-[18px] border border-white/10 bg-black/28 p-3 text-sm text-white/58">Generate a project to populate outputs.</div>;
  }

  if (activeTab === "Scripts") {
    if (project.analysis) {
      const transcript = project.analysis.exactScript?.trim() || "No transcript detected.";
      const transcriptScenes = project.analysis.suggestedClips.length > 0
        ? project.analysis.suggestedClips
        : buildTranscriptScenes(transcript);

      return (
        <>
          <OutputCard title="Audio Transcript" text={transcript} />
          {transcriptScenes.map((scene, index) => (
            <OutputCard
              key={`scene-script-${scene.id}`}
              title={index === 0 ? `Scene ${index + 1} Hook` : `Scene ${index + 1}`}
              text={`${scene.text}${scene.time ? `\n\nTime: ${scene.time}` : ""}`}
            />
          ))}
        </>
      );
    }

    return project.scripts.map((item, index) => (
      <OutputCard key={`script-${index}`} title={index === 0 ? `Scene ${index + 1} Hook` : `Scene ${index + 1}`} text={item} />
    ));
  }

  if (activeTab === "Clips") {
    const durationSeconds = project.analysis?.durationSeconds ?? 0;
    const recommendedCount = project.analysis?.suggestedClipCount ?? project.clips.length;
    const hookCount = project.hooks.length || project.analysis?.suggestedClips.length || 0;
    return (
      <>
        <OutputCard
          title="Recommended Clip Count"
          text={`Suggested clips: ${recommendedCount}. Hooks found: ${hookCount}. Video length: ${durationSeconds > 0 ? `${durationSeconds}s` : "n/a"}.`}
        />
        {project.clips.map((item) => (
          <OutputCard key={item.id} title={`Clip ${item.id}`} text={`${item.title} - ${item.text}${item.time ? `\n\n${item.time}` : ""}`} />
        ))}
      </>
    );
  }

  if (activeTab === "Captions") {
    const recommendedCaption = project.workspaceState?.recommendedCaption ?? project.captions[0] ?? "";
    const recommendedPreset = project.workspaceState?.recommendedCaptionPresetId ?? "";
    const recommendedFont = project.workspaceState?.recommendedFontFamily ?? "";
    return (
      <>
        {recommendedCaption ? (
          <OutputCard
            title="Best Caption For Studio Magic"
            text={`${recommendedCaption}${recommendedPreset ? `\n\nPreset: ${recommendedPreset}` : ""}${recommendedFont ? `\nFont: ${recommendedFont}` : ""}`}
          />
        ) : null}
        {project.captions.slice(1, 8).map((item, index) => <OutputCard key={`caption-${index}`} title={`Caption Alt ${index + 1}`} text={item} />)}
      </>
    );
  }

  if (activeTab === "Tweets") {
    return [...project.tweets, ...project.thread].map((item, index) => <OutputCard key={`${item}-${index}`} title="Tweet" text={item} />);
  }

  if (activeTab === "Overlays") {
    const recommendedOverlay = project.workspaceState?.recommendedOverlay ?? project.overlays[0] ?? "";
    return (
      <>
        {recommendedOverlay ? <OutputCard title="Best Overlay" text={recommendedOverlay} /> : null}
        {project.overlays.slice(1).map((item, index) => <OutputCard key={`overlay-${index}`} title={`Overlay Alt ${index + 1}`} text={item} />)}
      </>
    );
  }

  const recommendedFont = project.workspaceState?.recommendedFontFamily ?? "";
  return (
    <>
      {recommendedFont ? <OutputCard title="Best Font For Studio Magic" text={recommendedFont} /> : null}
      {project.fonts.map((item) => <OutputCard key={item} title="Font Preset" text={item} />)}
    </>
  );
}

function buildTranscriptScenes(transcript: string) {
  const cleaned = transcript.trim();
  if (!cleaned) {
    return [];
  }

  const sentences = cleaned
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return [{ id: "01", text: cleaned, time: "" }];
  }

  const targetScenes = Math.min(5, Math.max(1, Math.ceil(sentences.length / 2)));
  const chunkSize = Math.max(1, Math.ceil(sentences.length / targetScenes));
  const scenes: Array<{ id: string; text: string; time: string }> = [];

  for (let index = 0; index < targetScenes; index += 1) {
    const start = index * chunkSize;
    const end = Math.min(sentences.length, start + chunkSize);
    const text = sentences.slice(start, end).join(". ").trim();
    if (!text) {
      continue;
    }

    scenes.push({
      id: String(index + 1).padStart(2, "0"),
      text: text.endsWith(".") ? text : `${text}.`,
      time: "",
    });
  }

  return scenes;
}

function buildScriptsFromAudioAnalysis(analysis: MediaAnalysisSummary) {
  const clips = analysis.suggestedClips.slice(0, 3);
  if (clips.length === 0) {
    return [analysis.exactScript || "No transcript detected."];
  }

  return clips.map((clip, index) => {
    const next = clips[index + 1];
    const valueLine = next?.text || "Expand with one practical teaching point from the transcript.";
    return `Scene ${index + 1} Hook: ${clip.text} Scene 2 Value: ${valueLine} Scene 3 CTA: Save this and apply it in your next post.`;
  });
}

function buildCaptionsFromAudioAnalysis(analysis: MediaAnalysisSummary, fallbackCaptions: string[]) {
  const transcript = analysis.exactScript?.trim() || "";
  if (!transcript) {
    return fallbackCaptions;
  }

  const lines = transcript
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 120)
    .map((line) => (line.endsWith(".") ? line : `${line}.`));

  if (lines.length === 0) {
    return fallbackCaptions;
  }

  while (lines.length < 120) {
    lines.push(lines[lines.length % Math.max(1, Math.min(8, lines.length))]);
  }

  return lines.slice(0, 120);
}

function normalizeAnalysisWarning(value?: string) {
  const fallback = "Audio analysis unavailable. Generated pack uses source text only.";
  const message = (value || "").trim();
  if (!message) {
    return fallback;
  }

  if (message.includes("OPENAI_API_KEY") || message.toLowerCase().includes("transcription service is unavailable")) {
    return "Uploaded-media transcription is unavailable right now. Generated pack uses link/text analysis only.";
  }

  return message;
}

function OutputCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/28 p-3 text-sm text-white/74">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{title}</p>
      <p className="mt-2 leading-6">{text}</p>
    </div>
  );
}

type VideoPreview = {
  kind: "embed" | "file";
  url: string;
  sourceLabel: string;
  note?: string;
};

function getVideoPreview(value: string): VideoPreview | null {
  const link = extractFirstUrl(value);
  if (!link) {
    return null;
  }

  try {
    const parsed = new URL(link);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname;

    if (host === "youtu.be") {
      const id = path.slice(1).split("/")[0];
      if (id) {
        return { kind: "embed", url: `https://www.youtube.com/embed/${id}`, sourceLabel: "YouTube" };
      }
    }

    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v") ?? path.match(/\/shorts\/([^/?#]+)/)?.[1] ?? path.match(/\/embed\/([^/?#]+)/)?.[1] ?? "";
      if (videoId) {
        return { kind: "embed", url: `https://www.youtube.com/embed/${videoId}`, sourceLabel: "YouTube" };
      }
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = path.match(/\/(\d+)/)?.[1];
      if (id) {
        return { kind: "embed", url: `https://player.vimeo.com/video/${id}`, sourceLabel: "Vimeo" };
      }
    }

    if (host.includes("tiktok.com")) {
      const id = path.match(/\/video\/(\d+)/)?.[1];
      if (id) {
        return {
          kind: "embed",
          url: `https://www.tiktok.com/embed/v2/${id}`,
          sourceLabel: "TikTok",
          note: "If preview is blocked, generate still works with the link input.",
        };
      }
    }

    if (host.includes("instagram.com")) {
      const match = path.match(/\/(reel|p|tv)\/([^/?#]+)/);
      if (match) {
        return {
          kind: "embed",
          url: `https://www.instagram.com/${match[1]}/${match[2]}/embed`,
          sourceLabel: "Instagram",
          note: "Some Instagram posts block in-app preview depending on account/privacy settings.",
        };
      }
    }

    if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(path)) {
      return { kind: "file", url: parsed.toString(), sourceLabel: "Direct Video File" };
    }

    return null;
  } catch {
    return null;
  }
}

function extractFirstUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s]+/i);
  return match?.[0] ?? "";
}

function pickRecommendedPresetId(fontPreset: string | undefined, tone: string) {
  const normalized = (fontPreset || "").toLowerCase();
  if (normalized.includes("neon")) {
    return "neon-001";
  }
  if (normalized.includes("minimal")) {
    return "minimal-001";
  }
  if (normalized.includes("luxury")) {
    return "luxury-001";
  }
  if (normalized.includes("glitch")) {
    return "glitch-001";
  }
  if (normalized.includes("cinematic")) {
    return "cinematic-001";
  }
  if (normalized.includes("street")) {
    return "street-001";
  }

  if (tone === "Expert") {
    return "minimal-001";
  }
  if (tone === "Storytelling") {
    return "cinematic-001";
  }
  if (tone === "Viral") {
    return "comic-001";
  }
  return "futuristic-001";
}

function pickRecommendedFontFamily(fontPreset: string | undefined, tone: string) {
  const normalized = (fontPreset || "").toLowerCase();
  if (normalized.includes("neon") || normalized.includes("futuristic") || normalized.includes("glitch")) {
    return "Orbitron";
  }
  if (normalized.includes("minimal")) {
    return "Inter";
  }
  if (normalized.includes("luxury") || normalized.includes("cinematic")) {
    return "Playfair Display";
  }
  if (normalized.includes("street")) {
    return "Anton";
  }

  if (tone === "Expert") {
    return "Inter";
  }
  if (tone === "Storytelling") {
    return "Playfair Display";
  }
  if (tone === "Viral") {
    return "Bangers";
  }
  return "Orbitron";
}
