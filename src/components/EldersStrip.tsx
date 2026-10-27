import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/SiteShell";
import { elderRepeatCount } from "@/lib/family-tree";

type Elder = { id: string; full_name: string; photo_url: string | null; relation: string | null };

export function EldersStrip({ elders }: { elders: Elder[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  if (!elders.length) return null;
  const animated = elders.length >= 3;
  const repeats = elderRepeatCount(elders.length, width);
  const sequence = Array.from({ length: repeats }, () => elders).flat();
  return (
    <div ref={viewport} className={`elders-viewport relative pb-6 ${animated ? "mask-fade-x" : ""}`} dir="ltr" aria-label="الأجداد وكبار العائلة">
      <div className={`elders-track ${animated ? "elders-moving" : "elders-static"}`}>
        {Array.from({ length: animated ? 2 : 1 }, (_, group) => (
          <div key={group} className="elders-sequence" aria-hidden={group === 1 ? true : undefined} style={{ animationDuration: `${sequence.length * 172 / 32}s` }}>
            {sequence.map((elder, i) => (
              <article key={`${elder.id}-${i}`} dir="rtl" aria-hidden={i >= elders.length ? true : undefined} className="elder-tile border border-gold/30 bg-primary-foreground/5 rounded-lg flex flex-col items-center justify-center px-3 py-3">
                <Avatar src={elder.photo_url} name={elder.full_name} size="sm" />
                <h2 className="font-display text-sm font-bold text-center leading-snug mt-2 w-full break-words">{elder.full_name}</h2>
                {elder.relation && <span className="text-gold text-[10px] mt-1 text-center">{elder.relation}</span>}
              </article>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}