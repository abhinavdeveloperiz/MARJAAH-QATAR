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
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link
          href="/en"
          className="inline-flex items-center gap-2 text-[#8D9CF5] text-xs font-sans font-bold uppercase tracking-widest mb-8 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>

        <div className="bg-[#0B1120] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8D9CF5]/10 border border-[#8D9CF5]/30 mb-4">
              <Zap className="w-3.5 h-3.5 text-[#8D9CF5]" />
              <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#8D9CF5]">
                M.SHOP Qatar
              </span>
            </div>
            <h1 className="text-2xl font-tall uppercase text-white mb-2">Sign In</h1>
            <p className="text-xs text-white/50 font-sans">Access your M.SHOP account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-sans font-semibold text-white/70 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-sans font-semibold text-white/70 uppercase tracking-wider">
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
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
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

          <p className="text-center text-xs text-white/40 font-sans mt-6">
            New to M.SHOP?{" "}
            <Link
              href="/en/auth/register"
              className="text-[#8D9CF5] hover:text-white transition-colors font-semibold"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
