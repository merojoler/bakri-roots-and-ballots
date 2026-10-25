import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Lock } from "lucide-react";
import { castVote, getVoting } from "@/lib/family.functions";
import { SiteShell, Avatar } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";

const votingQuery = queryOptions({ queryKey: ["voting"], queryFn: () => getVoting(), refetchInterval: 10000 });

export const Route = createFileRoute("/vote")({
  head: () => ({
    meta: [
      { title: "التصويت لمختار عائلة البكري" },
      { name: "description", content: "صوّت لاختيار مختار عائلة البكري وتابع النتائج مباشرة وبشفافية." },
      { property: "og:title", content: "انتخاب مختار عائلة البكري" },
      { property: "og:description", content: "صوت واحد لكل جهاز، ونتائج فورية شفافة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(votingQuery),
  component: VotePage,
});

const TOKEN_KEY = "bakri_voter_token";
const VOTED_KEY = "bakri_voted_for";

function VotePage() {
  const { data } = useSuspenseQuery(votingQuery);
  const qc = useQueryClient();
  const vote = useServerFn(castVote);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setVotedFor(localStorage.getItem(VOTED_KEY)), []);

  async function onVote(id: string) {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID() + crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, token);
    }
    setBusy(id);
    setMsg(null);
    try {
      const res = await vote({ data: { candidate_id: id, voter_token: token } });
      if (res.ok) {
        localStorage.setItem(VOTED_KEY, id);
        setVotedFor(id);
        setMsg("شكراً لك! تم تسجيل صوتك.");
      } else if (res.reason === "duplicate") {
        localStorage.setItem(VOTED_KEY, id);
        setVotedFor(id);
        setMsg("لقد قمت بالتصويت مسبقاً من هذا الجهاز.");
      } else setMsg("التصويت مغلق حالياً.");
      await qc.invalidateQueries({ queryKey: ["voting"] });
    } catch {
      setMsg("حدث خطأ، حاول مرة أخرى.");
    } finally {
      setBusy(null);
    }
  }

  const sorted = [...data.results].sort((a, b) => b.votes - a.votes);
  const leader = data.total > 0 ? sorted[0]?.id : null;

  return (
    <SiteShell>
      <section className="bg-hero relative text-primary-foreground">
        <div className="absolute inset-0 pattern-overlay opacity-60" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 text-center">
          <Award className="mx-auto size-9 text-gold" />
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-2 text-gold-gradient">انتخاب مختار العائلة</h1>
          <p className="mt-2 text-primary-foreground/75">صوت واحد لكل جهاز — النتائج تُحدَّث تلقائياً</p>
          <p className="mt-4 inline-block rounded-full bg-gold/20 text-gold px-4 py-1 text-sm">إجمالي الأصوات: {data.total}</p>
          {!data.open && (
            <p className="mt-3 flex items-center justify-center gap-2 text-gold"><Lock className="size-4" /> التصويت مغلق حالياً</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        {msg && <p className="rounded-xl bg-secondary text-secondary-foreground p-3 text-center font-medium">{msg}</p>}
        {data.results.length === 0 && <p className="text-center text-muted-foreground py-10">لا يوجد مرشحون بعد.</p>}
        {data.results.map((c) => (
          <article key={c.id} className={`rounded-2xl bg-card border p-5 shadow-card ${c.id === leader ? "border-gold" : "border-border"}`}>
            <div className="flex gap-4 items-start">
              <Avatar src={c.photo_url} name={c.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-2xl font-bold text-primary">{c.name}</h2>
                  {c.id === leader && <span className="text-xs rounded-full bg-gold-gradient text-emerald-deep px-2 py-0.5 font-bold">متصدر</span>}
                </div>
                {c.bio && <p className="text-sm text-muted-foreground mt-1">{c.bio}</p>}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">{c.percent}%</span>
                <span className="text-muted-foreground">{c.votes} صوت</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gold-gradient transition-all duration-700" style={{ width: `${c.percent}%` }} />
              </div>
            </div>
            <div className="mt-4">
              {votedFor === c.id ? (
                <p className="flex items-center gap-2 text-success font-bold"><CheckCircle2 className="size-5" /> صوّتّ لهذا المرشح</p>
              ) : (
                <Button
                  variant="gold"
                  className="w-full sm:w-auto rounded-full"
                  disabled={!!votedFor || !data.open || busy !== null}
                  onClick={() => onVote(c.id)}
                >
                  {busy === c.id ? "جارٍ التصويت..." : "صوّت لهذا المرشح"}
                </Button>
              )}
            </div>
          </article>
        ))}
      </section>
    </SiteShell>
  );
}
