import { describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/content/lessons";
import type { Attempt } from "@/lib/types";

import {
  applyLessonResult,
  createInitialProgress,
  isLessonUnlocked,
  nextLessonId,
  type ProgressSnapshot,
} from "./session";

const NOW = new Date(2026, 0, 10, 10, 0, 0);
const LESSON = LESSONS[0];

function attemptsFor(correctCount: number, total = 5): Attempt[] {
  return Array.from({ length: total }, (_, index) => ({
    wordId: LESSON.wordIds[index % LESSON.wordIds.length],
    skill: "recognize" as const,
    correct: index < correctCount,
    latencyMs: 4000,
    at: NOW.toISOString(),
  }));
}

function play(
  snapshot: ProgressSnapshot,
  correctCount: number,
  total = 5,
  now = NOW,
) {
  return applyLessonResult(
    snapshot,
    LESSON.id,
    attemptsFor(correctCount, total),
    now,
  );
}

describe("applyLessonResult", () => {
  it("ตอบถูกหมดได้ 3 ดาวและ XP รวมโบนัส", () => {
    const { summary } = play(createInitialProgress(), 5);

    expect(summary.accuracy).toBe(1);
    expect(summary.stars).toBe(3);
    expect(summary.isFirstClear).toBe(true);
    expect(summary.xpEarned).toBeGreaterThan(5 * 10);
  });

  it("ตอบถูกครึ่งเดียวยังได้ 1 ดาว ไม่ใช่ศูนย์", () => {
    const { summary } = play(createInitialProgress(), 2);

    expect(summary.stars).toBe(1);
  });

  it("สร้างการ์ดทบทวนและความชำนาญให้ทุกคำที่เจอ", () => {
    const { snapshot } = play(createInitialProgress(), 5);

    for (const wordId of LESSON.wordIds) {
      expect(snapshot.cards[wordId], wordId).toBeDefined();
      expect(snapshot.mastery[wordId].recognize).toBeGreaterThan(0);
      expect(new Date(snapshot.cards[wordId].dueAt).getTime()).toBeGreaterThan(
        NOW.getTime(),
      );
    }
  });

  it("ตอบผิดทำให้ความชำนาญไม่ขึ้น และคำนั้นกลับมาเร็ว", () => {
    const { snapshot } = play(createInitialProgress(), 0);
    const wordId = LESSON.wordIds[0];

    expect(snapshot.mastery[wordId].recognize).toBe(0);
    const dueInDays =
      (new Date(snapshot.cards[wordId].dueAt).getTime() - NOW.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(dueInDays).toBeLessThanOrEqual(1);
  });

  it("ตอบถูกดันคะแนนความสามารถขึ้น ตอบผิดดันลง", () => {
    const start = createInitialProgress();

    expect(play(start, 5).snapshot.profile.elo).toBeGreaterThan(
      start.profile.elo,
    );
    expect(play(start, 0).snapshot.profile.elo).toBeLessThan(
      start.profile.elo,
    );
  });

  it("นับจำนวนข้อที่ทำสะสมไว้ ใช้ปรับความไวของคะแนน", () => {
    const { snapshot } = play(createInitialProgress(), 3);

    expect(snapshot.profile.totalAttempts).toBe(5);
  });

  it("เล่นซ้ำแล้วได้แย่ลง ดาวที่บันทึกไว้ต้องไม่ลดลง", () => {
    const first = play(createInitialProgress(), 5).snapshot;
    expect(first.results[LESSON.id].stars).toBe(3);

    const second = play(first, 1, 5, new Date(2026, 0, 11, 10)).snapshot;

    expect(second.results[LESSON.id].stars).toBe(3);
    expect(second.results[LESSON.id].bestAccuracy).toBe(1);
  });

  it("เล่นซ้ำไม่นับเป็นการผ่านครั้งแรกอีก", () => {
    const first = play(createInitialProgress(), 5).snapshot;
    const { summary } = play(first, 5, 5, new Date(2026, 0, 11, 10));

    expect(summary.isFirstClear).toBe(false);
  });

  it("เล่นแล้วไฟต่อเนื่องเริ่มนับ และเล่นวันถัดไปไฟเพิ่ม", () => {
    const day1 = play(createInitialProgress(), 5);
    expect(day1.summary.streakDays).toBe(1);

    const day2 = play(day1.snapshot, 5, 5, new Date(2026, 0, 11, 10));
    expect(day2.summary.streakDays).toBe(2);
  });

  it("บอกว่าเลเวลขึ้นเมื่อ XP ข้ามเกณฑ์", () => {
    let snapshot = createInitialProgress();
    let sawLevelUp = false;

    for (let day = 0; day < 6; day += 1) {
      const result = play(snapshot, 5, 5, new Date(2026, 0, 10 + day, 10));
      snapshot = result.snapshot;
      sawLevelUp = sawLevelUp || result.summary.leveledUp;
    }

    expect(sawLevelUp).toBe(true);
    expect(snapshot.profile.xp).toBeGreaterThan(0);
  });

  it("ไม่แก้ไข snapshot เดิม", () => {
    const start = createInitialProgress();
    play(start, 5);

    expect(start.profile.xp).toBe(0);
    expect(Object.keys(start.cards).length).toBe(0);
    expect(Object.keys(start.results).length).toBe(0);
  });

  it("ด่านที่ไม่มีข้อเลยไม่ทำให้ความแม่นยำกลายเป็น NaN", () => {
    const { summary } = applyLessonResult(
      createInitialProgress(),
      LESSON.id,
      [],
      NOW,
    );

    expect(summary.accuracy).toBe(0);
    expect(Number.isNaN(summary.accuracy)).toBe(false);
  });
});

describe("การปลดล็อกด่าน", () => {
  it("ด่านแรกเปิดเสมอ", () => {
    expect(isLessonUnlocked({}, LESSONS[0].id)).toBe(true);
  });

  it("ด่านที่สองยังไม่เปิดจนกว่าจะผ่านด่านแรก", () => {
    expect(isLessonUnlocked({}, LESSONS[1].id)).toBe(false);

    const { snapshot } = play(createInitialProgress(), 5);
    expect(isLessonUnlocked(snapshot.results, LESSONS[1].id)).toBe(true);
  });

  it("nextLessonId ชี้ไปด่านแรกที่ยังไม่ผ่าน", () => {
    expect(nextLessonId({})).toBe(LESSONS[0].id);

    const { snapshot } = play(createInitialProgress(), 5);
    expect(nextLessonId(snapshot.results)).toBe(LESSONS[1].id);
  });
});
