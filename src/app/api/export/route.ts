import { NextResponse } from "next/server";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlement";
import type { Project } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      project?: Project;
      format?: "json" | "txt";
    };

    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");
    const project = body.project;
    const format = body.format === "txt" ? "txt" : "json";

    if (!identity?.userId || !project) {
      return NextResponse.json({ error: "Authentication and project are required" }, { status: 401 });
    }

    const entitlement = await getEntitlement(identity.userId);
    if (entitlement.plan !== "pro" || !entitlement.canExport) {
      return NextResponse.json({ error: "Export is available on Pro plan only" }, { status: 403 });
    }

    const content =
      format === "json"
        ? JSON.stringify(project, null, 2)
        : buildTextExport(project);

    const fileName = `limitlabs8-${project.id}.${format}`;

    return NextResponse.json({ fileName, mimeType: format === "json" ? "application/json" : "text/plain", content });
  } catch {
    return NextResponse.json({ error: "Invalid export request" }, { status: 400 });
  }
}

function buildTextExport(project: Project) {
  const lines: string[] = [];

  lines.push("LIMIT LABS 8 CONTENT PACK");
  lines.push("");
  lines.push(`Input: ${project.input}`);
  lines.push(`Input Type: ${project.inputType}`);
  lines.push(`Tone: ${project.tone}`);
  lines.push(`Platform: ${project.platform}`);
  if (project.analysis) {
    lines.push(`Source Media: ${project.analysis.assetName}`);
    lines.push(`Duration: ${project.analysis.durationSeconds}s`);
    lines.push(`Music: ${project.analysis.hasMusic ? "Detected" : "Not detected"}`);
    lines.push(`Music Note: ${project.analysis.musicNote}`);
  }
  lines.push("");
  lines.push("HOOKS");
  project.hooks.forEach((value, index) => lines.push(`${index + 1}. ${value}`));
  lines.push("");
  lines.push("SCRIPTS");
  project.scripts.forEach((value, index) => lines.push(`${index + 1}. ${value}`));
  lines.push("");
  lines.push("CLIPS");
  project.clips.forEach((clip) => {
    lines.push(`${clip.id} | ${clip.time} | ${clip.title}`);
    lines.push(clip.text);
    lines.push(`Overlay: ${clip.overlay}`);
    lines.push("");
  });
  lines.push("CAPTIONS");
  project.captions.forEach((value, index) => lines.push(`${index + 1}. ${value}`));

  return lines.join("\n");
}
