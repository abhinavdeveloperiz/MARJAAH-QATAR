"use client";

import Switch from "@/components/ui/sky-toggle";

interface ThemeToggleProps {
  className?: string;
  size?: number | string;
}

export function ThemeToggle({ className, size }: ThemeToggleProps) {
  return <Switch className={className} size={size} />;
}

export default ThemeToggle;

