import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveProtectedIdentity = vi.fn();
const getEntitlement = vi.fn();
const getSupabaseAdmin = vi.fn();
const saveMemoryJob = vi.fn();
const getMemoryJobs = vi.fn(() => []);

vi.mock("@/lib/auth", () => ({ resolveProtectedIdentity }));
vi.mock("@/lib/entitlement", () => ({ getEntitlement }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/memory-store", () => ({ saveMemoryJob, getMemoryJobs }));

describe("POST /api/export/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProtectedIdentity.mockResolvedValue({ userId: "u1", email: null, source: "local" });
    getSupabaseAdmin.mockReturnValue(null);
  });

  it("blocks queueing for free plan", async () => {
    getEntitlement.mockResolvedValue({ plan: "free", canExport: false, userId: "u1", status: "inactive", lifecycle: {} });
    const { POST } = await import("@/app/api/export/jobs/route");

    const req = new Request("http://localhost/api/export/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "u1", projectId: "p1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(saveMemoryJob).not.toHaveBeenCalled();
  });

  it("queues a memory job for pro plan", async () => {
    getEntitlement.mockResolvedValue({ plan: "pro", canExport: true, userId: "u1", status: "active", lifecycle: {} });
    const { POST } = await import("@/app/api/export/jobs/route");

    const req = new Request("http://localhost/api/export/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "abc-1" },
      body: JSON.stringify({ userId: "u1", projectId: "p1", clipIds: ["1", "2"] }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.job.projectId).toBe("p1");
    expect(saveMemoryJob).toHaveBeenCalledTimes(1);
  });

  it("returns 409 for duplicate idempotency key", async () => {
    getEntitlement.mockResolvedValue({ plan: "pro", canExport: true, userId: "u1", status: "active", lifecycle: {} });
    const { POST } = await import("@/app/api/export/jobs/route");

    const first = new Request("http://localhost/api/export/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "dup-key" },
      body: JSON.stringify({ userId: "u1", projectId: "p1" }),
    });
    const second = new Request("http://localhost/api/export/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "dup-key" },
      body: JSON.stringify({ userId: "u1", projectId: "p1" }),
    });

    const firstRes = await POST(first);
    const secondRes = await POST(second);

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(409);
  });
});
