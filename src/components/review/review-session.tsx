"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { GameItem } from "@/components/games/game-item";
import { Milo } from "@/components/mascot/milo";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StarRating } from "@/components/ui/star-rating";
import { buildReviewItems } from "@/lib/content/lessons";
import type { ReviewSummary } from "@/lib/progress/session";
import { seededRandom } from "@/lib/random";
import { useNow } from "@/lib/use-now";
import { buildReviewDeck } from "@/lib/srs/review-deck";
import type { AttemptDraft } from "@/lib/types";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

/**
 * ด่านทบทวนรายวัน (G12)
 *
 * ต่างจากด่านปกติตรงที่ชุดคำไม่ได้มาจากหลักสูตร แต่มาจากคิวของ FSRS
 * คือคำที่ระบบคำนวณว่าเด็กกำลังจะลืมพอดี ด่านนี้จึงเป็นเครื่องยนต์ที่ทำให้
 * คำที่เรียนไปแล้วไม่หล่นหาย ไม่ใช่การเรียนคำใหม่
 */
export function ReviewSession() {
  useHydrateProgress();

  const hydrated = useProgressStore((state) => state.hydrated);
  const now = useNow();

  // รอทั้งความคืบหน้าและนาฬิกา เพราะคิวทบทวนขึ้นกับทั้งสองอย่าง
  if (!hydrated || !now) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังดูว่ามีคำไหนรอทบทวน…</p>
      </div>
    );
  }

  return <ReviewDeckRunner now={now} />;
}

/**
 * แยกออกมาเป็นอีก component เพื่อให้ "สร้างชุดครั้งเดียวแล้วตรึงไว้" ทำได้จริง
 *
 * lazy initializer ของ useState ทำงานตอน component นี้ถูกวาดครั้งแรก ซึ่งคือ
 * หลัง mount บนเบราว์เซอร์แน่นอน (ตัวแม่กันไว้แล้วว่ายังไม่รู้เวลาจะไม่วาดตัวนี้)
 * ถ้าปล่อยให้คำนวณใหม่ทุกครั้งที่ cards เปลี่ยน ชุดจะสลับกลางคัน เพราะการตอบ
 * แต่ละข้อไปเลื่อนวันนัดของคำนั้นทันที
 */
function ReviewDeckRunner({ now }: { now: Date }) {
  const cards = useProgressStore((state) => state.cards);
  const mastery = useProgressStore((state) => state.mastery);
  const wordDifficulty = useProgressStore((state) => state.wordDifficulty);
  const elo = useProgressStore((state) => state.profile.elo);
  const finishReview = useProgressStore((state) => state.finishReview);

  const [deck] = useState(() =>
    buildReviewDeck({
      cards,
      wordDifficulty,
      playerRating: elo,
      now,
      random: seededRandom("review"),
    }),
  );

  const items = useMemo(
    () =>
      buildReviewItems(deck.wordIds, (wordId) => ({
        recognize: mastery[wordId]?.recognize ?? 0,
        write: mastery[wordId]?.write ?? 0,
      })),
    [deck, mastery],
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

    setSummary(finishReview(all, deck.dueCount));
  }

  // ยังไม่เคยเล่นด่านไหนเลย จึงยังไม่มีคำให้ทบทวน
  if (items.length === 0) {
    return (
      <Card className="mx-auto mt-10 max-w-md space-y-3 text-center">
        <div className="flex justify-center">
          <Milo state="idle" size={120} />
        </div>
        <CardTitle>ยังไม่มีคำให้ทบทวน</CardTitle>
        <CardNote>
          ด่านทบทวนจะหยิบคำที่เคยเรียนแล้วและกำลังจะลืมมาให้ เล่นด่านปกติสักด่านก่อนนะ
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
          <h1 className="text-kid-2xl font-extrabold">ทบทวนเสร็จแล้ว!</h1>
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
            <span>ได้รับ</span>
            <span className="text-accent-edge">+{summary.xpEarned} XP</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ไฟต่อเนื่อง</span>
            <span>🔥 {summary.streakDays} วัน</span>
          </div>
          {summary.dueCleared > 0 ? (
            <CardNote>
              เคลียร์คำที่ถึงกำหนดทบทวนไป {summary.dueCleared} คำ
            </CardNote>
          ) : (
            <CardNote>
              วันนี้ไม่มีคำถึงกำหนด ชุดนี้เป็นการฝึกเพิ่มให้แน่นขึ้น
            </CardNote>
          )}
          {summary.leveledUp ? (
            <CardNote className="text-success-edge font-extrabold">
              🎉 เลเวลขึ้นแล้ว!
            </CardNote>
          ) : null}
          {summary.usedFreeze ? (
            <CardNote>ใช้ตั๋วกันไฟดับไป 1 ใบ เพราะเมื่อวานไม่ได้เล่น</CardNote>
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
            ทบทวน {itemIndex + 1} จาก {items.length}
          </span>
        </div>
        <ProgressBar value={itemIndex} max={items.length} tone="accent" />
      </header>

      <GameItem key={item.id} item={item} onComplete={handleItemComplete} />
    </div>
  );
}
