"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Eye, EyeOff, CheckCircle2, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import toast from "react-hot-toast";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function SecurityPage() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await new Promise((r) => setTimeout(r, 600));
    const result = changePassword(values.currentPassword, values.newPassword);
    if (result.success) {
      toast.success("Password changed successfully");
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 5000);
    } else {
      toast.error(result.error ?? "Failed to change password");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-4 h-4 text-[#8D9CF5]" />
          <h1 className="text-xs font-sans font-bold uppercase tracking-wider text-[#8D9CF5]">Security</h1>
        </div>
        <p className="text-xl font-tall uppercase text-white">Account Security</p>
      </div>

      {/* Change Password */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#8D9CF5]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#8D9CF5]" />
          </div>
          <div>
            <h2 className="text-sm font-sans font-bold text-white">Change Password</h2>
            <p className="text-xs text-white/40 font-sans">Use a strong, unique password</p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-400 font-sans">Password changed successfully.</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Current */}
          <div>
            <label className="block text-xs font-sans font-semibold text-white/60 uppercase tracking-wider mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                {...register("currentPassword")}
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1.5 text-xs text-red-400">{errors.currentPassword.message}</p>
            )}
          </div>

          {/* New */}
          <div>
            <label className="block text-xs font-sans font-semibold text-white/60 uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                {...register("newPassword")}
                type={showNew ? "text" : "password"}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1.5 text-xs text-red-400">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs font-sans font-semibold text-white/60 uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                {...register("confirmPassword")}
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat new password"
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

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4063B2] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40"
            >
              <Shield className="w-4 h-4" />
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-white/60 mb-4">
          Security Tips
        </h3>
        <ul className="space-y-2.5">
          {[
            "Use at least 8 characters with a mix of letters, numbers and symbols",
            "Never share your password with anyone",
            "Use a unique password not used on other sites",
            "Enable two-factor authentication when available",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2.5">
              <Shield className="w-3.5 h-3.5 text-[#8D9CF5] mt-0.5 flex-shrink-0" />
              <span className="text-xs text-white/50 font-sans">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
