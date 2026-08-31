import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/lib/data/products";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProductBySlug(slug);
  const isRTL = locale === "ar";
  
  if (!product) return { title: "Product Not Found | M.SHOP Qatar" };

  const title = isRTL ? `${product.nameAr} | M.SHOP قطر` : `${product.name} | M.SHOP Qatar`;
  const description = isRTL ? product.shortDescriptionAr : product.shortDescription;
  const image = product.images[0] || "/images/hero-station.jpg";

  return {
    title,
    description,
    keywords: [
      product.name,
      product.brand,
      product.categoryId,
      "Qatar",
      "Doha",
      "M.SHOP",
      "buy in Qatar",
      "price in QAR",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: image,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: `/${locale}/product/${slug}`,
      languages: {
        "en-QA": `/en/product/${slug}`,
        "ar-QA": `/ar/product/${slug}`,
      },
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  const isRTL = locale === "ar";
  const baseUrl = "https://marjaah.qa";

  // Schema.org Product Rich Snippet
  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: isRTL ? product.nameAr : product.name,
    image: product.images.map((img) => (img.startsWith("http") ? img : `${baseUrl}${img}`)),
    description: isRTL ? product.descriptionAr : product.description,
    sku: `MSHOP-${product.id}`,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/${locale}/product/${product.slug}`,
      priceCurrency: "QAR",
      price: product.price,
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "M.SHOP Qatar",
      },
    },
    aggregateRating: product.reviewCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductDetailClient product={product} locale={locale} />
    </>
  );
}
