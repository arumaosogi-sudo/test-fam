"use client";

import { Mic, Square } from "lucide-react";

import { cn } from "@/lib/utils";

type MicButtonProps = {
  listening: boolean;
  disabled?: boolean;
  /** กดเริ่มฟัง */
  onStart: () => void;
  /** กดหยุดเพื่อส่งเสียงไปตรวจ */
  onStop: () => void;
  className?: string;
};

/**
 * ปุ่มกดพูด — ปุ่มใหญ่สุดในหน้าเกมพูด
 *
 * ตั้งใจให้ต้องกดเริ่มและกดหยุดเอง ไม่ใช่ฟังอัตโนมัติตลอด เพราะเด็กเล่นที่บ้าน
 * ที่มีเสียงพ่อแม่หรือทีวีอยู่ด้วย การเปิดไมค์ค้างจะเก็บเสียงคนอื่นไปตรวจ
 * แล้วเด็กจะถูกตัดว่าพูดผิดทั้งที่ยังไม่ได้พูด และเป็นการอัดเสียงในบ้าน
 * โดยที่ไม่มีใครสั่ง ซึ่งไม่ควรเกิดในแอปเด็ก
 *
 * ไม่ใช้สีบอกสถานะอย่างเดียว (กฎข้อ 6) — ไอคอนเปลี่ยนจากไมค์เป็นสี่เหลี่ยมหยุด
 * และมีข้อความกำกับใต้ปุ่มในตัวเกมด้วย
 */
export function MicButton({
  listening,
  disabled = false,
  onStart,
  onStop,
  className,
}: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      aria-label={listening ? "หยุดพูดแล้วส่งตรวจ" : "กดเพื่อเริ่มพูด"}
      className={cn(
        "pressable active:pressable-sunk inline-flex size-24 items-center justify-center rounded-full disabled:opacity-45 disabled:shadow-none",
        listening
          ? "[--edge:var(--danger-edge)] bg-danger text-danger-ink"
          : "[--edge:var(--primary-edge)] bg-primary text-primary-ink",
        className,
      )}
    >
      {listening ? (
        <Square className="size-10 animate-pulse" strokeWidth={3} aria-hidden />
      ) : (
        <Mic className="size-10" strokeWidth={2.75} aria-hidden />
      )}
    </button>
  );
}
