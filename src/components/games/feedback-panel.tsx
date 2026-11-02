"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { WordImage } from "@/components/ui/word-image";
import type { Word } from "@/lib/types";
import { cn } from "@/lib/utils";

type FeedbackPanelProps = {
  correct: boolean;
  word: Word;
  /** ประโยคเต็มที่เฉลยแล้ว ใส่เฉพาะโหมดที่เล่นกับประโยค */
  sentence?: string;
  onNext: () => void;
};

/**
 * แถบเฉลยที่ขึ้นหลังเด็กตอบ ใช้ร่วมกันทุกโหมดที่ตอบทีละข้อ
 *
 * ตามกฎการออกแบบข้อ 2 (ตอบผิดไม่ลงโทษ) เวลาตอบผิดเราไม่ได้แค่บอกว่าผิด
 * แต่โชว์คำตอบ คำแปล และปุ่มฟังเสียงให้ทันที เพราะจุดที่เด็กเพิ่งรู้ว่าตัวเอง
 * ไม่รู้ คือจังหวะที่สอนได้ดีที่สุด ถ้าปล่อยผ่านไปข้อถัดไปเลยจะเสียโอกาสนั้น
 *
 * สถานะถูก/ผิดบอกด้วยไอคอนและข้อความด้วย ไม่ใช่สีอย่างเดียว (กฎข้อ 6)
 */
export function FeedbackPanel({
  correct,
  word,
  sentence,
  onNext,
}: FeedbackPanelProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-card space-y-3 border-2 p-4",
        correct
          ? "bg-success-soft border-success"
          : "bg-danger-soft border-danger",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            correct
              ? "bg-success text-success-ink"
              : "bg-danger text-danger-ink",
          )}
        >
          {correct ? (
            <Check className="size-6" strokeWidth={3.5} aria-hidden />
          ) : (
            <X className="size-6" strokeWidth={3.5} aria-hidden />
          )}
        </span>
        <p className="text-kid-lg text-ink font-extrabold">
          {correct ? "เก่งมาก!" : "ไม่เป็นไร มาดูคำตอบกัน"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {word.image ? (
          <WordImage wordId={word.id} className="size-11" />
        ) : null}
        <div className="min-w-0">
          <p className="text-kid-lg text-ink font-extrabold">{word.en}</p>
          <p className="text-ink-muted text-kid-sm font-bold">
            {word.th} · {word.ipa}
          </p>
        </div>
        <SpeakerButton text={word.en} size="sm" className="ml-auto" />
        <SpeakerButton text={word.en} slow size="sm" />
      </div>

      {sentence ? (
        <div className="flex items-center gap-3">
          <p className="text-ink text-kid-sm min-w-0 font-bold">{sentence}</p>
          <SpeakerButton text={sentence} size="sm" className="ml-auto" />
        </div>
      ) : null}

      <Button
        size="md"
        variant={correct ? "accent" : "neutral"}
        onClick={onNext}
        className="w-full"
        autoFocus
      >
        ต่อไป
      </Button>
    </div>
  );
}
