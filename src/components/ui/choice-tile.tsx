"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChoiceState = "idle" | "selected" | "correct" | "wrong";

type ChoiceTileProps = {
  /** คำภาษาอังกฤษ หรือข้อความหลักของตัวเลือก */
  label: string;
  /** คำแปลไทยหรือคำใบ้ (ถอดออกได้เมื่อระดับสูงขึ้น) */
  sublabel?: string;
  /** อิโมจิหรือรูปภาพประกอบ */
  visual?: ReactNode;
  state?: ChoiceState;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

const stateClass: Record<ChoiceState, string> = {
  idle: "[--edge:var(--border)] bg-surface border-border text-ink",
  selected: "[--edge:var(--primary-edge)] bg-primary-soft border-primary text-ink",
  correct: "[--edge:var(--success-edge)] bg-success-soft border-success text-ink",
  wrong: "[--edge:var(--danger-edge)] bg-danger-soft border-danger text-ink",
};

/**
 * การ์ดตัวเลือกคำตอบ ใช้ร่วมกันในโหมด เติมคำ / ดูภาพเติมคำ / ฟังแล้วเลือก
 *
 * สถานะ correct กับ wrong ไม่ได้บอกด้วยสีเพียงอย่างเดียว แต่มีไอคอน
 * ติ๊กถูก/กากบาทกำกับด้วย เพราะเด็กตาบอดสีต้องแยกออกเหมือนกัน
 */
export function ChoiceTile({
  label,
  sublabel,
  visual,
  state = "idle",
  disabled = false,
  onClick,
  className,
}: ChoiceTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "selected"}
      className={cn(
        "pressable active:pressable-sunk rounded-tile relative flex min-h-24 w-full flex-col items-center justify-center gap-1 border-2 p-4 text-center font-extrabold disabled:opacity-60 disabled:shadow-none",
        stateClass[state],
        className,
      )}
    >
      {visual ? (
        <span className="text-kid-3xl leading-none" aria-hidden>
          {visual}
        </span>
      ) : null}

      <span className="text-kid-lg">{label}</span>

      {sublabel ? (
        <span className="text-ink-muted text-kid-sm font-bold">{sublabel}</span>
      ) : null}

      {state === "correct" ? (
        <span className="bg-success text-success-ink absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full">
          <Check className="size-5" strokeWidth={3.5} aria-hidden />
          <span className="sr-only">ถูกต้อง</span>
        </span>
      ) : null}

      {state === "wrong" ? (
        <span className="bg-danger text-danger-ink absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full">
          <X className="size-5" strokeWidth={3.5} aria-hidden />
          <span className="sr-only">ยังไม่ถูก</span>
        </span>
      ) : null}
    </button>
  );
}
