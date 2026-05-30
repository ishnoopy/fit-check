import phoneMockup from "@/assets/tuff-landing-page-phone-mockup.png";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Check,
  Dumbbell,
  Flame,
  ListChecks,
  Play,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "TUFF - Train, log, repeat.",
  description:
    "A warm, fast workout tracker for lifters who want clear logging, visible consistency, and less friction between sets.",
  keywords: [
    "workout tracker",
    "fitness app",
    "progressive overload",
    "gym tracker",
    "workout logger",
    "strength training",
    "fitness tracking",
  ],
  authors: [{ name: "TUFF" }],
  openGraph: {
    title: "TUFF - Train, log, repeat.",
    description:
      "A fast workout tracker built around simple logging, visible progress, and between-set clarity.",
    type: "website",
    siteName: "TUFF",
  },
  twitter: {
    card: "summary_large_image",
    title: "TUFF - Train, log, repeat.",
    description:
      "A fast workout tracker built around simple logging, visible progress, and between-set clarity.",
  },
};

const proofStats = [
  { value: "0:42", label: "rest left" },
  { value: "13", label: "weeks visible" },
  { value: "1 tap", label: "to log a set" },
];

const flow = [
  {
    icon: ListChecks,
    title: "Pick the plan",
    copy: "Open today with the workout already in order.",
  },
  {
    icon: Dumbbell,
    title: "Log the set",
    copy: "Reps, weight, notes, and last performance stay close.",
  },
  {
    icon: TrendingUp,
    title: "See the pattern",
    copy: "Training days turn into a visible grid, not a buried report.",
  },
];

const details = [
  "Active plan memory",
  "Rest timer",
  "Exercise history",
  "Training grid",
  "Streak buffer",
  "Coach prompts",
];

export default async function LandingPage() {
  const cookieStore = await cookies();

  if (cookieStore.has("access_token") || cookieStore.has("refresh_token")) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 tuff-landing-grid" />

      <header className="sticky top-0 z-50 border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-4xl font-black leading-none tracking-normal">
              TUFF
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-start gap-12 px-4 pb-16 pt-8 sm:px-6 md:min-h-[calc(100svh-73px)] lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.82fr)] lg:items-center lg:gap-10 lg:pt-10">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary bg-secondary px-4 py-2 text-sm font-black text-secondary-foreground">
            <Timer className="size-4 text-primary" />
            Live workout tracking without the clutter
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.9] tracking-normal sm:text-7xl md:text-8xl lg:text-9xl">
            Train.
            <br />
            Log.
            <br />
            Repeat.
          </h1>

          <p className="mt-5 max-w-2xl text-lg font-black leading-tight text-foreground sm:text-2xl md:text-3xl">
            TUFF turns the messy middle of a workout into a clear session flow:
            what to lift, what you did last time, and what is already done.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-14 px-7 text-base" asChild>
              <Link href="/register">
                Start training free
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-14 px-7 text-base"
              asChild
            >
              <Link href="#session">
                <Play className="size-5" />
                Watch the flow
              </Link>
            </Button>
          </div>

          <div className="mt-8 hidden max-w-2xl grid-cols-3 gap-3 sm:grid">
            {proofStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[24px] border border-secondary bg-secondary p-4 text-secondary-foreground"
              >
                <p className="text-3xl font-black leading-none text-primary">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs font-black leading-tight">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[32rem] lg:max-w-[36rem] lg:justify-self-end xl:max-w-[38rem]">
          <div className="absolute inset-x-10 bottom-3 h-32 rounded-full bg-secondary/25 blur-3xl" />
          <div className="absolute -left-1 bottom-10 hidden rounded-[24px] border border-border bg-card px-4 py-3 shadow-lg sm:block lg:left-2">
            <p className="text-2xl font-black leading-none text-accent">+1</p>
            <p className="mt-1 text-xs font-black text-muted-foreground">
              workout logged
            </p>
          </div>
          <div className="relative isolate flex min-h-[23rem] items-center justify-center overflow-visible sm:min-h-[29rem] lg:min-h-[34rem]">
            <Image
              src={phoneMockup}
              alt="Angled TUFF mobile dashboard showing the training grid and workout cards"
              priority
              sizes="(min-width: 1024px) 620px, 92vw"
              className="relative z-10 h-auto max-h-[30rem] w-full object-contain drop-shadow-2xl sm:max-h-[36rem] lg:max-h-[40rem]"
            />
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-sidebar-border bg-sidebar px-4 py-2 text-xs font-black text-sidebar-foreground shadow-lg">
              <span className="size-2 rounded-full bg-chart-4 tuff-live-dot" />
              live session
            </div>
          </div>
        </div>
      </section>

      <section
        id="session"
        className="relative border-y border-border bg-secondary text-secondary-foreground"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.7fr_1fr] lg:py-20">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-primary">
              Session flow
            </p>
            <h2 className="mt-4 text-5xl font-black leading-none sm:text-6xl">
              The app should feel like it is already spotting you.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {flow.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="tuff-reveal rounded-[30px] border border-sidebar-border bg-sidebar-accent p-5"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-2xl font-black leading-none">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-secondary-foreground/75">
                    {item.copy}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[40px] border border-border bg-card p-6 sm:p-8">
            <div className="mb-8 flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                <Activity className="size-6" />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Why it sticks
                </p>
                <h2 className="text-4xl font-black leading-none sm:text-5xl">
                  Consistency becomes visible.
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {details.map((detail) => (
                <div
                  key={detail}
                  className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chart-4 text-secondary-foreground">
                    <Check className="size-4" />
                  </span>
                  <span className="text-sm font-black">{detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[40px] border border-secondary bg-accent p-6 text-accent-foreground sm:p-8">
            <Flame className="size-12 text-primary" />
            <h2 className="mt-6 text-5xl font-black leading-none">
              Stop restarting. Keep the streak warm.
            </h2>
            <p className="mt-5 text-lg font-semibold leading-relaxed text-accent-foreground/85">
              TUFF is built for the reality of training: missed days, rest
              buffers, active plans, and quick logging when your hands are still
              chalky.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-[44px] border border-secondary bg-secondary text-secondary-foreground">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-primary">
                Start today
              </p>
              <h2 className="mt-4 max-w-4xl text-6xl font-black leading-[0.88] sm:text-7xl">
                Your next session should not start from memory.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button size="lg" className="h-14 px-8 text-base" asChild>
                <Link href="/register">
                  Create your account
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 border-sidebar-border bg-sidebar-accent px-8 text-base text-secondary-foreground hover:bg-sidebar-accent/80"
                asChild
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-sidebar-border">
            {[
              { icon: Timer, label: "Rest timer" },
              { icon: CalendarCheck, label: "Logged days" },
              { icon: Flame, label: "Streaks" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-center gap-2 border-r border-sidebar-border px-3 py-5 last:border-r-0"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="hidden text-sm font-black sm:inline">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
