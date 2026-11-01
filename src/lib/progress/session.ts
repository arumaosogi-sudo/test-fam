import { DEFAULT_RATING, updateRatings } from "@/lib/adaptive/elo";
import { LESSONS, previousLesson } from "@/lib/content/lessons";
import { createCard, ratingFromAttempt, review } from "@/lib/srs/fsrs";
import type {
  Attempt,
  LessonResult,
  Mastery,
  Profile,
  SrsCard,
} from "@/lib/types";

import { emptyMastery, updateMastery } from "./mastery";
import {
  lessonXp,
  levelFromXp,
  registerActivity,
  starsFromAccuracy,
} from "./xp";

/**
 * รวมทุกอย่างที่เกิดขึ้นเมื่อเด็กเล่นจบหนึ่งด่าน ไว้ในฟังก์ชันบริสุทธิ์ฟังก์ชันเดียว
 *
 * ที่แยกออกมาจาก store เพราะตรงนี้คือหัวใจของการให้คะแนนทั้งระบบ
 * ถ้าฝังไว้ใน zustand จะเทสยากและพลาดง่าย ส่วน store แค่ห่อฟังก์ชันนี้อีกที
 */

export type ProgressSnapshot = {
  profile: Profile;
  cards: Record<string, SrsCard>;
  mastery: Record<string, Mastery>;
  /** ความยากของแต่ละคำที่ระบบเรียนรู้เอง ไม่ได้กำหนดไว้ล่วงหน้า */
  wordDifficulty: Record<string, number>;
  results: Record<string, LessonResult>;
};

export type LessonSummary = {
  stars: number;
  xpEarned: number;
  accuracy: number;
  correctCount: number;
  totalCount: number;
  isFirstClear: boolean;
  leveledUp: boolean;
  streakDays: number;
  usedFreeze: boolean;
};

export function createInitialProgress(): ProgressSnapshot {
  return {
    profile: {
      displayName: "เพื่อนใหม่",
      cefr: "Pre-A1",
      elo: DEFAULT_RATING,
      xp: 0,
      streakDays: 0,
      lastActiveDate: null,
      streakFreezes: 2,
      dailyGoalMinutes: 7,
      totalAttempts: 0,
    },
    cards: {},
    mastery: {},
    wordDifficulty: {},
    results: {},
  };
}

/** ด่านแรกเปิดเสมอ ด่านถัดไปเปิดเมื่อผ่านด่านก่อนหน้าแล้ว */
export function isLessonUnlocked(
  results: Record<string, LessonResult>,
  lessonId: string,
) {
  const previous = previousLesson(lessonId);
  if (!previous) return true;
  return Boolean(results[previous.id]);
}

/** ด่านถัดไปที่เด็กควรเล่น — ด่านแรกที่ยังไม่ผ่าน */
export function nextLessonId(results: Record<string, LessonResult>) {
  const next = LESSONS.find((lesson) => !results[lesson.id]);
  return next?.id ?? LESSONS[LESSONS.length - 1]?.id;
}

export function applyLessonResult(
  snapshot: ProgressSnapshot,
  lessonId: string,
  attempts: Attempt[],
  now: Date,
): { snapshot: ProgressSnapshot; summary: LessonSummary } {
  const cards = { ...snapshot.cards };
  const mastery = { ...snapshot.mastery };
  const wordDifficulty = { ...snapshot.wordDifficulty };

  let elo = snapshot.profile.elo;
  let totalAttempts = snapshot.profile.totalAttempts;

  for (const attempt of attempts) {
    // ตารางทบทวน
    const card = cards[attempt.wordId] ?? createCard(attempt.wordId, now);
    cards[attempt.wordId] = review(
      card,
      ratingFromAttempt(attempt.correct, attempt.latencyMs),
      now,
    );

    // ความชำนาญรายทักษะ
    const current = mastery[attempt.wordId] ?? emptyMastery(attempt.wordId);
    mastery[attempt.wordId] = updateMastery(
      current,
      attempt.skill,
      attempt.correct,
    );

    // ความยากของคำ และคะแนนความสามารถของเด็ก
    const difficulty = wordDifficulty[attempt.wordId] ?? DEFAULT_RATING;
    const updated = updateRatings(
      elo,
      difficulty,
      attempt.correct,
      totalAttempts,
    );
    elo = updated.playerRating;
    wordDifficulty[attempt.wordId] = updated.itemDifficulty;
    totalAttempts += 1;
  }

  const totalCount = attempts.length;
  const correctCount = attempts.filter((attempt) => attempt.correct).length;
  const accuracy = totalCount === 0 ? 0 : correctCount / totalCount;
  const stars = starsFromAccuracy(accuracy);

  const previousResult = snapshot.results[lessonId];
  const isFirstClear = !previousResult;

  const xpEarned = lessonXp({ correctCount, totalCount, isFirstClear });
  const xp = snapshot.profile.xp + xpEarned;
  const leveledUp = levelFromXp(xp) > levelFromXp(snapshot.profile.xp);

  const streak = registerActivity(snapshot.profile, now);

  return {
    snapshot: {
      profile: {
        ...snapshot.profile,
        elo,
        xp,
        totalAttempts,
        streakDays: streak.streakDays,
        lastActiveDate: streak.lastActiveDate,
        streakFreezes: streak.streakFreezes,
      },
      cards,
      mastery,
      wordDifficulty,
      results: {
        ...snapshot.results,
        [lessonId]: {
          lessonId,
          // เล่นซ้ำแล้วได้แย่ลง ไม่ควรลบสถิติที่ดีที่สุดทิ้ง
          stars: Math.max(stars, previousResult?.stars ?? 0),
          bestAccuracy: Math.max(accuracy, previousResult?.bestAccuracy ?? 0),
          completedAt: now.toISOString(),
        },
      },
    },
    summary: {
      stars,
      xpEarned,
      accuracy,
      correctCount,
      totalCount,
      isFirstClear,
      leveledUp,
      streakDays: streak.streakDays,
      usedFreeze: streak.usedFreeze,
    },
  };
}
