"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      
      if (scrollHeight > 0) {
        const currentProgress = (scrollTop / scrollHeight) * 100;
        setProgress(Math.min(100, Math.max(0, currentProgress)));
      }

      setIsVisible(scrollTop > 280);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // SVG circle circumference for r = 21 (diameter = 42, box = 48x48)
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Back to top"
      className={cn(
        "fixed bottom-24 right-7 z-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ease-out group",
        "shadow-xl hover:scale-110 active:scale-95",
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
      }}
    >
      {/* Scroll Progress Ring */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
        viewBox="0 0 48 48"
      >
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="2"
          opacity={0.4}
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: "stroke-dashoffset 150ms ease-out",
          }}
        />
      </svg>

      {/* Arrow Icon */}
      <ArrowUp
        className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{ color: "var(--text-primary)" }}
      />

      {/* Tooltip */}
      <span
        className="absolute right-16 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
        }}
      >
        Back to top
      </span>
    </button>
  );
}

export default ScrollToTop;
