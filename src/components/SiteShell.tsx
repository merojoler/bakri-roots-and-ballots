import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TreePine, Vote } from "lucide-react";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-emerald-deep/95 backdrop-blur border-b border-gold/30">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-gold-gradient font-bold">
            عائلة البكري
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link
              to="/"
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-primary-foreground/80 hover:text-gold"
              activeProps={{ className: "bg-gold/15 text-gold" }}
              activeOptions={{ exact: true }}
            >
              <TreePine className="size-4" /> الشجرة
            </Link>
            <Link
              to="/vote"
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-primary-foreground/80 hover:text-gold"
              activeProps={{ className: "bg-gold/15 text-gold" }}
            >
              <Vote className="size-4" /> التصويت
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-emerald-deep text-primary-foreground/70 text-center text-sm py-6">
        © عائلة البكري — صلة الرحم أمانة
        <Link to="/admin" aria-label="إدارة" className="inline-block size-2 rounded-full bg-gold/20 mx-2 align-middle" />
      </footer>
    </div>
  );
}

export function Avatar({ src, name, size = "md" }: { src?: string | null; name: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-28 text-4xl" : "size-14 text-xl";
  return src ? (
    <img src={src} alt={name} className={`${cls} rounded-full object-cover ring-2 ring-gold`} />
  ) : (
    <div className={`${cls} rounded-full bg-gold-gradient text-emerald-deep font-display font-bold flex items-center justify-center ring-2 ring-gold/60`}>
      {name.replace(/^(الحاج|الحاجة)\s+/, "").charAt(0)}
    </div>
  );
}
