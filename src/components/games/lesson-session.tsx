"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Milo } from "@/components/mascot/milo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StarRating } from "@/components/ui/star-rating";
import { getWord } from "@/lib/content";
import { buildItems, getLesson, lessonWords } from "@/lib/content/lessons";
import type { LessonSummary } from "@/lib/progress/session";
import { nextLessonId } from "@/lib/progress/session";
import { seededRandom } from "@/lib/random";
import type { AttemptDraft, Item } from "@/lib/types";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

import { ClozeGame } from "./cloze-game";
import { ListenGame } from "./listen-game";
import { MatchGame } from "./match-game";
import { PictureGame } from "./picture-game";

type LessonSessionProps = {
  lessonId: string;
};

export function LessonSession({ lessonId }: LessonSessionProps) {
  useHydrateProgress();

  const lesson = getLesson(lessonId);

  const hydrated = useProgressStore((state) => state.hydrated);
  const results = useProgressStore((state) => state.results);
  const mastery = useProgressStore((state) => state.mastery);
  const finishLesson = useProgressStore((state) => state.finishLesson);

  /**
   * seed จาก id ของด่าน ทำให้ลำดับข้อเหมือนกันทั้งบนเซิร์ฟเวอร์และเบราว์เซอร์
   *
   * ความชำนาญเข้ามากำหนดว่าแต่ละคำจะได้โหมดย่อยระดับไหน ค่านี้เปลี่ยนเฉพาะ
   * ตอนเล่นจบด่าน (ไม่ใช่ระหว่างเล่น) รายการข้อจึงไม่สลับกลางด่าน
   */
  const items = useMemo(
    () =>
      lesson
        ? buildItems(lesson, seededRandom(lesson.id), (wordId) => ({
            recognize: mastery[wordId]?.recognize ?? 0,
            write: mastery[wordId]?.write ?? 0,
          }))
        : [],
    [lesson, mastery],
  );

  const [itemIndex, setItemIndex] = useState(0);
  const [attempts, setAttempts] = useState<AttemptDraft[]>([]);
  const [summary, setSummary] = useState<LessonSummary | null>(null);

  if (!lesson) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <CardTitle>ไม่พบด่านนี้</CardTitle>
        <CardNote>ด่านอาจถูกย้ายหรือพิมพ์ลิงก์ผิด</CardNote>
        <Link
          href="/learn"
          className={`${buttonVariants({ size: "md" })} mt-4`}
        >
          กลับไปแผนที่ด่าน
        </Link>
      </Card>
    );
  }

  // รอให้โหลดความคืบหน้าเสร็จก่อน ไม่งั้นผลการเล่นจะถูกเขียนทับตอน hydrate
  if (!hydrated) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังเตรียมด่าน…</p>
      </div>
    );
  }

  function handleItemComplete(itemAttempts: AttemptDraft[]) {
    const all = [...attempts, ...itemAttempts];
    setAttempts(all);

    if (itemIndex + 1 < items.length) {
      setItemIndex(itemIndex + 1);
      return;
    }

    setSummary(finishLesson(lessonId, all));
  }

  function restart() {
    setItemIndex(0);
    setAttempts([]);
    setSummary(null);
  }

  if (summary) {
    const upcoming = nextLessonId(results);

    return (
      <div className="mx-auto max-w-md space-y-5 py-6 text-center">
        <Milo state={summary.stars >= 2 ? "happy" : "oops"} size={170} />

        <div className="space-y-2">
          <h1 className="text-kid-2xl font-extrabold">
            {summary.stars === 3
              ? "เก่งมาก!"
              : summary.stars === 2
                ? "ดีแล้ว!"
                : "ลองอีกครั้งนะ"}
          </h1>
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
          {summary.leveledUp ? (
            <CardNote className="text-success-edge font-extrabold">
              🎉 เลเวลขึ้นแล้ว!
            </CardNote>
          ) : null}
          {summary.usedFreeze ? (
            <CardNote>ใช้ตั๋วกันไฟดับไป 1 ใบ เพราะเมื่อวานไม่ได้เล่น</CardNote>
          ) : null}
        </Card>

        <div className="flex flex-col gap-3">
          {upcoming && upcoming !== lessonId ? (
            <Link
              href={`/play/${upcoming}`}
              className={buttonVariants({ size: "lg", variant: "accent" })}
            >
              ด่านถัดไป
            </Link>
          ) : null}
          <Button variant="neutral" size="md" onClick={restart}>
            เล่นด่านนี้อีกครั้ง
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

  const item = items[itemIndex];
  // เก็บไว้ในตัวแปรใหม่เพราะ TypeScript ไม่พา narrowing ของ lesson เข้าไปใน closure
  const activeLesson = lesson;

  /**
   * เลือก component ตามชนิดของข้อ
   *
   * ทุกโหมดคืนผลเป็น AttemptDraft[] รูปแบบเดียวกัน ตัวคุมด่านจึงไม่ต้องรู้ว่า
   * ข้างในเกมทำอะไร และเพิ่มโหมดใหม่ได้โดยไม่แก้ตรรกะการให้คะแนน
   */
  function renderItem(current: Item) {
    if (current.kind === "match") {
      return (
        <MatchGame
          key={current.id}
          itemId={current.id}
          words={lessonWords(
            { ...activeLesson, wordIds: current.wordIds },
            getWord,
          )}
          onComplete={handleItemComplete}
        />
      );
    }

    const word = getWord(current.wordIds[0]);

    // ป้องกันคลังคำที่ถูกแก้แล้วอ้างถึงคำที่ไม่มีอยู่ — ข้ามข้อนั้นไป
    // ดีกว่าให้ทั้งด่านจอขาว และไม่บันทึกผลผิด ๆ ว่าเด็กตอบผิด
    if (!word) {
      return (
        <Card className="space-y-3 text-center">
          <CardTitle>ข้อนี้ยังไม่พร้อม</CardTitle>
          <CardNote>ไม่พบคำศัพท์ของข้อนี้ในคลังคำ</CardNote>
          <Button size="md" onClick={() => handleItemComplete([])}>
            ข้ามไปข้อถัดไป
          </Button>
        </Card>
      );
    }

    if (current.kind === "listen") {
      return (
        <ListenGame
          key={current.id}
          itemId={current.id}
          word={word}
          onComplete={handleItemComplete}
        />
      );
    }

    if (current.kind === "picture") {
      return (
        <PictureGame
          key={current.id}
          itemId={current.id}
          word={word}
          variant={current.variant}
          onComplete={handleItemComplete}
        />
      );
    }

    return (
      <ClozeGame
        key={current.id}
        itemId={current.id}
        word={word}
        level={current.level}
        onComplete={handleItemComplete}
      />
    );
  }

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
            ข้อที่ {itemIndex + 1} จาก {items.length}
          </span>
        </div>
        <ProgressBar value={itemIndex} max={items.length} />
      </header>

      {renderItem(item)}
    </div>
  );
}
