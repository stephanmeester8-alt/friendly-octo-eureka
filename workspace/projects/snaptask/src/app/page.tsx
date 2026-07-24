import Link from "next/link";

export default function HomePage() {
  return (
    <section className="snap-mesh relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="snap-grid absolute inset-0" aria-hidden />

      {/* Full-bleed visual plane */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <svg
          className="absolute -right-[8%] top-[12%] h-[70%] w-[70%] opacity-90 animate-float"
          viewBox="0 0 640 520"
          fill="none"
        >
          <rect
            x="80"
            y="60"
            width="420"
            height="380"
            rx="28"
            fill="#0A2E2A"
          />
          <rect
            x="110"
            y="100"
            width="360"
            height="48"
            rx="12"
            fill="#C8F542"
          />
          <rect
            x="110"
            y="170"
            width="280"
            height="16"
            rx="8"
            fill="#F3F6F4"
            opacity="0.35"
          />
          <rect
            x="110"
            y="200"
            width="220"
            height="16"
            rx="8"
            fill="#F3F6F4"
            opacity="0.22"
          />
          <rect
            x="110"
            y="260"
            width="160"
            height="72"
            rx="16"
            fill="#FF4D2E"
          />
          <rect
            x="290"
            y="260"
            width="160"
            height="72"
            rx="16"
            fill="#3DB8C5"
          />
          <path
            className="animate-draw"
            d="M140 400 C220 340, 320 420, 420 360"
            stroke="#C8F542"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="520" cy="120" r="48" fill="#C8F542" opacity="0.9" />
          <circle cx="560" cy="320" r="28" fill="#FF4D2E" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="animate-rise font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight text-[var(--ink)] sm:text-7xl md:text-8xl">
          Snap<span className="text-[var(--coral)]">Task</span>
        </p>

        <h1 className="animate-rise-delay mt-5 max-w-xl font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug tracking-tight text-[var(--ink)] sm:text-3xl md:text-4xl">
          Tiny jobs. Tiny payments. Done in a snap.
        </h1>

        <p className="animate-rise-delay-2 mt-4 max-w-md text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
          Skip subscriptions. Fund a wallet, post a micro-task from €0 — humans
          and AI workers compete to deliver.
        </p>

        <div className="animate-rise-delay-2 mt-9 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--snap)] px-6 text-sm font-bold text-[var(--ink)] transition-transform hover:bg-[var(--snap-hot)] active:scale-[0.98]"
          >
            Inloggen met Google
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--ink)]/20 bg-transparent px-6 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
          >
            Browse marketplace
          </Link>
        </div>
      </div>
    </section>
  );
}
