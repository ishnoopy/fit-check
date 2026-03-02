"use client";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const register = async (
  values: Omit<FormValues, "confirmPassword">,
  referralCode?: string | null,
) => {
  return api.post("/api/auth/register", {
    email: values.email,
    password: values.password,
    role: "user",
    ...(referralCode ? { referralCode } : {}),
  });
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: Omit<FormValues, "confirmPassword">) =>
      register(values, referralCode),
    onSuccess: () => {
      router.push("/login");
    },
    onError: (error) => {
      console.error("Failed to register", error);
    },
  });

  function onSubmit(values: FormValues) {
    registerMutation.mutate({
      email: values.email,
      password: values.password,
    });
  }

  const errorMessage =
    registerMutation.error instanceof Error
      ? registerMutation.error.message
      : registerMutation.error
        ? "An unexpected error occurred. Please try again."
        : null;

  return (
    <div className="min-h-screen py-12 px-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.1 }}
        className="mx-auto max-w-2xl space-y-8 relative z-10"
      >
        <div className="text-center space-y-2">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight font-serif"
          >
            Start your journey
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground"
          >
            Quick sign up - complete your profile after logging in
          </motion.p>
          {referralCode && (
            <p className="text-xs text-muted-foreground">
              Referral applied: <span className="font-mono">{referralCode}</span>
            </p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/60 backdrop-blur-sm border border-border shadow-sm p-8 space-y-8"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive text-sm font-medium">
                    {errorMessage}
                  </p>
                </motion.div>
              )}

              {/* Account Information */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          className="h-12 bg-background/60"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-12 bg-background/60"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-12 bg-background/60"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-muted/40 border border-border/60 p-4 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    Don&apos;t worry! We&apos;ll ask for your personal details
                    and fitness goals after you log in for the first time.
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-12 text-base font-semibold group"
                  size="lg"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground"
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-semibold"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
