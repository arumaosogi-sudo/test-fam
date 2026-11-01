"use client";

import { Flame, Lock } from "lucide-react";
import Link from "next/link";

import { Milo } from "@/components/mascot/milo";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { LevelBadge } from "@/components/ui/level-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StarRating } from "@/components/ui/star-rating";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UNITS } from "@/lib/content";
import { lessonsInUnit } from "@/lib/content/lessons";
import { isSkillPassed } from "@/lib/progress/mastery";
import { isLessonUnlocked, nextLessonId } from "@/lib/progress/session";
import { levelProgress } from "@/lib/progress/xp";
import { countDue } from "@/lib/srs/review-deck";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

export default function LearnPage() {
  useHydrateProgress();

  const hydrated = useProgressStore((state) => state.hydrated);
  const profile = useProgressStore((state) => state.profile);
  const results = useProgressStore((state) => state.results);
  const mastery = useProgressStore((state) => state.mastery);
  const cards = useProgressStore((state) => state.cards);

  // นาฬิกาอ่านได้เฉพาะหลัง mount ตอน build ยังไม่รู้ว่าเด็กจะเปิดหน้านี้วันไหน
  const now = useNow();

  if (!hydrated) {
    return (
      <main className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังโหลดความคืบหน้า…</p>
      </main>
    );
  }

  const { level, current, needed } = levelProgress(profile.xp);
  const upcoming = nextLessonId(results);

  // นับจากทักษะจำคำเป็นตัวแทน เพราะเป็นทักษะที่ทุกโหมดแตะ และเด็กเข้าใจง่ายที่สุด
  const wordsLearned = Object.values(mastery).filter((item) =>
    isSkillPassed(item, "recognize"),
  ).length;

  // ก่อนรู้เวลา ถือว่ายังไม่มีคำถึงกำหนด ปุ่มจะอัปเดตเองทันทีที่รู้
  const dueCount = now ? countDue(cards, now) : 0;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <Card className="flex flex-wrap items-center gap-4">
        <Milo state="idle" size={96} />

        <div className="min-w-56 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{profile.displayName}</CardTitle>
            <LevelBadge level={profile.cefr} withGrade />
          </div>

          <ProgressBar
            value={current}
            max={needed}
            label={`เลเวล ${level}`}
            tone="accent"
          />

          <div className="text-kid-sm flex flex-wrap gap-4 font-bold">
            <span className="inline-flex items-center gap-1">
              <Flame className="text-accent size-5" aria-hidden />
              {profile.streakDays} วันติด
            </span>
            <span>📚 จำได้แล้ว {wordsLearned} คำ</span>
          </div>
        </div>
      </Card>

      {upcoming ? (
        <Link
          href={`/play/${upcoming}`}
          className={cn(
            buttonVariants({ size: "xl", variant: "accent" }),
            "w-full",
          )}
        >
          เล่นด่านต่อไป
        </Link>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/review"
          className={cn(
            buttonVariants({
              size: "lg",
              variant: dueCount > 0 ? "success" : "neutral",
            }),
            "w-full",
          )}
        >
          {dueCount > 0
            ? `🔁 ทบทวน ${dueCount} คำที่ใกล้ลืม`
            : "🔁 ทบทวนคำเก่า"}
        </Link>
        <Link
          href="/chat"
          className={cn(
            buttonVariants({ size: "lg", variant: "neutral" }),
            "w-full",
          )}
        >
          💬 คุยกับ Milo
        </Link>
      </div>

      <div className="space-y-6">
        {UNITS.map((unit) => {
          const lessons = lessonsInUnit(unit.id);
          const cleared = lessons.filter((lesson) => results[lesson.id]).length;

          return (
            <section key={unit.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-kid-2xl" aria-hidden>
                  {unit.emoji}
                </span>
                <div className="flex-1">
                  <h2 className="text-kid-lg font-extrabold">
                    {unit.titleTh}{" "}
                    <span className="text-ink-muted font-bold">
                      · {unit.titleEn}
                    </span>
                  </h2>
                  <CardNote>
                    ผ่านแล้ว {cleared} จาก {lessons.length} ด่าน
                  </CardNote>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {lessons.map((lesson) => {
                  const result = results[lesson.id];
                  const unlocked = isLessonUnlocked(results, lesson.id);

                  if (!unlocked) {
                    return (
                      <div
                        key={lesson.id}
                        className="bg-surface-2 border-border text-ink-muted flex size-20 flex-col items-center justify-center rounded-full border-2"
                        aria-label={`ด่าน ${lesson.order} ยังไม่ปลดล็อก`}
                      >
                        <Lock className="size-6" aria-hidden />
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={lesson.id}
                      href={`/play/${lesson.id}`}
                      aria-label={`ด่าน ${lesson.order} ของหน่วย ${unit.titleTh}${
                        result ? ` ได้ ${result.stars} ดาว` : " ยังไม่เคยเล่น"
                      }`}
                      className={cn(
                        "pressable active:pressable-sunk flex size-20 flex-col items-center justify-center gap-1 rounded-full border-2 font-extrabold",
                        result
                          ? "[--edge:var(--success-edge)] bg-success-soft border-success text-ink"
                          : "[--edge:var(--primary-edge)] bg-primary text-primary-ink border-transparent",
                      )}
                    >
                      <span className="text-kid-lg">{lesson.order}</span>
                      {result ? (
                        <StarRating value={result.stars} size="sm" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
