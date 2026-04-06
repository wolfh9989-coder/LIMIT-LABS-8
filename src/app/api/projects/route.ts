import { NextResponse } from "next/server";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlement";
import { getMemoryProjects, setMemoryProjects } from "@/lib/memory-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Project } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fallbackUserId = searchParams.get("userId")?.trim() ?? "";
  const identity = await resolveProtectedIdentity(request, fallbackUserId);

  if (!identity?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const entitlement = await getEntitlement(identity.userId);
  const maxProjects = entitlement.plan === "pro" ? 500 : 2;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ projects: getMemoryProjects(identity.userId).slice(0, maxProjects) });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id,payload,created_at")
    .eq("user_id", identity.userId)
    .order("created_at", { ascending: false })
    .limit(maxProjects);

  if (error) {
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }

  const projects: Project[] = (data ?? []).map((row) => ({
    ...(row.payload as Omit<Project, "id" | "createdAt">),
    id: row.id,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; project?: Project };
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");
    const project = body.project;

    if (!identity?.userId || !project) {
      return NextResponse.json({ error: "Authentication and project are required" }, { status: 401 });
    }

    const entitlement = await getEntitlement(identity.userId);
    const maxProjects = entitlement.plan === "pro" ? 500 : 2;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      const currentEntries = getMemoryProjects(identity.userId);
      const replaced = [project, ...currentEntries.filter((entry) => entry.id !== project.id)].slice(0, maxProjects);
      setMemoryProjects(identity.userId, replaced);
      return NextResponse.json({ projects: replaced });
    }

    const { error: insertError } = await supabase.from("projects").upsert({
      id: project.id,
      user_id: identity.userId,
      payload: {
        name: project.name ?? null,
        input: project.input,
        inputType: project.inputType,
        tone: project.tone,
        platform: project.platform,
        scripts: project.scripts,
        hooks: project.hooks,
        captions: project.captions,
        tweets: project.tweets,
        thread: project.thread,
        overlays: project.overlays,
        clips: project.clips,
        blogs: project.blogs,
        fonts: project.fonts,
        coverImageUrl: project.coverImageUrl ?? null,
        sourceAssetId: project.sourceAssetId ?? null,
        workspaceState: project.workspaceState ?? null,
        analysis: project.analysis ?? null,
      },
      created_at: project.createdAt,
    }, { onConflict: "id" });

    if (insertError) {
      return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
    }

    if (entitlement.plan === "free") {
      const { data: allRows } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", identity.userId)
        .order("created_at", { ascending: false });

      const excessIds = (allRows ?? []).slice(maxProjects).map((row) => row.id);
      if (excessIds.length > 0) {
        await supabase.from("projects").delete().in("id", excessIds);
      }
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id,payload,created_at")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: false })
      .limit(maxProjects);

    if (error) {
      return NextResponse.json({ error: "Failed to refresh projects" }, { status: 500 });
    }

    const projects: Project[] = (data ?? []).map((row) => ({
      ...(row.payload as Omit<Project, "id" | "createdAt">),
      id: row.id,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; projectId?: string };
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");
    const projectId = body.projectId?.trim() ?? "";

    if (!identity?.userId || !projectId) {
      return NextResponse.json({ error: "Authentication and projectId are required" }, { status: 401 });
    }

    const entitlement = await getEntitlement(identity.userId);
    const maxProjects = entitlement.plan === "pro" ? 500 : 2;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      const nextProjects = getMemoryProjects(identity.userId).filter((project) => project.id !== projectId).slice(0, maxProjects);
      setMemoryProjects(identity.userId, nextProjects);
      return NextResponse.json({ projects: nextProjects });
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("user_id", identity.userId)
      .eq("id", projectId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id,payload,created_at")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: false })
      .limit(maxProjects);

    if (error) {
      return NextResponse.json({ error: "Failed to refresh projects" }, { status: 500 });
    }

    const projects: Project[] = (data ?? []).map((row) => ({
      ...(row.payload as Omit<Project, "id" | "createdAt">),
      id: row.id,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
