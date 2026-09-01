import React from "react";
import { site } from "@/lib/data/site";

interface JsonLdProps {
  locale: string;
}

export function JsonLd({ locale }: JsonLdProps) {
  const baseUrl = "https://marjaah.qa";

  // 1. Organization & LocalBusiness Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "ComputerStore",
    "@id": `${baseUrl}/#organization`,
    name: "M.SHOP — Marjaah Trading Qatar",
    alternateName: ["M.SHOP", "Marjaah Trading"],
    url: baseUrl,
    logo: `${baseUrl}/images/logo-dark.png`,
    image: `${baseUrl}/images/hero-station.jpg`,
    description:
      "Qatar's premier destination for high-performance laptops, gaming rigs, GPUs, OLED displays, and genuine tech with official GCC warranty.",
    telephone: site.contact.phone,
    email: site.contact.email,
    priceRange: "QAR 50 - QAR 25000",
    currenciesAccepted: "QAR",
    paymentAccepted: "Cash, Credit Card, Debit Card, Apple Pay",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Salwa Road / Al Sadd Showroom",
      addressLocality: "Doha",
      addressRegion: "Doha",
      addressCountry: "QA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "25.2854",
      longitude: "51.5310",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Saturday",
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
        ],
        opens: "09:00",
        closes: "22:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Friday"],
        opens: "16:00",
        closes: "22:00",
      },
    ],
    sameAs: [
      "https://www.instagram.com/marjaah_trading",
      "https://wa.me/97455000000",
    ],
  };

  // 2. WebSite Schema with SearchAction for Google Sitelinks Search Box
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: "M.SHOP Qatar",
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/${locale}/shop?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: ["en-QA"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
