"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { CEFR_GRADE_LABEL, LevelBadge } from "@/components/ui/level-badge";
import { CEFR_ORDER, type CefrLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * อธิบายว่าเลือกระดับนี้แล้วข้อจะเป็นแบบไหน — เป็นภาษาที่ผู้ปกครองตัดสินใจได้
 * ไม่ใช่ศัพท์ CEFR ลอย ๆ ที่คนนอกวงการสอนภาษาไม่รู้ว่าแปลว่าอะไร
 */
const WHAT_YOU_GET: Record<CefrLevel, string> = {
  "Pre-A1": "เริ่มจากเลือกคำจากตัวเลือก เหมาะกับเด็กที่ยังอ่านอังกฤษไม่ออก",
  A1: "เริ่มจากต่อตัวอักษรเป็นคำ เหมาะกับเด็กที่พอสะกดได้บ้าง",
  A2: "ต้องพิมพ์คำเองตั้งแต่ข้อแรก",
  B1: "ต้องพิมพ์คำเองตั้งแต่ข้อแรก และคุยกับ Milo เป็นประโยคยาวขึ้น",
  B2: "ต้องพิมพ์คำเองตั้งแต่ข้อแรก และคุยกับ Milo แบบเจ้าของภาษา",
  C1: "ต้องพิมพ์คำเองตั้งแต่ข้อแรก และคุยกับ Milo แบบเจ้าของภาษา",
};

type LevelPickerProps = {
  value: CefrLevel;
  onChange: (level: CefrLevel) => void;
  /** โหมดต้อนรับ: แสดงกางไว้เลยสำหรับเด็กที่เพิ่งเปิดแอปครั้งแรก */
  welcome?: boolean;
};

export function LevelPicker({ value, onChange, welcome }: LevelPickerProps) {
  const [open, setOpen] = useState(Boolean(welcome));

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-ink-muted text-kid-sm font-bold">ระดับของหนู</span>
        <LevelBadge level={value} withGrade />
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          เปลี่ยนระดับ
        </Button>
      </div>
    );
  }

  return (
    <Card className="space-y-3">
      <CardTitle>{welcome ? "หนูเก่งอังกฤษระดับไหนแล้ว" : "เลือกระดับ"}</CardTitle>
      <CardNote>
        เลือกให้พอดีกับตัวเอง ข้อจะไม่ง่ายกว่าระดับที่เลือก
        แต่ถ้าทำได้ดีขึ้นเรื่อย ๆ ระบบจะเพิ่มความยากให้เองทีละคำ · เปลี่ยนทีหลังได้ตลอด
      </CardNote>

      <div className="grid gap-2">
        {CEFR_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => {
              onChange(level);
              setOpen(false);
            }}
            aria-pressed={level === value}
            className={cn(
              "rounded-tile flex w-full items-center gap-3 border-2 p-3 text-left",
              level === value
                ? "bg-primary-soft border-primary"
                : "bg-surface-2 border-border",
            )}
          >
            <LevelBadge level={level} />
            <span className="min-w-0 flex-1">
              <span className="text-ink text-kid-sm block font-extrabold">
                {CEFR_GRADE_LABEL[level]}
              </span>
              <span className="text-ink-muted text-kid-sm block font-bold">
                {WHAT_YOU_GET[level]}
              </span>
            </span>
          </button>
        ))}
      </div>

      <CardNote>
        ตอนนี้มีคำศัพท์ระดับ Pre-A1, A1 และ A2 แล้ว ส่วนระดับ B1 ขึ้นไปจะได้คำ
        ชุดเดียวกันแต่ต้องตอบแบบยากขึ้น — คำศัพท์ระดับนั้นกำลังทยอยเพิ่ม
      </CardNote>
    </Card>
  );
}
