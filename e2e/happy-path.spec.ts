import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function seedProSubscription(userId: string) {
  const storePath = join(process.cwd(), ".limitlabs", "local-store.json");
  mkdirSync(join(process.cwd(), ".limitlabs"), { recursive: true });

  const current = existsSync(storePath)
    ? JSON.parse(readFileSync(storePath, "utf8").toString() || "{}")
    : {};
  current.projectsByUser = current.projectsByUser ?? {};
  current.subscriptionsByUser = current.subscriptionsByUser ?? {};
  current.jobsByUser = current.jobsByUser ?? {};
  current.mediaAssetsByUser = current.mediaAssetsByUser ?? {};
  current.billingProfilesByUser = current.billingProfilesByUser ?? {};

  current.subscriptionsByUser[userId] = {
    plan: "pro",
    status: "active",
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(storePath, JSON.stringify(current, null, 2));
}

test("happy path: create project, edit project, queue export", async ({ request }) => {
  const userId = `e2e-${Date.now()}`;
  const now = new Date().toISOString();
  seedProSubscription(userId);

  const project = {
    id: `proj-${Date.now()}`,
    name: "E2E Project",
    input: "Seed input",
    inputType: "idea",
    tone: "Energetic",
    platform: "TikTok",
    scripts: ["Script A"],
    hooks: ["Hook A"],
    captions: ["Caption A"],
    tweets: ["Tweet A"],
    thread: ["Thread A"],
    overlays: ["Overlay A"],
    clips: [{ id: "1", time: "0:00-0:06", title: "Clip 1", text: "Clip text", overlay: "Overlay", startMs: 0, endMs: 6000 }],
    blogs: ["Blog A"],
    fonts: ["Orbitron"],
    createdAt: now,
    updatedAt: now,
  };

  const createRes = await request.post("/api/projects", {
    data: { userId, project },
  });
  expect(createRes.ok()).toBeTruthy();

  const editRes = await request.post("/api/projects", {
    data: {
      userId,
      project: {
        ...project,
        scripts: ["Script A", "Script B"],
        workspaceState: { recommendedCaption: "Updated in e2e" },
        updatedAt: new Date().toISOString(),
      },
    },
  });
  expect(editRes.ok()).toBeTruthy();

  const queueRes = await request.post("/api/export/jobs", {
    headers: { "x-idempotency-key": `idem-${project.id}` },
    data: { userId, projectId: project.id, clipIds: ["1"] },
  });
  expect(queueRes.ok()).toBeTruthy();

  const queued = await queueRes.json();
  expect(queued.job.status).toBe("queued");

  const jobsRes = await request.get(`/api/export/jobs?userId=${userId}`);
  expect(jobsRes.ok()).toBeTruthy();
  const jobsPayload = await jobsRes.json();
  expect(Array.isArray(jobsPayload.jobs)).toBeTruthy();
  expect(jobsPayload.jobs.length).toBeGreaterThan(0);
});
