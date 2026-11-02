"use client";

import Link from "next/link";
import { useState } from "react";

import { Milo } from "@/components/mascot/milo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { LevelBadge } from "@/components/ui/level-badge";
import { READINGS } from "@/lib/content/readings";
import { CEFR_ORDER } from "@/lib/types";
import type { ReadAloudScore } from "@/lib/speech";
import { useSpeechSupported } from "@/lib/speech/use-speech-supported";
import type { AttemptDraft, Reading } from "@/lib/types";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

import { ReadAloudGame } from "./read-aloud-game";

/**
 * โหมดอ่านออกเสียง (G6) — เลือกเรื่อง อ่านให้ฟัง แล้วตอบคำถามท้ายเรื่อง
 *
 * เรื่องเรียงตามระดับ และเรื่องของทุกระดับเปิดให้อ่านได้เลย ไม่ล็อกตามระดับ
 * ที่เด็กเลือกไว้ เพราะการอ่านออกเสียงเรื่องที่ "ง่ายกว่าระดับตัวเอง"
 * เป็นวิธีฝึกความคล่องที่ใช้กันจริง ไม่ใช่การถอยหลัง
 */
export function ReadSession() {
  useHydrateProgress();

  const hydrated = useProgressStore((state) => state.hydrated);
  const supported = useSpeechSupported();
  const finishReview = useProgressStore((state) => state.finishReview);

  const [reading, setReading] = useState<Reading | null>(null);
  const [done, setDone] = useState<{ score: ReadAloudScore; xp: number } | null>(
    null,
  );

  if (!hydrated) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังเปิดหนังสือ…</p>
      </div>
    );
  }

  if (!supported) {
    return (
      <Card className="mx-auto mt-10 max-w-md space-y-3 text-center">
        <div className="flex justify-center">
          <Milo state="oops" size={120} />
        </div>
        <CardTitle>เบราว์เซอร์นี้ยังฟังเสียงไม่ได้</CardTitle>
        <CardNote>
          การตรวจการอ่านต้องใช้ Chrome, Edge หรือ Safari ส่วน Firefox
          ยังไม่รองรับ · โหมดอื่นเล่นได้ปกติทุกเบราว์เซอร์
        </CardNote>
        <Link href="/learn" className={`${buttonVariants({ size: "md" })} mt-2`}>
          กลับไปแผนที่ด่าน
        </Link>
      </Card>
    );
  }

  function handleFinish(attempts: AttemptDraft[], score: ReadAloudScore) {
    /**
     * ใช้ทางเดียวกับด่านทบทวน เพราะโหมดนี้ไม่ใช่ด่านของหลักสูตร
     * จึงไม่ควรเขียนผลลงช่อง results ที่ใช้ตัดสินการปลดล็อกด่าน
     */
    const summary = finishReview(attempts, 0);
    setDone({ score, xp: summary.xpEarned });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-6 text-center">
        <Milo state={done.score.accuracy >= 0.7 ? "happy" : "oops"} size={170} />
        <h1 className="text-kid-2xl font-extrabold">เก่งมาก อ่านจบแล้ว!</h1>

        <Card className="space-y-2 text-left">
          <div className="flex justify-between font-bold">
            <span>อ่านตรง</span>
            <span>
              {done.score.matched}/{done.score.total} คำ
            </span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ได้รับ</span>
            <span className="text-accent-edge">+{done.xp} XP</span>
          </div>
          <CardNote>
            คำที่อ่านไม่ตรงถูกบันทึกไว้แล้ว จะโผล่มาให้ซ้อมอีกในด่านทบทวน
          </CardNote>
        </Card>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            variant="accent"
            onClick={() => {
              setDone(null);
              setReading(null);
            }}
          >
            เลือกเรื่องอื่น
          </Button>
          <Link
            href="/learn"
            className={buttonVariants({ size: "md", variant: "ghost" })}
          >
            กลับไปแผนที่ด่าน
          </Link>
        </div>
      </div>
    );
  }

  if (reading) {
    return (
      <div className="mx-auto max-w-xl space-y-5 py-6">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setReading(null)}
          className="self-start"
        >
          ← เลือกเรื่องอื่น
        </Button>
        <ReadAloudGame
          key={reading.id}
          reading={reading}
          onFinish={handleFinish}
        />
      </div>
    );
  }

  /**
   * จัดกลุ่มตามระดับ ไม่ใช่เรียงเป็นแถวยาว
   *
   * 20 เรื่องในลิสต์เดียวทำให้เด็กต้องเลื่อนหาเอง และมองไม่ออกว่าเรื่องไหน
   * อยู่ระดับตัวเอง หัวข้อระดับทำให้เลือกได้โดยไม่ต้องอ่านทุกชื่อเรื่อง
   */
  const levels = CEFR_ORDER.map((level) => ({
    level,
    items: READINGS.filter((item) => item.cefr === level),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/learn"
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            ← ออก
          </Link>
        </div>
        <h1 className="text-kid-2xl font-extrabold">อ่านออกเสียง</h1>
        <p className="text-ink-muted text-kid-sm font-bold">
          เลือกเรื่องแล้วอ่านให้ฟัง · {READINGS.length} เรื่อง
          ทุกเรื่องใช้แต่คำที่มีในคลังคำของแอป
        </p>
      </header>

      {levels.map((group) => (
        <section key={group.level} className="space-y-3">
          <div className="flex items-center gap-2">
            <LevelBadge level={group.level} withGrade />
            <span className="text-ink-muted text-kid-sm font-bold">
              {group.items.length} เรื่อง
            </span>
          </div>

          <div className="grid gap-3">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setReading(item)}
                className="pressable active:pressable-sunk bg-surface-1 border-border rounded-card [--edge:var(--border)] space-y-1 border-2 p-4 text-left"
              >
                <span className="text-kid-lg block font-extrabold">
                  {item.titleEn}
                </span>
                <p className="text-ink-muted text-kid-sm font-bold">
                  {item.titleTh} · {item.sentences.length} ประโยค
                </p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
