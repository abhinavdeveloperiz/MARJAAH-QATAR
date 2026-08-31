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
      ? "تواصل مع فريق خبراء M.SHOP قطر للاستفسار عن الحواسيب، كروت الشاشة، التجميعات، أو الدعم الفوري عبر الواتساب."
      : "Get in touch with M.SHOP Qatar hardware specialists for custom quotes, official warranties, or express WhatsApp concierge in Doha.",
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
    <div className="min-h-screen bg-dark-300">
      <section className="container-custom pt-28 md:pt-36 pb-16 md:pb-24 min-h-[calc(100vh-140px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Direct Info (6 cols) */}
          <div className="lg:col-span-6 space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 font-display">
                <Sparkles className="w-3.5 h-3.5" />
                {isRTL ? "خدمة العملاء في قطر" : "CONNECT WITH M.SHOP"}
              </div>

              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-none mb-6">
                {isRTL ? contact.headingLine1Ar : contact.headingLine1}
                <br />
                <span className="gradient-text">
                  {isRTL ? contact.headingLine2Ar : contact.headingLine2}
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted font-medium leading-relaxed max-w-lg">
                {isRTL ? contact.introAr : contact.intro}
              </p>
            </div>

            {/* Direct Contact Cards */}
            <div className="space-y-4">
              <a
                href={contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#10192D]/90 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans text-emerald-400 uppercase tracking-widest">
                    {isRTL ? "محادثة فورية (موصى بها)" : "Instant WhatsApp VIP Desk"}
                  </p>
                  <p className="text-white font-bold font-display text-base sm:text-lg">{contact.whatsapp}</p>
                </div>
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#10192D]/90 backdrop-blur-md border border-white/10 hover:border-[#8D9CF5]/60 hover:shadow-[0_0_20px_rgba(141,156,245,0.2)] transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4063B2]/20 flex items-center justify-center flex-shrink-0 text-[#8D9CF5] group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans text-[#8D9CF5] uppercase tracking-widest">
                    {isRTL ? "البريد الإلكتروني للطلبات" : "Direct Sales & Inquiries"}
                  </p>
                  <p className="text-white font-bold font-display text-base sm:text-lg">{contact.email}</p>
                </div>
              </a>

              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#10192D]/90 backdrop-blur-md border border-white/10 hover:border-[#8D9CF5]/60 hover:shadow-[0_0_20px_rgba(141,156,245,0.2)] transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4063B2]/20 flex items-center justify-center flex-shrink-0 text-[#8D9CF5] group-hover:scale-110 transition-transform">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans text-[#8D9CF5] uppercase tracking-widest">
                    {isRTL ? "هاتف المعرض بالدوحة" : "Doha Showroom Hotline"}
                  </p>
                  <p className="text-white font-bold font-display text-base sm:text-lg">{contact.phone}</p>
                </div>
              </a>
            </div>

            {/* Location & Hours */}
            <div className="p-6 rounded-3xl bg-[#0B1120] border border-white/10 space-y-4">
              <div className="flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#8D9CF5] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold font-sans text-[#8D9CF5] uppercase tracking-widest mb-1">
                    {isRTL ? "الموقع" : "Doha Showroom Address"}
                  </p>
                  <p className="text-white font-medium text-sm">
                    {isRTL ? contact.locationAr : contact.location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 pt-3 border-t border-white/5">
                <Clock className="w-5 h-5 text-[#4063B2] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold font-sans text-[#4063B2] uppercase tracking-widest mb-1">
                    {isRTL ? "ساعات العمل" : "Operating Hours"}
                  </p>
                  <p className="text-[#94A3B8] font-medium text-xs sm:text-sm">
                    {isRTL ? contact.hoursAr : contact.hours}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Message Form (6 cols) */}
          <div className="lg:col-span-6">
            <div className="bg-[#10192D]/90 backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-white/10 shadow-lg">
              <h2 className="text-2xl font-black font-display text-white mb-2">
                {isRTL ? "أرسل استفسارك" : "Send Hardware Inquiry"}
              </h2>
              <p className="text-[#94A3B8] text-sm font-medium mb-8">
                {isRTL ? "املأ النموذج وسيقوم فريقنا بالرد عليك خلال ساعات قليلة." : "Submit your query for custom quotes, warranties, or stock checks."}
              </p>

              <form className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-display text-muted uppercase tracking-wider mb-2">
                    {isRTL ? "الاسم الكامل" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isRTL ? "مثال: جاسم الكواري" : "e.g. Jassem Al-Kuwari"}
                    className="input h-12 bg-surface-2/80 border-surface-3"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-display text-muted uppercase tracking-wider mb-2">
                      {isRTL ? "البريد الإلكتروني" : "Email Address"}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@domain.qa"
                      className="input h-12 bg-surface-2/80 border-surface-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold font-display text-muted uppercase tracking-wider mb-2">
                      {isRTL ? "رقم الهاتف في قطر" : "Qatar Mobile No."}
                    </label>
                    <input
                      type="tel"
                      placeholder="+974 5500 0000"
                      className="input h-12 bg-surface-2/80 border-surface-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold font-display text-muted uppercase tracking-wider mb-2">
                    {isRTL ? "نوع الاستفسار" : "Subject"}
                  </label>
                  <select className="input h-12 bg-surface-2/80 border-surface-3 text-sm font-medium cursor-pointer">
                    <option>{isRTL ? "طلب شراء حاسوب / لابتوب" : "Custom Gaming Rig / Laptop Order"}</option>
                    <option>{isRTL ? "عروض أسعار للشركات" : "Corporate / Enterprise B2B Quote"}</option>
                    <option>{isRTL ? "استفسار عن الضمان والتوصيل" : "Warranty & Delivery Status"}</option>
                    <option>{isRTL ? "استفسار عام" : "General Support"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-display text-muted uppercase tracking-wider mb-2">
                    {isRTL ? "رسالتك" : "Message / Hardware Specs"}
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={isRTL ? "اكتب تفاصيل طلبك أو المواصفات المطلوبة..." : "Describe the components or requirements you need..."}
                    className="input py-3 bg-surface-2/80 border-surface-3 resize-none"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center h-13 text-sm font-bold font-display shadow-glow-cyber mt-2">
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
