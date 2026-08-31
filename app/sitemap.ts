import { MetadataRoute } from "next";
import { products } from "@/lib/data/products";
import { categories } from "@/lib/data/categories";

const baseUrl = "https://marjaah.qa";
const locales = ["en"];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];

  // Static Pages
  const staticPages = ["", "/shop", "/offers", "/about", "/contact"];

  locales.forEach((locale) => {
    staticPages.forEach((page) => {
      routes.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1.0 : 0.8,
      });
    });
  });

  // Category Pages
  locales.forEach((locale) => {
    categories.forEach((cat) => {
      routes.push({
        url: `${baseUrl}/${locale}/shop/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.85,
      });
    });
  });

  // Product Detail Pages
  locales.forEach((locale) => {
    products.forEach((prod) => {
      routes.push({
        url: `${baseUrl}/${locale}/product/${prod.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      });
    });
  });

  return routes;
}
