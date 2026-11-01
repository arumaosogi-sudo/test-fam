"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import {
  getServerTheme,
  getTheme,
  setTheme,
  subscribeTheme,
} from "@/lib/theme";

import { Button } from "./button";

/**
 * สลับธีมด้วยการตั้ง data-theme บน <html> — ตัวแปรสีใน globals.css
 * จะพลิกทั้งชุดเอง component อื่นไม่ต้องรู้เรื่องธีมเลย (ดู ADR-0002)
 *
 * ยังไม่จำค่าไว้ข้ามการรีโหลด (จะทำตอนมีระบบโปรไฟล์ในภารกิจ E6)
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getTheme,
    getServerTheme,
  );
  const isDark = theme === "dark";

  return (
    <Button
      variant="neutral"
      size="sm"
      square
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
    >
      {isDark ? (
        <Sun className="size-5" strokeWidth={2.75} aria-hidden />
      ) : (
        <Moon className="size-5" strokeWidth={2.75} aria-hidden />
      )}
    </Button>
  );
}
