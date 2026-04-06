"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Play } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { createClientId } from "@/lib/client-id";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Project } from "@/lib/types";

const userStorageKey = "limitlabs8.user_id";

type AuthUser = { id: string; email: string | null };

export default function ProjectsPage() {
  const [localUserId] = useState(() => {
    if (typeof window === "undefined") return "";
    const existing = localStorage.getItem(userStorageKey);
    if (existing) return existing;
    const created = createClientId();
    localStorage.setItem(userStorageKey, created);
    return created;
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
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
    if (!activeUserId) return;
    void refreshProjects(activeUserId, sessionToken, setProjects);
  }, [activeUserId, sessionToken]);

  const recentProjects = useMemo(() => projects, [projects]);

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
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">Projects</p>
                  <h1 className="text-2xl font-semibold">Media Storage</h1>
                </div>
                <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/60 bg-fuchsia-500/18 px-3 py-1.5 text-xs font-semibold text-fuchsia-50 shadow-[0_0_12px_rgba(217,70,239,0.45)] transition hover:bg-fuchsia-500/28 hover:shadow-[0_0_18px_rgba(217,70,239,0.6)]">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Home
                </Link>
              </div>
              <p className="mt-2 max-w-xs text-sm text-white/58">Open saved creations and jump back to <span className="neon-text">studio</span>.</p>
            </div>
          </header>
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(6,10,20,0.96),rgba(3,4,12,0.97))] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Saved Projects</h2>
            <span className="text-xs text-cyan-300/78">{recentProjects.length} total</span>
          </div>
          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <div className="rounded-[22px] border border-white/10 bg-black/30 px-3 py-4 text-sm text-white/58">No projects yet. Generate one in Create.</div>
            ) : (
              recentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/30 px-3 py-3">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-3">
                      {project.coverImageUrl ? (
                        <img src={project.coverImageUrl} alt={project.name ?? "Project cover"} className="h-12 w-12 rounded-lg border border-white/10 object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/45">No image</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white line-clamp-1">{project.name || "Untitled project"}</p>
                        <p className="mt-1 text-xs text-white/62 line-clamp-1">{project.input || "No source text"}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-white/48">{project.clips.length} clips • {project.captions.length} captions • {formatRelativeDate(project.createdAt)}</p>
                  </div>
                  <Link href={`/studio?projectId=${encodeURIComponent(project.id)}`} className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
                    <Play className="h-3.5 w-3.5" />
                    Open
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      </div>
      <MobileNav />
    </>
  );
}

async function refreshProjects(userId: string, token: string, setProjects: (value: Project[]) => void) {
  const response = await fetch(`/api/projects?userId=${encodeURIComponent(userId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) return;
  const payload = (await response.json()) as { projects: Project[] };
  setProjects(payload.projects);
}

function formatRelativeDate(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
