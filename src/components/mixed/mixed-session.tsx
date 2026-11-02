"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { GameItem } from "@/components/games/game-item";
import { Milo } from "@/components/mascot/milo";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StarRating } from "@/components/ui/star-rating";
import { buildReviewItems, levelFloorFor } from "@/lib/content/lessons";
import { buildMixedDeck } from "@/lib/content/mixed-deck";
import type { ReviewSummary } from "@/lib/progress/session";
import { seededRandom } from "@/lib/random";
import type { AttemptDraft } from "@/lib/types";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

/**
 * ด่านรวมทุกหัวข้อ (G13)
 *
 * ที่เดียวที่รวมทุกอย่างที่เคยเรียนมาไว้ด้วยกัน แล้วสลับคำจากทุกหัวข้อปนกัน
 * ต่างจากแผนที่ด่านที่แยกเป็นบท และต่างจากด่านทบทวนที่หยิบตามคิวความจำ
 * (เหตุผลเต็มอยู่ในหัวคอมเมนต์ของ `lib/content/mixed-deck.ts`)
 */
export function MixedSession() {
  useHydrateProgress();

  const hydrated = useProgressStore((state) => state.hydrated);

  if (!hydrated) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังรวมคำจากทุกหัวข้อ…</p>
      </div>
    );
  }

  return <MixedDeckRunner />;
}

/**
 * แยกออกมาเพื่อให้ "เลือกชุดครั้งเดียวแล้วตรึงไว้" ทำได้จริง
 * (เหตุผลเดียวกับด่านทบทวนและด่านซ้อมพูด — ดาวขยับทันทีที่ตอบแต่ละข้อ)
 */
function MixedDeckRunner() {
  const mastery = useProgressStore((state) => state.mastery);
  const cefr = useProgressStore((state) => state.profile.cefr);
  const totalAttempts = useProgressStore((state) => state.profile.totalAttempts);
  const finishReview = useProgressStore((state) => state.finishReview);

  /**
   * seed ผูกกับจำนวนข้อที่เคยทำ ไม่ใช่ Math.random และไม่ใช่ค่าคงที่
   *
   * ค่าคงที่จะให้ชุดเดิมทุกครั้งจนน่าเบื่อ ส่วน Math.random อ่านค่าไม่คงที่
   * ระหว่าง render ซึ่งโปรเจกต์นี้เลี่ยงทั้งโปรเจกต์ (ดู lib/random.ts)
   * การผูกกับจำนวนข้อที่ทำไปแล้วได้ทั้งสองอย่าง: เล่นเสร็จหนึ่งรอบแล้ว
   * ชุดถัดไปเปลี่ยน แต่ระหว่างรอบเดียวกันลำดับไม่ขยับ
   */
  const [deck] = useState(() =>
    buildMixedDeck({
      mastery,
      random: seededRandom(`mixed-${totalAttempts}`),
    }),
  );

  const items = useMemo(
    () =>
      buildReviewItems(
        deck.wordIds,
        (wordId) => ({
          recognize: mastery[wordId]?.recognize ?? 0,
          write: mastery[wordId]?.write ?? 0,
        }),
        levelFloorFor(cefr),
      ),
    [deck, mastery, cefr],
  );

  const [itemIndex, setItemIndex] = useState(0);
  const [attempts, setAttempts] = useState<AttemptDraft[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  function handleItemComplete(itemAttempts: AttemptDraft[]) {
    const all = [...attempts, ...itemAttempts];
    setAttempts(all);

    if (itemIndex + 1 < items.length) {
      setItemIndex(itemIndex + 1);
      return;
    }

    /**
     * ใช้ทางเดียวกับด่านทบทวน เพราะด่านนี้ไม่ใช่ด่านของหลักสูตร จึงไม่ควร
     * เขียนผลลงช่อง results ที่ใช้ตัดสินการปลดล็อกด่าน ส่วน dueCleared
     * เป็น 0 เพราะชุดนี้ไม่ได้เลือกจากคิวทบทวน จะอ้างว่าเคลียร์คิวไม่ได้
     */
    setSummary(finishReview(all, 0));
  }

  if (items.length === 0) {
    return (
      <Card className="mx-auto mt-10 max-w-md space-y-3 text-center">
        <div className="flex justify-center">
          <Milo state="idle" size={120} />
        </div>
        <CardTitle>ยังไม่มีอะไรให้รวม</CardTitle>
        <CardNote>
          ด่านนี้รวมคำจากทุกหัวข้อที่เคยเรียน ต้องเล่นด่านปกติก่อนสักด่าน
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
          <h1 className="text-kid-2xl font-extrabold">รวมทุกหัวข้อจบแล้ว!</h1>
          <div className="flex justify-center">
            <StarRating value={summary.stars} size="lg" animate />
          </div>
        </div>

        <Card className="space-y-2 text-left">
          <div className="flex justify-between font-bold">
            <span>ตอบถูก</span>
            <span>
              {summary.correctCount}/{summary.totalCount} ข้อ
            </span>
          </div>
          <div className="flex justify-between font-bold">
            <span>กวาดมาจาก</span>
            <span>{deck.unitCount} หัวข้อ</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ได้รับ</span>
            <span className="text-accent-edge">+{summary.xpEarned} XP</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ไฟต่อเนื่อง</span>
            <span>🔥 {summary.streakDays} วัน</span>
          </div>
          {summary.leveledUp ? (
            <CardNote className="text-success-edge font-extrabold">
              🎉 เลเวลขึ้นแล้ว!
            </CardNote>
          ) : null}
        </Card>

        <Link
          href="/learn"
          className={buttonVariants({ size: "lg", variant: "accent" })}
        >
          กลับไปแผนที่ด่าน
        </Link>
      </div>
    );
  }

  const item = items[itemIndex];

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
            รวมทุกหัวข้อ {itemIndex + 1} จาก {items.length}
          </span>
        </div>
        <ProgressBar value={itemIndex} max={items.length} tone="accent" />
        {/*
          จงใจไม่บอกว่าข้อนี้มาจากหัวข้ออะไร
          ป้ายบอกหัวข้อคือคำใบ้: ตัวลวงในบางโหมดมาจากหัวข้ออื่นด้วย
          ถ้าขึ้นว่า "จากบทสี" เด็กก็ตัดตัวเลือกที่ไม่ใช่สีออกได้ทันที
          โดยไม่ต้องนึกคำจริง ซึ่งลบประโยชน์ทั้งหมดของการปนหัวข้อ
        */}
      </header>

      <GameItem key={item.id} item={item} onComplete={handleItemComplete} />
    </div>
  );
}
