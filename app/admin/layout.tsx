import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="bg-dark-300 text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
