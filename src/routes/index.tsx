import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Crown, ChevronDown } from "lucide-react";
import { getFamily } from "@/lib/family.functions";
import { normName } from "@/lib/family-tree";
import { SiteShell, Avatar } from "@/components/SiteShell";
import { AddMemberDialog } from "@/components/AddMemberDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EldersStrip } from "@/components/EldersStrip";

const familyQuery = queryOptions({ queryKey: ["family"], queryFn: () => getFamily(), staleTime: 60_000 });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "شجرة عائلة البكري" },
      { name: "description", content: "شجرة عائلة البكري: الأجداد وكبار العائلة وجميع أفرادها في مكان واحد." },
      { property: "og:title", content: "شجرة عائلة البكري" },
      { property: "og:description", content: "تعرّف على أجداد وأفراد عائلة البكري وأضف أقاربك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyQuery),
  component: Home,
});

type M = Awaited<ReturnType<typeof getFamily>>["members"][number];

function Home() {
  const { data } = useSuspenseQuery(familyQuery);
  const [q, setQ] = useState("");

  const { roots, children, visible, hits } = useMemo(() => {
    const ids = new Set(data.members.map((m) => m.id));
    const children = new Map<string, M[]>();
    const roots: M[] = [];
    for (const m of data.members) {
      if (m.parent_id && ids.has(m.parent_id)) children.set(m.parent_id, [...(children.get(m.parent_id) ?? []), m]);
      else roots.push(m);
    }
    roots.sort((a, b) => Number(b.is_elder) - Number(a.is_elder));
    const term = normName(q);
    if (!term) return { roots, children, visible: null as Set<string> | null, hits: new Set<string>() };
    const byId = new Map(data.members.map((m) => [m.id, m]));
    const visible = new Set<string>();
    const hits = new Set<string>();
     const addDesc = (id: string) => { if (visible.has(id)) return; visible.add(id); for (const c of children.get(id) ?? []) addDesc(c.id); };
    for (const m of data.members) {
      if (!normName(m.full_name).includes(term)) continue;
      hits.add(m.id);
      addDesc(m.id);
      let p = m.parent_id ? byId.get(m.parent_id) : undefined;
      while (p && !visible.has(p.id)) { visible.add(p.id); p = p.parent_id ? byId.get(p.parent_id) : undefined; }
      if (p) visible.add(p.id);
    }
    return { roots, children, visible, hits };
  }, [data.members, q]);

  const shownRoots = visible ? roots.filter((r) => visible.has(r.id)) : roots;

  return (
    <SiteShell>
      <section className="bg-hero relative overflow-hidden text-primary-foreground">
        <div className="absolute inset-0 pattern-overlay opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
            <Crown className="size-3.5" /> الأجداد وكبار العائلة
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-3 text-gold-gradient">جذورنا الطيبة</h1>
        </div>
        <EldersStrip elders={data.elders} />
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-primary">شجرة العائلة</h2>
            <p className="text-muted-foreground text-sm">{data.members.length} فرداً معتمداً</p>
          </div>
          <AddMemberDialog />
        </div>

        <div className="relative mt-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن اسم..." className="pr-9 h-11 bg-card" />
        </div>

        {shownRoots.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{q ? "لا توجد نتائج" : "لا يوجد أفراد بعد — كن أول من يضيف قريباً!"}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {shownRoots.map((r) => (
              <Node key={r.id} m={r} children={children} visible={visible} hits={hits} depth={0} />
            ))}
          </ul>
        )}
      </section>
    </SiteShell>
  );
}

function Node({ m, children, visible, hits, depth }: {
  m: M; children: Map<string, M[]>; visible: Set<string> | null; hits: Set<string>; depth: number;
}) {
  const kids = (children.get(m.id) ?? []).filter((k) => !visible || visible.has(k.id));
  const [open, setOpen] = useState(depth < 2);
  const expanded = open || !!visible;
  const hit = hits.has(m.id);
  return (
    <li className="relative">
      {depth > 0 && <span aria-hidden="true" className="absolute -right-3 sm:-right-4 top-7 h-0.5 w-3 sm:w-4 bg-gold/50" />}
      <div
        className={`relative flex items-center gap-3 rounded-lg border bg-card p-2.5 shadow-card ${hit ? "border-gold ring-2 ring-gold/40" : "border-border"} ${depth === 0 ? "border-r-4 border-r-gold" : ""}`}
      >
        <Avatar src={m.photo_url} name={m.full_name} />
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug break-words">{m.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {m.is_elder ? <span className="text-gold-deep font-semibold">من كبار العائلة · </span> : depth === 0 && m.father_name ? "رأس فرع · " : ""}
            {m.relation ?? ""}
            {kids.length > 0 && ` · ${kids.length} من الأبناء`}
          </p>
        </div>
        {kids.length > 0 && !visible && (
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={`عرض أبناء ${m.full_name}`} aria-expanded={open} className="shrink-0 text-primary">
            <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        )}
      </div>
      {kids.length > 0 && expanded && (
        <ul className="relative mr-2 sm:mr-5 mt-3 space-y-3 border-r-2 border-gold/50 pr-3 sm:pr-4">
          {kids.map((k) => (
            <Node key={k.id} m={k} children={children} visible={visible} hits={hits} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
