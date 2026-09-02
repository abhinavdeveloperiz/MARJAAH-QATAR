"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, CheckCircle2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const t = useTranslations("auth");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await new Promise((r) => setTimeout(r, 1200));
    setSubmittedEmail(values.email);
    setSent(true);
    toast.success(t("reset_sent_toast"));
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link
          href={`/${locale}/auth/login`}
          className="inline-flex items-center gap-2 text-[#4063B2] text-xs font-sans font-bold uppercase tracking-widest mb-8 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("back_to_login")}
        </Link>

        <div className="bg-surface border border-border-color rounded-3xl p-8 shadow-sm">
          {sent ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-tall uppercase mb-3 font-display" style={{ color: "var(--text-primary)" }}>
                {t("check_inbox")}
              </h2>
              <p className="text-xs font-sans leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {t("reset_sent_desc")}{" "}
                <span className="text-[#4063B2] font-semibold">{submittedEmail}</span>.
                <br className="mb-2" />
                {t("reset_arrive")}
              </p>
              <Link
                href={`/${locale}/auth/login`}
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4063B2] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
              >
                {t("back_to_login")}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4063B2]/10 border border-[#4063B2]/30 mb-4">
                  <Zap className="w-3.5 h-3.5 text-[#4063B2]" />
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#4063B2]">
                    {t("password_reset")}
                  </span>
                </div>
                <h1 className="text-2xl font-tall uppercase mb-2 font-display" style={{ color: "var(--text-primary)" }}>
                  {t("forgot_password")}
                </h1>
                <p className="text-xs font-sans" style={{ color: "var(--text-secondary)" }}>
                  {t("forgot_password_desc")}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                    {t("email_address")}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#4063B2]" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder={t("email_placeholder")}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-surface-2 border border-border-color focus:border-[#4063B2] text-sm focus:outline-none transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#4063B2] via-[#5B7BE8] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? t("sending") : t("send_reset_link")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
