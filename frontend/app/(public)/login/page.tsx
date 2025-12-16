"use client";

import { DotBackground } from "@/components/DotBackground";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

type FormValues = z.infer<typeof formSchema>;

const login = async (values: FormValues) => {
  return api.post("/api/auth/login", values);
};

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const queryClient = useQueryClient();
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push("/dashboard");
    },
    onError: (error) => {
      console.error("Failed to login", error);
    },
  });

  function onSubmit(values: FormValues) {
    loginMutation.mutate(values);
  }

  // Extract error message from the mutation error
  const errorMessage =
    loginMutation.error instanceof Error
      ? loginMutation.error.message
      : loginMutation.error
      ? error ?? "An unexpected error occurred. Please try again."
      : error ?? null;

  const loginWithGoogle = async () => {
    try {
      const response = await api.get<{ data: string }>("/api/auth/google");

      if (response?.data) {
        // Redirect to Google OAuth page
        window.location.href = response?.data;
      } else {
        toast.error("Failed to initiate Google login");
      }
    } catch (error) {
      console.error("Failed to initiate Google login", error);
      toast.error("Failed to initiate Google login");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-6 relative overflow-hidden">
      <DotBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.1 }}
        className="mx-auto w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight"
          >
            Welcome back 💪
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Sign in to continue your fitness journey
          </motion.p>
        </div>

        {/* Add Google Sign In Button */}
        <Button
          type="button"
          variant="outline"
          onClick={loginWithGoogle}
          className="w-full h-12 rounded-2xl text-base font-semibold border-2"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl shadow-xl p-8 space-y-6"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Display login error */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive text-sm font-medium">
                    {errorMessage}
                  </p>
                </motion.div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="you@example.com"
                        className="h-12 rounded-2xl bg-background/50 border-border/50 focus:border-primary transition-all"
                        disabled={loginMutation.isPending}
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
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="h-12 rounded-2xl bg-background/50 border-border/50 focus:border-primary transition-all"
                        disabled={loginMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-12 rounded-2xl text-base font-semibold group"
                size="lg"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center text-sm text-muted-foreground"
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-primary hover:underline font-semibold"
          >
            Create one
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
