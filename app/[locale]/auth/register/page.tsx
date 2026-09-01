"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, ArrowLeft, Zap, Check } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import toast from "react-hot-toast";

const schema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().min(8, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v === true, "You must accept the terms"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const register_ = useAuthStore((s) => s.register);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoggedIn) {
    router.replace("/en/account");
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { terms: false } });

  const onSubmit = async (values: FormValues) => {
    const result = register_({
      name: values.name,
      email: values.email,
      phone: values.phone,
      password: values.password,
    });
    if (result.success) {
      toast.success("Account created! Welcome to M.SHOP.");
      router.push("/en/account");
    } else {
      toast.error(result.error ?? "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-20">
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
            <h1 className="text-2xl font-tall uppercase text-white mb-2">Create Account</h1>
            <p className="text-xs text-white/50 font-sans">Join M.SHOP for faster checkout & order tracking</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-sans font-semibold text-white/70 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                {...register("name")}
                type="text"
                placeholder="Your full name"
                className="w-full px-4 py-3.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            {/* Email */}
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
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-sans font-semibold text-white/70 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="+974 5000 0000"
                className="w-full px-4 py-3.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
              />
              {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-sans font-semibold text-white/70 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
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
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-sans font-semibold text-white/70 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-1">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  {...register("terms")}
                  type="checkbox"
                  id="terms"
                  className="sr-only peer"
                />
                <label
                  htmlFor="terms"
                  className="w-5 h-5 rounded flex items-center justify-center border border-white/20 bg-[#10192D] peer-checked:bg-[#8D9CF5] peer-checked:border-[#8D9CF5] cursor-pointer transition-all"
                >
                  <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
                </label>
              </div>
              <label htmlFor="terms" className="text-xs text-white/50 font-sans cursor-pointer leading-relaxed">
                I agree to M.SHOP&apos;s{" "}
                <span className="text-[#8D9CF5]">Terms of Service</span> and{" "}
                <span className="text-[#8D9CF5]">Privacy Policy</span>
              </label>
            </div>
            {errors.terms && <p className="text-xs text-red-400">{errors.terms.message}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#4063B2] via-[#5B7BE8] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-white/40 font-sans mt-6">
            Already have an account?{" "}
            <Link
              href="/en/auth/login"
              className="text-[#8D9CF5] hover:text-white transition-colors font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
