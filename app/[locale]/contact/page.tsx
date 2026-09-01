import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, MessageCircle, Instagram, Sparkles, Send } from "lucide-react";
import { site } from "@/lib/data/site";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRTL = locale === "ar";
  return {
    title: isRTL ? "تواصل معنا | M.SHOP — خدمة العملاء والطلبات بالدوحة" : "Contact Us | M.SHOP Qatar — Showroom & VIP Tech Support",
    description: isRTL
      ? "تواصل مع فريق خبراء M.SHOP قطر للاستفسار عن الحواسيب، كروت الشاشة، أو الدعم الفوري عبر الواتساب."
      : "Get in touch with M.SHOP Qatar hardware specialists for quotes, official warranties, or express WhatsApp concierge in Doha.",
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {
        "en-QA": "/en/contact",
        "ar-QA": "/ar/contact",
      },
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isRTL = locale === "ar";
  const { contact } = site;

  return (
    <div className="min-h-screen bg-base">
      <section className="container-custom pt-28 md:pt-36 pb-16 md:pb-24 min-h-[calc(100vh-140px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Direct Info (6 cols) */}
          <div className="lg:col-span-6 space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4063B2]/10 border border-[#4063B2]/20 text-[#4063B2] text-xs font-bold tracking-widest uppercase mb-6 font-display">
                <Sparkles className="w-3.5 h-3.5" />
                {isRTL ? "خدمة العملاء في قطر" : "CONNECT WITH M.SHOP"}
              </div>

              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6" style={{ color: "var(--text-primary)" }}>
                {isRTL ? contact.headingLine1Ar : contact.headingLine1}
                <br />
                <span className="bg-gradient-to-r from-[#4063B2] via-[#5B7BE8] to-[#8D9CF5] bg-clip-text text-transparent">
                  {isRTL ? contact.headingLine2Ar : contact.headingLine2}
                </span>
              </h1>

              <p className="text-lg sm:text-xl font-medium leading-relaxed max-w-lg" style={{ color: "var(--text-secondary)" }}>
                {isRTL ? contact.introAr : contact.intro}
              </p>
            </div>

            {/* Direct Contact Cards */}
            <div className="space-y-4">
              <a
                href={contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl bg-surface border border-emerald-500/30 hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-600 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans text-emerald-600 uppercase tracking-widest">
                    {isRTL ? "محادثة فورية (موصى بها)" : "Instant WhatsApp VIP Desk"}
                  </p>
                  <p className="font-bold font-display text-base sm:text-lg" style={{ color: "var(--text-primary)" }}>{contact.whatsapp}</p>
                </div>
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-4 p-5 rounded-2xl bg-surface border border-border-color hover:border-[#4063B2] hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4063B2]/10 border border-[#4063B2]/20 flex items-center justify-center flex-shrink-0 text-[#4063B2] group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans text-[#4063B2] uppercase tracking-widest">
                    {isRTL ? "البريد الإلكتروني للطلبات" : "Direct Sales & Inquiries"}
                  </p>
                  <p className="font-bold font-display text-base sm:text-lg" style={{ color: "var(--text-primary)" }}>{contact.email}</p>
                </div>
              </a>

              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-4 p-5 rounded-2xl bg-surface border border-border-color hover:border-[#4063B2] hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4063B2]/10 border border-[#4063B2]/20 flex items-center justify-center flex-shrink-0 text-[#4063B2] group-hover:scale-110 transition-transform">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans text-[#4063B2] uppercase tracking-widest">
                    {isRTL ? "هاتف المعرض بالدوحة" : "Doha Showroom Hotline"}
                  </p>
                  <p className="font-bold font-display text-base sm:text-lg" style={{ color: "var(--text-primary)" }}>{contact.phone}</p>
                </div>
              </a>
            </div>

            {/* Location & Hours */}
            <div className="p-6 rounded-3xl bg-surface border border-border-color shadow-sm space-y-4">
              <div className="flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#4063B2] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold font-sans text-[#4063B2] uppercase tracking-widest mb-1">
                    {isRTL ? "الموقع" : "Doha Showroom Address"}
                  </p>
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                    {isRTL ? contact.locationAr : contact.location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 pt-3 border-t border-border-color">
                <Clock className="w-5 h-5 text-[#4063B2] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold font-sans text-[#4063B2] uppercase tracking-widest mb-1">
                    {isRTL ? "ساعات العمل" : "Operating Hours"}
                  </p>
                  <p className="font-medium text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                    {isRTL ? contact.hoursAr : contact.hours}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Message Form (6 cols) */}
          <div className="lg:col-span-6">
            <div className="bg-surface rounded-3xl p-8 sm:p-10 border border-border-color shadow-xl">
              <h2 className="text-2xl font-black font-display mb-2" style={{ color: "var(--text-primary)" }}>
                {isRTL ? "أرسل استفسارك" : "Send Hardware Inquiry"}
              </h2>
              <p className="text-sm font-medium mb-8" style={{ color: "var(--text-secondary)" }}>
                {isRTL ? "املأ النموذج وسيقوم فريقنا بالرد عليك خلال ساعات قليلة." : "Submit your query for quotes, warranties, or stock checks."}
              </p>

              <form className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-display uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                    {isRTL ? "الاسم الكامل" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isRTL ? "مثال: جاسم الكواري" : "e.g. Jassem Al-Kuwari"}
                    className="input h-12"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-display uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                      {isRTL ? "البريد الإلكتروني" : "Email Address"}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@domain.qa"
                      className="input h-12"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold font-display uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                      {isRTL ? "رقم الهاتف في قطر" : "Qatar Mobile No."}
                    </label>
                    <input
                      type="tel"
                      placeholder="+974 5500 0000"
                      className="input h-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold font-display uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                    {isRTL ? "نوع الاستفسار" : "Subject"}
                  </label>
                  <select className="input h-12 text-sm font-medium cursor-pointer">
                    <option>{isRTL ? "طلب شراء حاسوب / لابتوب" : "Desktop Computer / Laptop Order"}</option>
                    <option>{isRTL ? "عروض أسعار للشركات" : "Corporate / Enterprise B2B Quote"}</option>
                    <option>{isRTL ? "استفسار عن الضمان والتوصيل" : "Warranty & Delivery Status"}</option>
                    <option>{isRTL ? "استفسار عام" : "General Support"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-display uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                    {isRTL ? "رسالتك" : "Message / Hardware Specs"}
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={isRTL ? "اكتب تفاصيل طلبك أو المواصفات المطلوبة..." : "Describe the components or requirements you need..."}
                    className="input py-3 resize-none"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center h-13 text-sm font-bold font-display mt-2">
                  <Send className="w-4 h-4" />
                  {isRTL ? "إرسال الاستفسار الآن" : "Submit Hardware Request"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
