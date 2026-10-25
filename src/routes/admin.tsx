import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, X, Pencil, Trash2, LogOut, Plus, ShieldCheck, RotateCcw, Lock, Unlock } from "lucide-react";
import {
  adminDeleteCandidate, adminDeleteMember, adminGetAll, adminLogin, adminLogout, adminSaveCandidate,
  adminSaveMember, adminSetStatus, adminStatus, adminVotingControl, type Member, type CandidateResult,
} from "@/lib/family.functions";
import { Avatar } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fileToCompressedDataUrl } from "@/lib/image";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — عائلة البكري" },
      { name: "description", content: "لوحة إدارة موقع عائلة البكري." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "لوحة الإدارة — عائلة البكري" },
      { property: "og:description", content: "منطقة خاصة بالإدارة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

function AdminPage() {
  const status = useServerFn(adminStatus);
  const { data, refetch, isLoading } = useQuery({ queryKey: ["admin-status"], queryFn: () => status() });
  if (isLoading) return <div className="min-h-screen bg-hero" />;
  return data?.admin ? <Dashboard onLogout={() => refetch()} /> : <Login onDone={() => refetch()} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const login = useServerFn(adminLogin);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen bg-hero flex items-center justify-center px-4">
      <form
        className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-gold space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const pw = String(new FormData(e.currentTarget).get("password") || "");
          const r = await login({ data: { password: pw } });
          setBusy(false);
          if (r.ok) onDone();
          else setErr(true);
        }}
      >
        <ShieldCheck className="mx-auto size-10 text-gold-deep" />
        <h1 className="font-display text-2xl font-bold text-center text-primary">دخول الإدارة</h1>
        <Input name="password" type="password" placeholder="كلمة المرور" autoComplete="current-password" required />
        {err && <p className="text-destructive text-sm text-center">كلمة المرور غير صحيحة</p>}
        <Button className="w-full" disabled={busy}>{busy ? "..." : "دخول"}</Button>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const getAll = useServerFn(adminGetAll);
  const logout = useServerFn(adminLogout);
  const setStatus = useServerFn(adminSetStatus);
  const delMember = useServerFn(adminDeleteMember);
  const control = useServerFn(adminVotingControl);
  const delCand = useServerFn(adminDeleteCandidate);
  const { data } = useQuery({ queryKey: ["admin-all"], queryFn: () => getAll() });
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const [editCand, setEditCand] = useState<Partial<CandidateResult> | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-all"] });
    qc.invalidateQueries({ queryKey: ["family"] });
    qc.invalidateQueries({ queryKey: ["voting"] });
  };
  const members = data?.members ?? [];
  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");
  const rejected = members.filter((m) => m.status === "rejected");
  const voting = data?.voting;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-emerald-deep text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-xl text-gold-gradient font-bold">لوحة إدارة عائلة البكري</h1>
          <Button variant="ghost" size="sm" className="text-primary-foreground" onClick={async () => { await logout(); onLogout(); }}>
            <LogOut /> خروج
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="طلبات معلقة" value={pending.length} />
          <Stat label="أفراد معتمدون" value={approved.length} />
          <Stat label="إجمالي الأصوات" value={voting?.total ?? 0} />
        </div>

        <Tabs defaultValue="pending" dir="rtl">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending">الطلبات ({pending.length})</TabsTrigger>
            <TabsTrigger value="members">الأفراد</TabsTrigger>
            <TabsTrigger value="voting">التصويت</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 && <p className="text-center text-muted-foreground py-10">لا توجد طلبات معلقة</p>}
            {pending.map((m) => (
              <MemberRow key={m.id} m={m} showPhone>
                <Button size="sm" variant="success" onClick={async () => { await setStatus({ data: { id: m.id, status: "approved" } }); refresh(); }}>
                  <Check /> قبول
                </Button>
                <Button size="sm" variant="destructive" onClick={async () => { await setStatus({ data: { id: m.id, status: "rejected" } }); refresh(); }}>
                  <X /> رفض
                </Button>
              </MemberRow>
            ))}
            {rejected.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-muted-foreground text-sm">الطلبات المرفوضة ({rejected.length})</summary>
                <div className="space-y-3 mt-3">
                  {rejected.map((m) => (
                    <MemberRow key={m.id} m={m} showPhone>
                      <Button size="sm" variant="outline" onClick={async () => { await setStatus({ data: { id: m.id, status: "approved" } }); refresh(); }}>قبول</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { if (confirm("حذف نهائي؟")) { await delMember({ data: { id: m.id } }); refresh(); } }}><Trash2 /></Button>
                    </MemberRow>
                  ))}
                </div>
              </details>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-3 mt-4">
            <Button variant="gold" onClick={() => setEditing({ is_elder: false })}><Plus /> إضافة فرد</Button>
            {approved.map((m) => (
              <MemberRow key={m.id} m={m} showPhone>
                <Button size="sm" variant="outline" onClick={() => setEditing(m)}><Pencil /></Button>
                <Button size="sm" variant="ghost" onClick={async () => { if (confirm(`حذف ${m.full_name}؟`)) { await delMember({ data: { id: m.id } }); refresh(); } }}><Trash2 className="text-destructive" /></Button>
              </MemberRow>
            ))}
          </TabsContent>

          <TabsContent value="voting" className="space-y-3 mt-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" onClick={() => setEditCand({})}><Plus /> إضافة مرشح</Button>
              {voting?.open ? (
                <Button variant="outline" onClick={async () => { await control({ data: { action: "close" } }); refresh(); }}><Lock /> إغلاق التصويت</Button>
              ) : (
                <Button variant="outline" onClick={async () => { await control({ data: { action: "open" } }); refresh(); }}><Unlock /> فتح التصويت</Button>
              )}
              <Button variant="destructive" onClick={async () => { if (confirm("تصفير جميع الأصوات؟")) { await control({ data: { action: "reset" } }); refresh(); } }}><RotateCcw /> تصفير الأصوات</Button>
            </div>
            <p className="text-sm text-muted-foreground">حالة التصويت: {voting?.open ? "مفتوح" : "مغلق"}</p>
            {voting?.results.map((c) => (
              <div key={c.id} className="rounded-xl bg-card border p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <Avatar src={c.photo_url} name={c.name} />
                  <div className="flex-1">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.votes} صوت — {c.percent}%</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditCand(c)}><Pencil /></Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (confirm(`حذف ${c.name} وأصواته؟`)) { await delCand({ data: { id: c.id } }); refresh(); } }}><Trash2 className="text-destructive" /></Button>
                </div>
                <div className="h-2 mt-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gold-gradient" style={{ width: `${c.percent}%` }} /></div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {editing && <MemberEditor initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {editCand && <CandidateEditor initial={editCand} onClose={() => setEditCand(null)} onSaved={refresh} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card border p-3 text-center shadow-card">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MemberRow({ m, children, showPhone }: { m: Member; children: React.ReactNode; showPhone?: boolean }) {
  return (
    <div className="rounded-xl bg-card border p-4 shadow-card flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={m.photo_url} name={m.full_name} />
        <div className="min-w-0 text-sm">
          <p className="font-bold text-base">{m.full_name} {m.is_elder && <span className="text-xs text-gold-deep">(من الكبار)</span>}</p>
          {m.father_name && <p>الأب/الجد: {m.father_name}</p>}
          {m.relation && <p>الصلة: {m.relation}</p>}
          {showPhone && m.phone && <p dir="ltr" className="text-right">{m.phone}</p>}
          {m.notes && <p className="text-muted-foreground">{m.notes}</p>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">{children}</div>
    </div>
  );
}

function PhotoInput({ value, onChange }: { value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-3">
      {value && <img src={value} alt="" className="size-14 rounded-full object-cover ring-2 ring-gold" />}
      <Input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange(await fileToCompressedDataUrl(f)); }} />
      {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><X /></Button>}
    </div>
  );
}

function MemberEditor({ initial, onClose, onSaved }: { initial: Partial<Member>; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(adminSaveMember);
  const [m, setM] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setM({ ...m, [k]: e.target.value });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto text-right">
        <DialogHeader className="text-right sm:text-right"><DialogTitle>{m.id ? "تعديل فرد" : "إضافة فرد"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save({ data: { id: m.id, full_name: m.full_name ?? "", father_name: m.father_name || null, relation: m.relation || null, phone: m.phone || null, notes: m.notes || null, photo_url: m.photo_url ?? null, is_elder: !!m.is_elder } });
            onSaved(); onClose();
          } catch { setErr("تعذر الحفظ، تحقق من البيانات."); }
        }}>
          <div className="space-y-1"><Label>الاسم الكامل</Label><Input value={m.full_name ?? ""} onChange={set("full_name")} required /></div>
          <div className="space-y-1"><Label>اسم الأب / الجد</Label><Input value={m.father_name ?? ""} onChange={set("father_name")} /></div>
          <div className="space-y-1"><Label>صلة القرابة</Label><Input value={m.relation ?? ""} onChange={set("relation")} /></div>
          <div className="space-y-1"><Label>الهاتف</Label><Input value={m.phone ?? ""} onChange={set("phone")} dir="ltr" /></div>
          <div className="space-y-1"><Label>نبذة / ملاحظات</Label><Textarea value={m.notes ?? ""} onChange={set("notes")} /></div>
          <div className="space-y-1"><Label>الصورة</Label><PhotoInput value={m.photo_url} onChange={(v) => setM({ ...m, photo_url: v })} /></div>
          <label className="flex items-center gap-3"><Switch checked={!!m.is_elder} onCheckedChange={(v) => setM({ ...m, is_elder: v })} /> عرض في قسم الأجداد وكبار العائلة</label>
          {err && <p className="text-destructive text-sm">{err}</p>}
          <Button className="w-full">حفظ</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CandidateEditor({ initial, onClose, onSaved }: { initial: Partial<CandidateResult>; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(adminSaveCandidate);
  const [c, setC] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="text-right">
        <DialogHeader className="text-right sm:text-right"><DialogTitle>{c.id ? "تعديل مرشح" : "إضافة مرشح"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          try { await save({ data: { id: c.id, name: c.name ?? "", bio: c.bio || null, photo_url: c.photo_url ?? null } }); onSaved(); onClose(); }
          catch { setErr("تعذر الحفظ."); }
        }}>
          <div className="space-y-1"><Label>الاسم</Label><Input value={c.name ?? ""} onChange={(e) => setC({ ...c, name: e.target.value })} required /></div>
          <div className="space-y-1"><Label>نبذة</Label><Textarea value={c.bio ?? ""} onChange={(e) => setC({ ...c, bio: e.target.value })} /></div>
          <div className="space-y-1"><Label>الصورة</Label><PhotoInput value={c.photo_url} onChange={(v) => setC({ ...c, photo_url: v })} /></div>
          {err && <p className="text-destructive text-sm">{err}</p>}
          <Button className="w-full">حفظ</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
