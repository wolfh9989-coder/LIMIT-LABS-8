import { randomInt } from "node:crypto";
import { getMemorySubscription, setMemorySubscription } from "@/lib/memory-store";
import { getSupabaseAdmin } from "@/lib/supabase";

export const OWNER_EMAIL = (process.env.LIMITLABS_OWNER_EMAIL ?? "limitlabs8@gmail.com").toLowerCase();
export const OWNER_USER_ID = process.env.LIMITLABS_OWNER_USER_ID ?? "";
export const OWNER_ACCOUNT_CODE = process.env.LIMITLABS_OWNER_ACCOUNT_CODE ?? "LAB22-0623-002";

export function isOwnerIdentity({ userId, email }: { userId: string; email?: string | null }) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  if (OWNER_USER_ID && userId === OWNER_USER_ID) {
    return true;
  }
  return !!normalizedEmail && normalizedEmail === OWNER_EMAIL;
}

function generateCandidateCode() {
  const mid = String(randomInt(0, 10000)).padStart(4, "0");
  const tail = String(randomInt(0, 1000)).padStart(3, "0");
  return `LAB22-${mid}-${tail}`;
}

// Produces the same LAB code for the same userId every time — no persistence required.
function generateDeterministicCode(userId: string) {
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = (Math.imul(33, h) ^ userId.charCodeAt(i)) >>> 0;
  }
  const mid = String(h % 10000).padStart(4, "0");
  const tail = String((h >>> 16) % 1000).padStart(3, "0");
  return `LAB22-${mid}-${tail}`;
}

async function generateUniqueSupabaseCode() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return generateCandidateCode();
  }

  for (let i = 0; i < 20; i += 1) {
    const candidate = generateCandidateCode();
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("tracking_code", candidate)
      .maybeSingle();

    if (!data?.user_id) {
      return candidate;
    }
  }

  return `LAB22-${Date.now().toString().slice(-4)}-${String(randomInt(0, 1000)).padStart(3, "0")}`;
}

export async function getOrCreateAccountCode({ userId, email }: { userId: string; email?: string | null }) {
  const supabase = getSupabaseAdmin();
  const owner = isOwnerIdentity({ userId, email });

  if (supabase) {
    const { data } = await supabase
      .from("subscriptions")
      .select("tracking_code,is_owner,plan,status")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.tracking_code) {
      if (owner && (!data.is_owner || data.plan !== "pro" || data.status !== "active")) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          tracking_code: data.tracking_code,
          is_owner: true,
          plan: "pro",
          status: "active",
          updated_at: new Date().toISOString(),
        });
      }

      return {
        accountCode: data.tracking_code,
        isOwner: owner || Boolean(data.is_owner),
      };
    }

    const accountCode = owner ? OWNER_ACCOUNT_CODE : await generateUniqueSupabaseCode();

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      tracking_code: accountCode,
      is_owner: owner,
      plan: owner ? "pro" : (data?.plan ?? "free"),
      status: owner ? "active" : (data?.status ?? "inactive"),
      updated_at: new Date().toISOString(),
    });

    return {
      accountCode,
      isOwner: owner,
    };
  }

  const current = getMemorySubscription(userId);
  if (current.trackingCode) {
    if (owner && (!current.isOwner || current.plan !== "pro" || current.status !== "active")) {
      setMemorySubscription(userId, {
        ...current,
        isOwner: true,
        plan: "pro",
        status: "active",
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      accountCode: current.trackingCode,
      isOwner: owner || Boolean(current.isOwner),
    };
  }

  const accountCode = owner ? OWNER_ACCOUNT_CODE : generateDeterministicCode(userId);
  setMemorySubscription(userId, {
    ...current,
    trackingCode: accountCode,
    isOwner: owner,
    plan: owner ? "pro" : current.plan,
    status: owner ? "active" : current.status,
    updatedAt: new Date().toISOString(),
  });

  return {
    accountCode,
    isOwner: owner,
  };
}
