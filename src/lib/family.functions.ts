import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { resolveParents } from "./family-tree";
export { normName } from "./family-tree";

export type Member = {
  id: string;
  full_name: string;
  father_name: string | null;
  relation: string | null;
  photo_url: string | null;
  phone: string | null;
  notes: string | null;
  is_elder: boolean;
  status: string;
  created_at: string;
  parent_id: string | null;
};

export type CandidateResult = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  votes: number;
  percent: number;
};

type AdminSession = { admin?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "bakri-admin",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" },
  };
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.admin) throw new Error("غير مصرح");
}

/** Re-evaluate all links after approval, editing or deletion, including children added first. */
async function relinkTree() {
  const supabase = await db();
  const { data, error } = await supabase.from("members").select("id, full_name, father_name, parent_id, status");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const parents = resolveParents(rows);
  await Promise.all(
    rows.map(async (r) => {
      const parent = parents.get(r.id) ?? null;
      if (parent === r.parent_id) return;
      const { error } = await supabase.from("members").update({ parent_id: parent }).eq("id", r.id);
      if (error) throw new Error(error.message);
    }),
  );
}

const photoSchema = z
  .string()
  .max(600_000, "الصورة كبيرة جداً")
  .refine((v) => v.startsWith("data:image/"), "صيغة صورة غير صالحة")
  .nullable()
  .default(null);

/* ---------------- Public ---------------- */

export const getFamily = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await db();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, father_name, relation, photo_url, notes, is_elder, created_at, parent_id")
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const approved = data ?? [];
  const parents = resolveParents(approved);
  const rows = approved.map((m) => ({ ...m, parent_id: parents.get(m.id) ?? null }));
  return {
    elders: rows.filter((m) => m.is_elder),
    members: rows,
  };
});

const memberInput = z.object({
  full_name: z.string().trim().min(2, "الاسم مطلوب").max(120),
  father_name: z.string().trim().max(120).nullable().default(null),
  relation: z.string().trim().max(80).nullable().default(null),
  phone: z.string().trim().max(30).nullable().default(null),
  notes: z.string().trim().max(1000).nullable().default(null),
  photo_url: photoSchema,
});

export const submitMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    memberInput
      .extend({
        full_name: z.string().trim().max(120).refine((v) => v.split(/\s+/).length >= 4, "أدخل الاسم الرباعي"),
        father_name: z.string().trim().min(2, "اسم الأب مطلوب").max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = await db();
    const { data: approved, error: readError } = await supabase.from("members").select("id, full_name, father_name, status").eq("status", "approved");
    if (readError) throw new Error(readError.message);
    const id = crypto.randomUUID();
    const parent_id = resolveParents([...(approved ?? []), { ...data, id, status: "pending" }]).get(id) ?? null;
    const { error } = await supabase.from("members").insert({ ...data, id, parent_id, status: "pending", is_elder: false });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function computeResults() {
  const supabase = await db();
  const [{ data: cands, error: e1 }, { data: votes, error: e2 }, { data: setting }] = await Promise.all([
    supabase.from("candidates").select("id, name, bio, photo_url").order("created_at"),
    supabase.from("votes").select("candidate_id"),
    supabase.from("settings").select("value").eq("key", "voting_open").maybeSingle(),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  const total = votes?.length ?? 0;
  const counts = new Map<string, number>();
  for (const v of votes ?? []) counts.set(v.candidate_id, (counts.get(v.candidate_id) ?? 0) + 1);
  const results: CandidateResult[] = (cands ?? []).map((c) => {
    const n = counts.get(c.id) ?? 0;
    return { ...c, votes: n, percent: total ? Math.round((n / total) * 1000) / 10 : 0 };
  });
  return { results, total, open: setting?.value !== "false" };
}

export const getVoting = createServerFn({ method: "GET" }).handler(() => computeResults());

export const castVote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ candidate_id: z.string().uuid(), voter_token: z.string().min(16).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = await db();
    const { data: setting } = await supabase.from("settings").select("value").eq("key", "voting_open").maybeSingle();
    if (setting?.value === "false") return { ok: false as const, reason: "closed" as const };
    const { error } = await supabase.from("votes").insert(data);
    if (error) {
      if (error.code === "23505") return { ok: false as const, reason: "duplicate" as const };
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

/* ---------------- Admin ---------------- */

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("ADMIN_PASSWORD غير مضبوطة");
    const a = createHash("sha256").update(String(data.password ?? "")).digest();
    const b = createHash("sha256").update(expected).digest();
    if (!timingSafeEqual(a, b)) return { ok: false };
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ admin: true });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true };
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { admin: !!session.data.admin };
});

export const adminGetAll = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const supabase = await db();
  const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const voting = await computeResults();
  return { members: (data ?? []) as Member[], voting };
});

export const adminSetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected", "pending"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    const { error } = await supabase.from("members").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await relinkTree();
    return { ok: true };
  });

export const adminSaveMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    memberInput.extend({ id: z.string().uuid().optional(), is_elder: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    const { id, ...rest } = data;
    const { error } = id
      ? await supabase.from("members").update(rest).eq("id", id)
      : await supabase.from("members").insert({ ...rest, status: "approved" });
    if (error) throw new Error(error.message);
    await relinkTree();
    return { ok: true };
  });

export const adminDeleteMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    const { error } = await supabase.from("members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await relinkTree();
    return { ok: true };
  });

export const adminSaveCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        bio: z.string().trim().max(1000).nullable().default(null),
        photo_url: photoSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    const { id, ...rest } = data;
    const { error } = id
      ? await supabase.from("candidates").update(rest).eq("id", id)
      : await supabase.from("candidates").insert(rest);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    const { error } = await supabase.from("candidates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminVotingControl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ action: z.enum(["open", "close", "reset"]) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    if (data.action === "reset") {
      const { error } = await supabase.from("votes").delete().not("id", "is", null);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "voting_open", value: data.action === "open" ? "true" : "false" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
