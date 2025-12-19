"use client";

import { DotBackground } from "@/components/DotBackground";
import { Button } from "@/components/ui/button";
import favicon from "@/public/favicon.ico";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  Dumbbell,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const features = [
    {
      icon: Dumbbell,
      title: "Log Workouts",
      description: "Track every set, rep, and PR",
    },
    {
      icon: Calendar,
      title: "Build Plans",
      description: "Create custom workout routines",
    },
    {
      icon: BarChart3,
      title: "See Progress",
      description: "Watch your numbers grow",
    },
  ];

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Dot Background Pattern */}
      <DotBackground />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src={favicon}
              alt="FitCheck"
              width={64}
              height={64}
              className="h-16 w-16"
            />
            <span className="text-xl font-bold tracking-tight">FitCheck</span>
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
      </motion.header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 md:pt-48 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8 max-w-4xl mx-auto"
        >
          {/* Main Heading */}
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
            Track Every Rep.
            <br />
            <span className="text-muted-foreground">Own Your Progress.</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light">
            The simplest way to log workouts and watch yourself get stronger.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold"
              asChild
            >
              <Link href="/register">
                Start Training
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
            <Activity className="h-4 w-4" />
            <span>Free forever • No credit card required</span>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-24 border-t">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-3 gap-16"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center space-y-4"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground/5 border">
                <feature.icon className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-32 border-t">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter">
            Ready to lift?
          </h2>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Start tracking your workouts today. No BS, just results.
          </p>
          <Button
            size="lg"
            className="h-12 px-8 text-base font-semibold"
            asChild
          >
            <Link href="/register">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image
                src={favicon}
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
