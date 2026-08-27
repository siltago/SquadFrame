"use client";

import { useTheme } from "@/ui/theme/ThemeProvider";
import { SunIcon, MoonIcon } from "@/ui/icons";

export function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-110 hover:bg-white/12 hover:text-white"
    >
      {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}
