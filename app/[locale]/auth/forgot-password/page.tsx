"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, CheckCircle2, Zap } from "lucide-react";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));
    setSubmittedEmail(values.email);
    setSent(true);
    toast.success("Reset link sent (demo — check your inbox)");
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link
          href="/en/auth/login"
          className="inline-flex items-center gap-2 text-[#8D9CF5] text-xs font-sans font-bold uppercase tracking-widest mb-8 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div className="bg-[#0B1120] border border-white/10 rounded-3xl p-8 shadow-2xl">
          {sent ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-tall uppercase text-white mb-3">Check Your Inbox</h2>
              <p className="text-xs text-white/50 font-sans leading-relaxed">
                We sent a password reset link to{" "}
                <span className="text-[#8D9CF5] font-semibold">{submittedEmail}</span>.
                <br className="mb-2" />
                It may take a minute to arrive.
              </p>
              <Link
                href="/en/auth/login"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4063B2] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8D9CF5]/10 border border-[#8D9CF5]/30 mb-4">
                  <Zap className="w-3.5 h-3.5 text-[#8D9CF5]" />
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#8D9CF5]">
                    Password Reset
                  </span>
                </div>
                <h1 className="text-2xl font-tall uppercase text-white mb-2">Forgot Password</h1>
                <p className="text-xs text-white/50 font-sans">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-xs font-sans font-semibold text-white/70 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8D9CF5]" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#4063B2] via-[#5B7BE8] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
