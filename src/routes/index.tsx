import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Crown } from "lucide-react";
import { getFamily } from "@/lib/family.functions";
import { SiteShell, Avatar } from "@/components/SiteShell";
import { AddMemberDialog } from "@/components/AddMemberDialog";
import { Input } from "@/components/ui/input";

const familyQuery = queryOptions({ queryKey: ["family"], queryFn: () => getFamily() });

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

function Home() {
  const { data } = useSuspenseQuery(familyQuery);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const filtered = data.members.filter((m) =>
      [m.full_name, m.father_name, m.relation].some((v) => v?.includes(q.trim())),
    );
    const map = new Map<string, typeof filtered>();
    for (const m of filtered) {
      const key = m.father_name?.trim() || "أفراد العائلة";
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [data.members, q]);

  return (
    <SiteShell>
      {/* Elders */}
      <section className="bg-hero relative overflow-hidden text-primary-foreground">
        <div className="absolute inset-0 pattern-overlay opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 text-center">
          <Crown className="mx-auto size-8 text-gold" />
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-2 text-gold-gradient">الأجداد وكبار العائلة</h1>
          <p className="mt-2 text-primary-foreground/75">جذورنا الطيبة التي نعتز بها</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.elders.map((e) => (
              <article key={e.id} className="rounded-2xl border border-gold/30 bg-primary-foreground/5 backdrop-blur p-6 flex flex-col items-center">
                <Avatar src={e.photo_url} name={e.full_name} size="lg" />
                <h2 className="font-display text-2xl mt-4 font-bold">{e.full_name}</h2>
                {e.relation && <span className="mt-1 text-xs rounded-full bg-gold/20 text-gold px-3 py-1">{e.relation}</span>}
                {e.notes && <p className="mt-3 text-sm text-primary-foreground/75 leading-relaxed">{e.notes}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tree */}
      <section className="mx-auto max-w-6xl px-4 py-10">
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

        {groups.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">لا يوجد أفراد بعد — كن أول من يضيف قريباً!</p>
        ) : (
          <div className="mt-8 space-y-8">
            {groups.map(([father, kids]) => (
              <div key={father} className="relative border-r-2 border-gold/50 pr-5">
                <div className="absolute -right-[9px] top-1 size-4 rounded-full bg-gold-gradient" />
                <h3 className="font-display text-xl font-bold text-primary mb-3">
                  {father === "أفراد العائلة" ? father : `أبناء ${father}`}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {kids.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card border border-border">
                      <Avatar src={m.photo_url} name={m.full_name} />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{m.full_name}</p>
                        {m.relation && <p className="text-xs text-gold-deep">{m.relation}</p>}
                        {m.notes && <p className="text-xs text-muted-foreground line-clamp-2">{m.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
