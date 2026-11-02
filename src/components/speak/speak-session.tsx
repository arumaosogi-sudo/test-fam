"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SayGame } from "@/components/games/say-game";
import { Milo } from "@/components/mascot/milo";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StarRating } from "@/components/ui/star-rating";
import { getWord } from "@/lib/content";
import type { ReviewSummary } from "@/lib/progress/session";
import { buildSpeakDeck } from "@/lib/speech/speak-deck";
import { useSpeechSupported } from "@/lib/speech/use-speech-supported";
import type { AttemptDraft, Word } from "@/lib/types";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

/**
 * ด่านฝึกพูดล้วน (G5 แบบเต็มรอบ)
 *
 * ต่างจากด่านปกติที่มีข้อพูดแทรกอยู่หนึ่งถึงสองข้อ ด่านนี้เป็นข้อพูดทั้งชุด
 * เพราะการพูดต้องซ้อมเป็นชุดติดกันจึงจะจับจังหวะปากได้ ไม่ใช่พูดทีละคำ
 * คั่นด้วยการอ่านและการสะกดเหมือนในด่านปกติ
 *
 * ไม่มีทางถอยเป็นโหมดอื่นในหน้านี้ ต่างจาก GameItem โดยตั้งใจ — ถ้าเบราว์เซอร์
 * ถอดเสียงไม่ได้ ก็บอกไปตรง ๆ ว่าเล่นหน้านี้ไม่ได้และต้องเปิดด้วยเบราว์เซอร์ไหน
 * ดีกว่าสลับไปให้เล่นเกมสะกดคำแล้วเด็กไม่รู้ว่าทำไมไม่ได้พูด
 */
export function SpeakSession() {
  useHydrateProgress();

  const hydrated = useProgressStore((state) => state.hydrated);
  const supported = useSpeechSupported();

  if (!hydrated) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังเลือกคำให้ซ้อม…</p>
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
          การตรวจเสียงต้องใช้ Chrome, Edge หรือ Safari ส่วน Firefox
          ยังไม่รองรับ · โหมดอื่นเล่นได้ปกติทุกเบราว์เซอร์
        </CardNote>
        <Link href="/learn" className={`${buttonVariants({ size: "md" })} mt-2`}>
          กลับไปแผนที่ด่าน
        </Link>
      </Card>
    );
  }

  return <SpeakDeckRunner />;
}

/**
 * แยกออกมาเพื่อให้ "เลือกชุดคำครั้งเดียวแล้วตรึงไว้" ทำได้จริง
 *
 * ชุดคำมาจากดาวทักษะพูด ซึ่งขยับทันทีที่ตอบแต่ละข้อ ถ้าคำนวณใหม่ทุกครั้ง
 * ที่ดาวเปลี่ยน ชุดจะสลับกลางคัน (เหตุผลเดียวกับด่านทบทวน)
 */
function SpeakDeckRunner() {
  const mastery = useProgressStore((state) => state.mastery);
  const finishReview = useProgressStore((state) => state.finishReview);

  const [wordIds] = useState(() => buildSpeakDeck({ mastery }));

  const words = useMemo(
    () =>
      wordIds
        .map(getWord)
        .filter((word): word is Word => word !== undefined),
    [wordIds],
  );

  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<AttemptDraft[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  function handleComplete(itemAttempts: AttemptDraft[]) {
    const all = [...attempts, ...itemAttempts];
    setAttempts(all);

    if (index + 1 < words.length) {
      setIndex(index + 1);
      return;
    }

    /**
     * ใช้ทางเดียวกับด่านทบทวน เพราะด่านนี้ก็ไม่ใช่ด่านของหลักสูตร
     * จึงไม่ควรไปเขียนผลลงช่องของด่าน (results) ที่ใช้ตัดสินการปลดล็อก
     * ส่วน dueCleared เป็น 0 เพราะด่านนี้ไม่ได้เคลียร์คิวทบทวนของใคร
     */
    setSummary(finishReview(all, 0));
  }

  // ยังไม่เคยเล่นด่านไหนเลย จึงยังไม่มีคำที่ "เคยเจอแล้ว" ให้ซ้อมพูด
  if (words.length === 0) {
    return (
      <Card className="mx-auto mt-10 max-w-md space-y-3 text-center">
        <div className="flex justify-center">
          <Milo state="idle" size={120} />
        </div>
        <CardTitle>ยังไม่มีคำให้ซ้อมพูด</CardTitle>
        <CardNote>
          ด่านนี้หยิบคำที่เคยเรียนแล้วมาให้ออกเสียง เล่นด่านปกติสักด่านก่อนนะ
        </CardNote>
        <Link href="/learn" className={`${buttonVariants({ size: "md" })} mt-2`}>
          ไปเล่นด่าน
        </Link>
      </Card>
    );
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-6 text-center">
        <Milo state={summary.stars >= 2 ? "happy" : "oops"} size={170} />

        <div className="space-y-2">
          <h1 className="text-kid-2xl font-extrabold">ซ้อมพูดเสร็จแล้ว!</h1>
          <div className="flex justify-center">
            <StarRating value={summary.stars} size="lg" animate />
          </div>
        </div>

        <Card className="space-y-2 text-left">
          <div className="flex justify-between font-bold">
            <span>พูดได้</span>
            <span>
              {summary.correctCount}/{summary.totalCount} คำ
            </span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ได้รับ</span>
            <span className="text-accent-edge">+{summary.xpEarned} XP</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ไฟต่อเนื่อง</span>
            <span>🔥 {summary.streakDays} วัน</span>
          </div>
          <CardNote>
            คำที่ยังพูดไม่ได้จะถูกหยิบมาให้ซ้อมอีกในรอบต่อไป
          </CardNote>
          {summary.leveledUp ? (
            <CardNote className="text-success-edge font-extrabold">
              🎉 เลเวลขึ้นแล้ว!
            </CardNote>
          ) : null}
        </Card>

        <div className="flex flex-col gap-3">
          <Link
            href="/learn"
            className={buttonVariants({ size: "lg", variant: "accent" })}
          >
            กลับไปแผนที่ด่าน
          </Link>
        </div>
      </div>
    );
  }

  const word = words[index];

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/learn"
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            ← ออก
          </Link>
          <span className="text-ink-muted text-kid-sm font-bold">
            ซ้อมพูด {index + 1} จาก {words.length}
          </span>
        </div>
        <ProgressBar value={index} max={words.length} tone="accent" />
      </header>

      <SayGame key={word.id} word={word} onComplete={handleComplete} />
    </div>
  );
}
