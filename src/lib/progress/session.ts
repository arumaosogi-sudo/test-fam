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

/** สรุปผลที่เหมือนกันทุกแบบ ไม่ว่าจะเล่นด่านหรือทบทวน */
export type SessionSummary = {
  stars: number;
  xpEarned: number;
  accuracy: number;
  correctCount: number;
  totalCount: number;
  leveledUp: boolean;
  streakDays: number;
  usedFreeze: boolean;
};

export type LessonSummary = SessionSummary & {
  isFirstClear: boolean;
};

/** ด่านทบทวนไม่มี "ผ่านครั้งแรก" เพราะเล่นได้ทุกวันและไม่ได้ปลดล็อกอะไร */
export type ReviewSummary = SessionSummary & {
  /** กี่คำในชุดนี้ที่ถึงกำหนดทบทวนจริง ใช้บอกเด็กว่าเคลียร์คิวไปเท่าไร */
  dueCleared: number;
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

/**
 * ผลของการตอบชุดหนึ่งต่อความจำ ความชำนาญ และคะแนนความสามารถ
 *
 * ส่วนนี้เหมือนกันทั้งตอนเล่นด่านและตอนทบทวน ต่างกันแค่การบันทึกผลด่าน
 * จึงแยกออกมาเพื่อไม่ให้ตรรกะหัวใจของการให้คะแนนมีสองชุดที่ต้องแก้คู่กัน
 */
function applyAttempts(
  snapshot: ProgressSnapshot,
  attempts: Attempt[],
  now: Date,
) {
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

  return {
    cards,
    mastery,
    wordDifficulty,
    elo,
    totalAttempts,
    totalCount,
    correctCount,
    accuracy,
    stars: starsFromAccuracy(accuracy),
  };
}

/** รวม XP ไฟต่อเนื่อง และเลเวล ซึ่งคิดเหมือนกันทั้งด่านปกติและด่านทบทวน */
function applyReward(
  snapshot: ProgressSnapshot,
  earned: { correctCount: number; totalCount: number; isFirstClear: boolean },
  now: Date,
) {
  const xpEarned = lessonXp(earned);
  const xp = snapshot.profile.xp + xpEarned;

  return {
    xpEarned,
    xp,
    leveledUp: levelFromXp(xp) > levelFromXp(snapshot.profile.xp),
    streak: registerActivity(snapshot.profile, now),
  };
}

export function applyLessonResult(
  snapshot: ProgressSnapshot,
  lessonId: string,
  attempts: Attempt[],
  now: Date,
): { snapshot: ProgressSnapshot; summary: LessonSummary } {
  const applied = applyAttempts(snapshot, attempts, now);

  const previousResult = snapshot.results[lessonId];
  const isFirstClear = !previousResult;

  const { xpEarned, xp, leveledUp, streak } = applyReward(
    snapshot,
    {
      correctCount: applied.correctCount,
      totalCount: applied.totalCount,
      isFirstClear,
    },
    now,
  );

  return {
    snapshot: {
      profile: {
        ...snapshot.profile,
        elo: applied.elo,
        xp,
        totalAttempts: applied.totalAttempts,
        streakDays: streak.streakDays,
        lastActiveDate: streak.lastActiveDate,
        streakFreezes: streak.streakFreezes,
      },
      cards: applied.cards,
      mastery: applied.mastery,
      wordDifficulty: applied.wordDifficulty,
      results: {
        ...snapshot.results,
        [lessonId]: {
          lessonId,
          // เล่นซ้ำแล้วได้แย่ลง ไม่ควรลบสถิติที่ดีที่สุดทิ้ง
          stars: Math.max(applied.stars, previousResult?.stars ?? 0),
          bestAccuracy: Math.max(
            applied.accuracy,
            previousResult?.bestAccuracy ?? 0,
          ),
          completedAt: now.toISOString(),
        },
      },
    },
    summary: {
      stars: applied.stars,
      xpEarned,
      accuracy: applied.accuracy,
      correctCount: applied.correctCount,
      totalCount: applied.totalCount,
      isFirstClear,
      leveledUp,
      streakDays: streak.streakDays,
      usedFreeze: streak.usedFreeze,
    },
  };
}

/**
 * จบด่านทบทวน — อัปเดตความจำและรางวัลเหมือนด่านปกติ แต่ **ไม่เขียนลง results**
 *
 * เพราะ results คือบันทึกว่าเด็กผ่านด่านไหนของหลักสูตรแล้ว ซึ่งใช้ปลดล็อก
 * ด่านถัดไปและคำนวณดาวบนแผนที่ ด่านทบทวนไม่ได้อยู่ในหลักสูตรและเล่นได้ทุกวัน
 * ถ้าเขียนลงไปด้วยจะทำให้แผนที่ด่านเพี้ยนและปลดล็อกด่านที่เด็กยังไม่ได้เรียน
 *
 * @param dueCleared กี่คำในชุดนี้ที่ถึงกำหนดทบทวนจริง (นับก่อนเล่น)
 */
export function applyReviewResult(
  snapshot: ProgressSnapshot,
  attempts: Attempt[],
  dueCleared: number,
  now: Date,
): { snapshot: ProgressSnapshot; summary: ReviewSummary } {
  const applied = applyAttempts(snapshot, attempts, now);

  const { xpEarned, xp, leveledUp, streak } = applyReward(
    snapshot,
    {
      correctCount: applied.correctCount,
      totalCount: applied.totalCount,
      // ทบทวนไม่มีโบนัสผ่านครั้งแรก เพราะเล่นซ้ำได้ทุกวัน
      isFirstClear: false,
    },
    now,
  );

  return {
    snapshot: {
      ...snapshot,
      profile: {
        ...snapshot.profile,
        elo: applied.elo,
        xp,
        totalAttempts: applied.totalAttempts,
        streakDays: streak.streakDays,
        lastActiveDate: streak.lastActiveDate,
        streakFreezes: streak.streakFreezes,
      },
      cards: applied.cards,
      mastery: applied.mastery,
      wordDifficulty: applied.wordDifficulty,
    },
    summary: {
      stars: applied.stars,
      xpEarned,
      accuracy: applied.accuracy,
      correctCount: applied.correctCount,
      totalCount: applied.totalCount,
      leveledUp,
      streakDays: streak.streakDays,
      usedFreeze: streak.usedFreeze,
      dueCleared,
    },
  };
}
