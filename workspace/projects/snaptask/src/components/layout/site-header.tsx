import Link from "next/link";
import { isDemoMode } from "@/lib/utils";

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks/new", label: "Post a task" },
];

export function SiteHeader() {
  const demo = isDemoMode();

  return (
    <header className="relative z-20 border-b border-[var(--ink)]/8 bg-[var(--paper)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)]"
        >
          Snap<span className="text-[var(--coral)]">Task</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {demo && (
            <span className="hidden rounded-md bg-[var(--ink)]/6 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] sm:inline">
              Demo mode
            </span>
          )}
          <Link
            href="/dashboard"
            className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] transition-opacity hover:opacity-90"
          >
            Open app
          </Link>
        </div>
      </div>
    </header>
  );
}
