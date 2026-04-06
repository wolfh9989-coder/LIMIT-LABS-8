"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Clapperboard,
  Cpu,
  Play,
  ScanLine,
  Sparkles,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { CinematicSplash } from "@/components/CinematicSplash";
import { createClientId } from "@/lib/client-id";
import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Entitlement, Project } from "@/lib/types";

const userStorageKey = "limitlabs8.user_id";
const splashSeenKey = "limitlabs8.splash_seen_v2";

type AuthUser = {
  id: string;
  email: string | null;
};

type ToolCard = {
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  motionClass: string;
};

const defaultEntitlement: Entitlement = {
  userId: "",
  plan: "free",
  status: "inactive",
  canExport: false,
  lifecycle: deriveSubscriptionLifecycle({ plan: "free", status: "inactive" }),
};

const tools: ToolCard[] = [
  {
    title: "Video Forge",
    desc: "Break any idea into scenes, clips, overlays, and vertical scripts.",
    icon: Clapperboard,
    accent: "from-cyan-400 to-sky-500",
    motionClass: "ll8-module-cyan",
  },
  {
    title: "Caption Reactor",
    desc: "Generate vibrant caption packs tuned for reels, shorts, and posts.",
    icon: Sparkles,
    accent: "from-fuchsia-400 to-violet-500",
    motionClass: "ll8-module-fuchsia",
  },
  {
    title: "Thread Engine",
    desc: "Turn one concept into tweets, hooks, mini-threads, and calls to action.",
    icon: Bot,
    accent: "from-emerald-400 to-cyan-500",
    motionClass: "ll8-module-emerald",
  },
  {
    title: "Font Lab",
    desc: "Apply neon, cinematic, tech, and cyber overlay styles for mobile video.",
    icon: Wand2,
    accent: "from-amber-300 to-orange-500",
    motionClass: "ll8-module-amber",
  },
];

export default function LimitLabs8HomePage() {
  const [showSplash, setShowSplash] = useState(false);
  const [splashInitialized, setSplashInitialized] = useState(false);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const forceSplash = params.get("v") === "2" || params.get("splash") === "1";

    if (forceSplash) {
      try {
        window.localStorage.removeItem(splashSeenKey);
      } catch {
        // Ignore storage errors and still force splash display.
      }
      setShowSplash(true);
      setSplashInitialized(true);
      return;
    }

    try {
      const alreadySeen = window.localStorage.getItem(splashSeenKey);
      if (!alreadySeen) {
        setShowSplash(true);
      }
    } catch {
      // If storage is unavailable on mobile/private mode, default to showing splash.
      setShowSplash(true);
    }
    setSplashInitialized(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (showSplash) {
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showSplash]);

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
          ? {
              id: data.session.user.id,
              email: data.session.user.email ?? null,
            }
          : null,
      );
      setSessionToken(data.session?.access_token ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email ?? null,
            }
          : null,
      );
      setSessionToken(session?.access_token ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const activeUserId = authUser?.id ?? localUserId;

  const completeSplash = () => {
    console.log("[Home] completeSplash called, setting showSplash=false and saving to localStorage");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(splashSeenKey, "1");
    }
    setShowSplash(false);
  };

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    void refreshEntitlement(activeUserId, sessionToken, setEntitlement);
    void refreshProjects(activeUserId, sessionToken, setProjects);
  }, [activeUserId, sessionToken]);

  const recentProjects = useMemo(() => projects.slice(0, 3), [projects]);

  return (
    <div className="min-h-screen bg-[#02030a] text-white">
      {showSplash ? <CinematicSplash onComplete={completeSplash} /> : null}
      <div className="mx-auto min-h-screen max-w-sm overflow-hidden border-x border-cyan-400/10 bg-[linear-gradient(180deg,#02030a_0%,#050816_45%,#040611_100%)] shadow-[0_0_80px_rgba(0,255,255,0.06)]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(0,255,255,0.09),transparent_18%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.09),transparent_16%),radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.08),transparent_28%)]" />

        <header className="sticky top-0 z-30 border-b border-cyan-400/10 bg-black/45 backdrop-blur-2xl">
          <div className="px-4 pb-4 pt-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-cyan-300">
                  <ScanLine className="h-3.5 w-3.5" />
                  Mobile Creator OS
                </div>
                <h1 className="text-[28px] font-semibold tracking-tight">
                  <span className="ll8-title">LIMIT LABS</span> <span className="ll8-title-eight text-cyan-300">8</span>
                </h1>
                <p className="mt-1 max-w-60 text-sm leading-6 text-white/58">
                  Mechanical neon video design and repurposing engineered for phones.
                </p>
              </div>

              <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-right shadow-[0_0_20px_rgba(217,70,239,0.15)]">
                <div className="text-[10px] uppercase tracking-[0.26em] text-fuchsia-200/85">plan</div>
                <div className="mt-1 text-xs font-semibold text-white">{entitlement.plan === "pro" ? "Pro Active" : "Free Core"}</div>
              </div>
            </div>

            <div className="ll8-home-studio-shell rounded-[30px] border bg-[linear-gradient(145deg,rgba(10,15,30,0.95),rgba(6,10,20,0.92))] p-4">

              <div className="relative">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <Cpu className="h-4 w-4" />
                  <span className="text-[11px] uppercase tracking-[0.34em]">Video & Content Studio</span>
                </div>
                <h2 className="max-w-70 text-[22px] font-semibold leading-tight text-white">
                  Split creation into focused rooms that keep mobile workflows clean and fast.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/62">
                  Use Input Chamber for source generation. Open Studio Magic for assets, clips, caption styling, and render queue work.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Routes", "2"],
                    ["Studio", "Live"],
                    ["Clips", entitlement.plan === "pro" ? "1-10" : "1-3"],
                  ].map(([top, bottom]) => (
                    <div key={top} className="rounded-2xl border border-white/10 bg-black/25 px-2 py-3">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">{top}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{bottom}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 space-y-5 px-4 pb-28 pt-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-white/92">Core modules</h3>
              <div className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-300">
                <Zap className="h-3.5 w-3.5" />
                Neon Stack
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.title}
                    className={`ll8-module-card ${tool.motionClass} group rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(7,10,20,0.95),rgba(4,6,14,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_30px_rgba(0,0,0,0.22)]`}
                  >
                    <div className={`absolute inset-x-0 -top-2 z-20 h-px bg-linear-to-r ${tool.accent}`} />
                    <div className="relative">
                      <div className={`mb-10 inline-flex rounded-2xl bg-linear-to-br ${tool.accent} p-2.5 text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.18)]`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-white">{tool.title}</h4>
                      <p className="mt-1 text-xs leading-5 text-white/58">{tool.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <Link href="/create" className="ll8-route-card ll8-route-input block rounded-[30px] border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="mt-2 text-lg font-semibold text-white">Input Chamber</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Paste source content, choose tone and platform, then generate a full content pack in its own page.
                </p>
              </div>
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100">Open</div>
            </div>
          </Link>

          <Link href="/studio" className="ll8-route-card ll8-route-studio block rounded-[30px] border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="mt-2 text-lg font-semibold text-white">Studio Magic</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Open Asset Dock, Clip Timeline, Font + Caption Studio, and Render Queue in one focused page.
                </p>
              </div>
              <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs text-fuchsia-100">Open</div>
            </div>
          </Link>

          <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(6,10,20,0.96),rgba(3,4,12,0.97))] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Media Storage</h3>
              <Link href="/projects" className="text-xs text-cyan-300/78 hover:text-cyan-200">Open Projects</Link>
            </div>
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <div className="rounded-[22px] border border-white/10 bg-black/30 px-3 py-4 text-sm text-white/58">
                  No synced projects yet. Generate a pack from Input Chamber to save it.
                </div>
              ) : (
                recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/30 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-1">{project.input}</p>
                      <p className="mt-1 text-xs text-white/48">
                        {project.clips.length} clips • {project.captions.length} captions • saved {formatRelativeDate(project.createdAt)}
                      </p>
                    </div>
                    <Link href="/projects" className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
                      <Play className="h-3.5 w-3.5" />
                      Open
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>

        </main>

        <MobileNav />
      </div>
    </div>
  );
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

function buildHeaders(token: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatRelativeDate(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

