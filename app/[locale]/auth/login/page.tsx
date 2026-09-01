"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, ArrowLeft, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [showPassword, setShowPassword] = useState(false);

  if (isLoggedIn) {
    router.replace("/en/account");
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const result = login(values.email, values.password);
    if (result.success) {
      toast.success("Welcome back!");
      router.push("/en/account");
    } else {
      toast.error(result.error ?? "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="w-full max-w-md">
        <Link
          href="/en"
          className="inline-flex items-center gap-2 text-[#8D9CF5] text-xs font-sans font-bold uppercase tracking-widest mb-8 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>

        <div className="rounded-3xl p-8 shadow-2xl" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-color)" }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8D9CF5]/10 border border-[#8D9CF5]/30 mb-4">
              <Zap className="w-3.5 h-3.5 text-[#8D9CF5]" />
              <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#8D9CF5]">
                M.SHOP Qatar
              </span>
            </div>
            <h1 className="text-2xl font-tall uppercase mb-2" style={{ color: "var(--text-primary)" }}>Sign In</h1>
            <p className="text-xs font-sans" style={{ color: "var(--text-tertiary)" }}>Access your M.SHOP account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 rounded-xl text-sm focus:outline-none transition-colors"
                style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-sans font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
                <Link
                  href="/en/auth/forgot-password"
                  className="text-[11px] text-[#8D9CF5] hover:text-white transition-colors font-sans"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-sm focus:outline-none transition-colors"
                  style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#4063B2] via-[#5B7BE8] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs font-sans mt-6" style={{ color: "var(--text-tertiary)" }}>
            New to M.SHOP?{" "}
            <Link
              href="/en/auth/register"
              className="font-semibold transition-colors"
              style={{ color: "var(--color-accent)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-accent)")}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
