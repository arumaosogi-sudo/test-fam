import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * กันไม่ให้ key หลุดไปฝั่งเบราว์เซอร์
 *
 * ถ้าวันหนึ่งมีคนเผลอ import ผู้ให้บริการ AI เข้าไปใน client component
 * (เช่น อยากเรียกตรงให้เร็วขึ้น) Next.js จะฝังค่า env ลงใน bundle
 * แล้ว key จะถูกดูดไปใช้ภายในไม่กี่ชั่วโมง เทสนี้จะพังก่อนถึงตอนนั้น
 *
 * ตรวจด้วยการอ่านไฟล์จริง ไม่ใช่ mock เพราะสิ่งที่เรากลัวคือไฟล์ที่ยังไม่มี
 */

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  path: path.replace(SRC, "src").replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

const clientFiles = files.filter(
  (file) =>
    /^["']use client["']/m.test(file.text) && !file.path.endsWith(".test.ts"),
);

describe("เส้นแบ่งเซิร์ฟเวอร์กับเบราว์เซอร์", () => {
  it("มี client component ให้ตรวจจริง ไม่ใช่เทสที่ผ่านเพราะหาไฟล์ไม่เจอ", () => {
    expect(clientFiles.length).toBeGreaterThan(5);
  });

  it("ไม่มี client component ไหนแตะ GEMINI_API_KEY", () => {
    for (const file of clientFiles) {
      expect(file.text.includes("GEMINI_API_KEY"), file.path).toBe(false);
    }
  });

  it("ไม่มี client component ไหน import ผู้ให้บริการ AI", () => {
    for (const file of clientFiles) {
      expect(/from\s+["']@\/lib\/ai/.test(file.text), file.path).toBe(false);
    }
  });

  it("ไม่มี client component ไหนยิงไปที่ Gemini ตรง ๆ", () => {
    for (const file of clientFiles) {
      expect(file.text.includes("generativelanguage.googleapis.com"), file.path).toBe(
        false,
      );
    }
  });

  it("ไม่มีไฟล์ไหนเอาความลับไปไว้ในตัวแปรที่ขึ้นต้นด้วย NEXT_PUBLIC_", () => {
    // ตัวแปร NEXT_PUBLIC_* ถูกฝังลงใน bundle เสมอ ไม่ว่าจะเรียกจากฝั่งไหน
    // ยกเว้น ANON ของ Supabase ที่ออกแบบมาให้เปิดเผยได้อยู่แล้ว (กันเตือนผิด)
    const secretish = /NEXT_PUBLIC_(?!SUPABASE_ANON)\w*(KEY|SECRET|TOKEN)/;

    for (const file of files) {
      expect(secretish.test(file.text), file.path).toBe(false);
    }
  });
});
