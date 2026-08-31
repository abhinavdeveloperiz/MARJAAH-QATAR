import type { Metadata } from "next";
import { WishlistClient } from "@/components/wishlist/WishlistClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "My Saved Wishlist | M.SHOP Qatar",
    description: "View and manage your saved high-performance computers, hardware, and accessories on M.SHOP Qatar.",
    alternates: {
      canonical: `/${locale}/wishlist`,
      languages: {
        "en-QA": "/en/wishlist",
      },
    },
  };
}

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <WishlistClient locale={locale} />;
}
