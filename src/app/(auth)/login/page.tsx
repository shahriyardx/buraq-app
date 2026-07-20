import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { LoginForm } from "./login-form";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect(session.user.role === "ADMIN" ? "/admin" : "/student");

  const params = await searchParams;
  const redirectTo =
    typeof params.redirect === "string" && params.redirect.startsWith("/")
      ? params.redirect
      : "/";
  const inactive = params.error === "inactive";

  return (
    <div
      className={`${fraunces.variable} relative flex min-h-dvh items-center justify-center overflow-hidden p-5`}
    >
      {/* ── Paddock scene (full-bleed background) ─────────────────────── */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,#0d1f18 0%,#13302a 40%,#284733 66%,#8a6f3a 100%)",
          }}
        />
        {/* low sun glow on the horizon */}
        <div className="absolute bottom-[26%] left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#f4c56b_0%,#e0a24d44_42%,transparent_70%)] blur-[2px]" />

        {/* rolling hills */}
        <svg
          className="absolute inset-x-0 bottom-0 h-3/5 w-full"
          viewBox="0 0 600 400"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 250 Q150 200 320 240 T600 220 V400 H0 Z"
            fill="#1c3a2a"
            opacity="0.9"
          />
          <path d="M0 300 Q180 250 360 290 T600 280 V400 H0 Z" fill="#173021" />
          <path d="M0 342 Q160 315 340 348 T600 332 V400 H0 Z" fill="#0f1e15" />
        </svg>

        {/* white post-and-rail fence */}
        <svg
          className="absolute inset-x-0 bottom-[20%] w-full opacity-90"
          viewBox="0 0 600 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g fill="#e9e2d0">
            <rect x="0" y="14" width="600" height="7" rx="2" />
            <rect x="0" y="40" width="600" height="7" rx="2" />
            {[30, 140, 250, 360, 470, 570].map((x) => (
              <rect key={x} x={x} y="6" width="10" height="62" rx="2" />
            ))}
          </g>
        </svg>

        {/* grain + vignette */}
        <div className="buraq-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(130%_120%_at_50%_15%,transparent_45%,#08130d_100%)]" />
      </div>

      {/* ── Login card ────────────────────────────────────────────────── */}
      <div
        className="buraq-rise relative w-full max-w-md rounded-2xl border border-[#e6c079]/40 bg-[#f4ece0] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] sm:p-10"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="buraq-grain pointer-events-none absolute inset-0 rounded-2xl opacity-[0.04]" />
        {/* brass hairline at the top edge */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#c99a3f] to-transparent" />

        <div className="relative flex flex-col items-center text-center text-[#20302a]">
          <Horseshoe className="buraq-float size-14 text-[#a5772f]" />
          <p className="mt-4 text-[11px] uppercase tracking-[0.4em] text-[#a5772f]">
            Est. 2011
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-[2rem] font-medium leading-tight tracking-tight">
            Buraq Riding School
          </h1>
          <p className="mt-2 max-w-xs text-sm text-[#20302a]/60">
            Welcome back to the stable — sign in to saddle up your dashboard.
          </p>
        </div>

        <div className="relative mt-8 w-full">
          {inactive && (
            <div className="mb-4 rounded-md border border-red-800/25 bg-red-900/5 p-3 text-sm text-red-900">
              Your account is inactive. Please contact the stable office.
            </div>
          )}
          <LoginForm redirectTo={redirectTo} />
        </div>

        <div className="relative mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#20302a]/35">
          <span className="h-px flex-1 bg-[#20302a]/12" />
          Ride safe
          <span className="h-px flex-1 bg-[#20302a]/12" />
        </div>
      </div>

      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-[#f2ead6]/45">
        © {new Date().getFullYear()} Buraq Horse Riding School
      </p>
    </div>
  );
}

function Horseshoe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden>
      <path
        d="M30 16 A34 34 0 1 0 70 16"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M30 16 A34 34 0 1 0 70 16"
        stroke="#00000022"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[
        [22, 40],
        [20, 58],
        [30, 74],
        [70, 74],
        [80, 58],
        [78, 40],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="2.4"
          fill="currentColor"
          opacity="0.5"
        />
      ))}
    </svg>
  );
}
