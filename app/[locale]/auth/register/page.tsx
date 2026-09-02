"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, ArrowLeft, Zap, Check } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

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
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const register_ = useAuthStore((s) => s.register);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const t = useTranslations("auth");

  if (isLoggedIn) {
    router.replace(`/${locale}/account`);
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
      toast.success(t("account_created"));
      router.push(`/${locale}/account`);
    } else {
      toast.error(result.error ?? "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-[#4063B2] text-xs font-sans font-bold uppercase tracking-widest mb-8 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("back_to_store")}
        </Link>

        <div className="bg-surface border border-border-color rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4063B2]/10 border border-[#4063B2]/30 mb-4">
              <Zap className="w-3.5 h-3.5 text-[#4063B2]" />
              <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#4063B2]">
                {t("badge")}
              </span>
            </div>
            <h1 className="text-2xl font-tall uppercase mb-2 font-display" style={{ color: "var(--text-primary)" }}>
              {t("create_account")}
            </h1>
            <p className="text-xs font-sans" style={{ color: "var(--text-secondary)" }}>
              {t("create_account_desc")}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("full_name")}
              </label>
              <input
                {...register("name")}
                type="text"
                placeholder={t("name_placeholder")}
                className="w-full px-4 py-3.5 rounded-xl bg-surface-2 border border-border-color focus:border-[#4063B2] text-sm focus:outline-none transition-colors"
                style={{ color: "var(--text-primary)" }}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("email_address")}
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder={t("email_placeholder")}
                className="w-full px-4 py-3.5 rounded-xl bg-surface-2 border border-border-color focus:border-[#4063B2] text-sm focus:outline-none transition-colors"
                style={{ color: "var(--text-primary)" }}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("phone")}
              </label>
              <input
                {...register("phone")}
                type="tel"
                placeholder={t("phone_placeholder")}
                className="w-full px-4 py-3.5 rounded-xl bg-surface-2 border border-border-color focus:border-[#4063B2] text-sm focus:outline-none transition-colors"
                style={{ color: "var(--text-primary)" }}
              />
              {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("password")}
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder={t("min_password")}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-surface-2 border border-border-color focus:border-[#4063B2] text-sm focus:outline-none transition-colors"
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("confirm_password")}
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  placeholder={t("confirm_placeholder")}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-surface-2 border border-border-color focus:border-[#4063B2] text-sm focus:outline-none transition-colors"
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword.message}</p>
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
                  className="w-5 h-5 rounded flex items-center justify-center border border-border-color bg-surface-2 peer-checked:bg-[#4063B2] peer-checked:border-[#4063B2] cursor-pointer transition-all"
                >
                  <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
                </label>
              </div>
              <label htmlFor="terms" className="text-xs font-sans cursor-pointer leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {t("terms_agree")}{" "}
                <span className="text-[#4063B2] font-semibold">{t("terms_of_service")}</span>{" "}
                {t("and")}{" "}
                <span className="text-[#4063B2] font-semibold">{t("privacy_policy")}</span>
              </label>
            </div>
            {errors.terms && <p className="text-xs text-red-500">{errors.terms.message}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#4063B2] via-[#5B7BE8] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? t("creating") : t("create_account")}
            </button>
          </form>

          <p className="text-center text-xs font-sans mt-6" style={{ color: "var(--text-tertiary)" }}>
            {t("already_account")}{" "}
            <Link
              href={`/${locale}/auth/login`}
              className="text-[#4063B2] hover:text-blue-800 transition-colors font-semibold"
            >
              {t("sign_in_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
