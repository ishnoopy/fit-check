import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/fit-check-logo.png";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Dumbbell,
  FileText,
  Flame,
  ListChecks,
  Play,
  Target,
  Timer,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FitCheck - Stop Guessing. Start Progressing.",
  description:
    "The no-BS workout tracker. Simple logging, smart tracking, progressive overload made easy. For lifters who want results, not distractions. Free forever.",
  keywords: [
    "workout tracker",
    "fitness app",
    "progressive overload",
    "gym tracker",
    "workout logger",
    "strength training",
    "fitness tracking",
  ],
  authors: [{ name: "FitCheck" }],
  openGraph: {
    title: "FitCheck - Stop Guessing. Start Progressing.",
    description:
      "The no-BS workout tracker built for lifters. Track your progress, beat your PRs, and get stronger.",
    type: "website",
    siteName: "FitCheck",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitCheck - Stop Guessing. Start Progressing.",
    description:
      "The no-BS workout tracker built for lifters. Track your progress, beat your PRs, and get stronger.",
  },
};

const mainFeatures = [
  {
    icon: Dumbbell,
    title: "Simple Workout Logging",
    description:
      "Log sets, reps, and weight with an intuitive interface. Built-in timer keeps you on track. See your last workout instantly—no digging required.",
    highlight: "Built for lifters who train, not browse.",
  },
  {
    icon: TrendingUp,
    title: "Progressive Overload Made Easy",
    description:
      "Previous workout data right at your fingertips. Beat your numbers, track your PRs, and watch yourself get stronger session by session.",
    highlight: "Every rep counts. Every session matters.",
  },
  {
    icon: ListChecks,
    title: "Plans & Exercises",
    description:
      "Create workout plans, organize exercises, and structure your training. Your program, your way. No cookie-cutter BS.",
    highlight: "Your routine. Your rules.",
  },
  {
    icon: BarChart3,
    title: "Stats That Matter",
    description:
      "Track your streak, total workout days, and weekly averages. Visual calendar shows your consistency at a glance. Stay accountable.",
    highlight: "Progress you can see. Results you can trust.",
  },
];

const supportFeatures = [
  {
    icon: User,
    title: "Profile & Goals",
    description: "BMI tracking, personal goals, height, weight, age",
  },
  {
    icon: CalendarCheck,
    title: "Workout Calendar",
    description: "Visual overview of training days and rest days",
  },
  {
    icon: Flame,
    title: "Streak Tracking",
    description: "Build momentum with consecutive workout days",
  },
  {
    icon: Timer,
    title: "Built-in Timer",
    description: "Rest timer and stopwatch for every session",
  },
  {
    icon: FileText,
    title: "Workout Archive",
    description: "Complete history of every session for reference",
  },
  {
    icon: Target,
    title: "Weekly Insights",
    description: "Average workouts per week and consistency metrics",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src={logo}
              alt="FitCheck"
              width={64}
              height={64}
              className="h-16 w-16"
            />
            <span className="text-xl font-bold tracking-tight font-serif">
              FitCheck
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Start Now</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-foreground/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-foreground/5 rounded-full blur-[120px]" />
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-sm font-medium backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-none">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Built for lifters, by lifters</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] font-serif">
              Stop Guessing.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/60">
                Start Progressing.
              </span>
            </h1>
          </div>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The no-BS workout tracker. Simple logging, smart tracking,
            progressive overload made easy. For lifters who want results, not
            distractions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow"
              asChild
            >
              <Link href="/register">
                Start Training Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base font-semibold w-full sm:w-auto bg-background/50 backdrop-blur-sm border-foreground/10 hover:bg-foreground/5 transition-colors"
              asChild
            >
              <Link href="#demo">
                <Play className="mr-2 h-4 w-4" />
                See How It Works
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4 font-medium">
            <Activity className="h-4 w-4 text-green-500" />
            <span>Start for free. No credit card required.</span>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section id="demo" className="relative max-w-5xl mx-auto px-6 pb-20 md:pb-32 z-10 scroll-m-24">
        <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-foreground/10 bg-muted/30 backdrop-blur-sm aspect-video relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-foreground/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/y-DCCrFVZJM?autoplay=0&rel=0&showinfo=0"
            title="FitCheck App Demo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full"
          ></iframe>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 border-t">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter font-serif">
            Everything You Need.
            <br />
            <span className="text-muted-foreground">
              Nothing You Don&apos;t.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature serves one purpose: helping you get stronger.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {mainFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="h-full group hover:shadow-lg transition-all duration-300 border-foreground/10 bg-background/50 backdrop-blur-sm overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none">
                  <Icon className="w-32 h-32 transform rotate-12" />
                </div>
                <CardContent className="p-8 space-y-5 relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-foreground text-background shadow-md group-hover:scale-105 transition-transform duration-300">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <p className="text-sm font-semibold pt-2 text-foreground/80 border-t border-foreground/10 mt-4 pt-4 inline-block w-full">
                      {feature.highlight}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Supporting Features Grid */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 border-t">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter font-serif">
            All The Tools.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From profile tracking to workout archives, we&apos;ve got you
            covered.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {supportFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="h-full hover:shadow-md transition-all duration-300 border-foreground/10 bg-background/50 backdrop-blur-sm group hover:-translate-y-1"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-foreground/5 border border-foreground/10 group-hover:bg-foreground/10 transition-colors duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold tracking-tight">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-24 border-t">
        <Card className="overflow-hidden border-2 border-foreground/10 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-background to-foreground/10 -z-10" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-foreground/5 rounded-full blur-[100px] pointer-events-none" />
          <CardContent className="p-12 md:p-20 text-center space-y-10 relative z-10">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter font-serif">
                Time to Get Serious.
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Stop winging it in the gym. Start tracking, progressing, and
                getting the results you deserve.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-16 px-12 text-lg font-bold w-full sm:w-auto shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                asChild
              >
                <Link href="/register">
                  Start Training Now
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Link>
              </Button>
            </div>

            <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Join lifters who track smart and train harder.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image
                src={logo}
                alt="FitCheck"
                width={64}
                height={64}
                className="h-16 w-16"
              />
              <span className="font-bold">FitCheck</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for lifters. © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
