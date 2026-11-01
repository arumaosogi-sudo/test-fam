import type { SrsCard } from "@/lib/types";

/**
 * ตัวจัดตารางทบทวนแบบ FSRS
 *
 * แนวคิด: ความจำของคำหนึ่งอธิบายด้วยตัวเลข 2 ตัว
 *   stability  — ความจำอยู่ได้นานแค่ไหน (หน่วยเป็นวัน)
 *   difficulty — คำนี้ยากแค่ไหนสำหรับเด็กคนนี้ (1–10)
 * แล้วคำนวณว่า "ควรเจอคำนี้อีกครั้งเมื่อไร" ให้ตรงจังหวะที่กำลังจะลืมพอดี
 * ซึ่งเป็นจุดที่ทบทวนแล้วได้ผลที่สุด
 *
 * ⚠️ ค่าถ่วงน้ำหนัก DEFAULT_WEIGHTS ด้านล่างอ้างอิงค่าเริ่มต้นที่เผยแพร่ของ FSRS-5
 * แต่ **ยังไม่ได้ตรวจทานกับ reference implementation และยังไม่ได้ปรับจูนกับ
 * ข้อมูลผู้เรียนจริงของเรา** ก่อนขึ้นใช้งานจริงควรทำทั้งสองอย่าง
 * เทสในไฟล์คู่กันจึงตรวจ "คุณสมบัติเชิงพฤติกรรม" (ตอบถูกแล้วช่วงห่างต้องยาวขึ้น ฯลฯ)
 * ไม่ได้ตรวจว่าตัวเลขตรงกับ reference เป๊ะ ๆ
 */

const DEFAULT_WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
] as const;

const DECAY = -0.5;
const FACTOR = 19 / 81;

/** ความน่าจะเป็นที่เด็กจะยังจำได้ ณ วันที่นัดทบทวน */
export const DESIRED_RETENTION = 0.9;

const MIN_STABILITY = 0.01;
const MAX_STABILITY = 36500;
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 365;

/**
 * 1 = ลืมสนิท · 2 = ตอบถูกแบบฝืน ๆ · 3 = ตอบถูกตามปกติ · 4 = ตอบถูกฉับพลัน
 * (ชื่อเดียวกับ again / hard / good / easy ของ FSRS)
 */
export type Rating = 1 | 2 | 3 | 4;

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * DAY_MS);
}

function daysBetween(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / DAY_MS;
}

/** ความน่าจะเป็นที่ยังจำได้ หลังผ่านไป t วัน ด้วยความคงทน s */
export function retrievabilityAt(elapsedDays: number, stability: number) {
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (FACTOR * t) / stability, DECAY);
}

/** ความน่าจะเป็นที่ยังจำได้ ณ ตอนนี้ */
export function retrievability(card: SrsCard, now: Date) {
  if (!card.lastReviewedAt) return 0;
  const elapsed = daysBetween(new Date(card.lastReviewedAt), now);
  return retrievabilityAt(elapsed, card.stability);
}

/** ต้องรอกี่วันความจำจึงจะเหลือเท่า retention ที่ต้องการ */
export function intervalForStability(
  stability: number,
  retention = DESIRED_RETENTION,
) {
  const raw = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return clamp(Math.round(raw), MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);
}

function initialStability(rating: Rating) {
  return clamp(DEFAULT_WEIGHTS[rating - 1], MIN_STABILITY, MAX_STABILITY);
}

function initialDifficulty(rating: Rating) {
  const raw =
    DEFAULT_WEIGHTS[4] - Math.exp(DEFAULT_WEIGHTS[5] * (rating - 1)) + 1;
  return clamp(raw, 1, 10);
}

function nextDifficulty(current: number, rating: Rating) {
  // ตอบยากดันความยากขึ้น ตอบง่ายดันลง แล้วค่อย ๆ ถูกดึงกลับเข้าหาค่ากลาง
  const delta = -DEFAULT_WEIGHTS[6] * (rating - 3);
  const damped = current + (delta * (10 - current)) / 9;
  const reverted =
    DEFAULT_WEIGHTS[7] * initialDifficulty(4) +
    (1 - DEFAULT_WEIGHTS[7]) * damped;
  return clamp(reverted, 1, 10);
}

function stabilityAfterSuccess(
  stability: number,
  difficulty: number,
  retrieval: number,
  rating: Rating,
) {
  const hardPenalty = rating === 2 ? DEFAULT_WEIGHTS[15] : 1;
  const easyBonus = rating === 4 ? DEFAULT_WEIGHTS[16] : 1;
  const growth =
    Math.exp(DEFAULT_WEIGHTS[8]) *
    (11 - difficulty) *
    Math.pow(stability, -DEFAULT_WEIGHTS[9]) *
    (Math.exp(DEFAULT_WEIGHTS[10] * (1 - retrieval)) - 1) *
    hardPenalty *
    easyBonus;
  return clamp(stability * (1 + growth), MIN_STABILITY, MAX_STABILITY);
}

function stabilityAfterLapse(
  stability: number,
  difficulty: number,
  retrieval: number,
) {
  const raw =
    DEFAULT_WEIGHTS[11] *
    Math.pow(difficulty, -DEFAULT_WEIGHTS[12]) *
    (Math.pow(stability + 1, DEFAULT_WEIGHTS[13]) - 1) *
    Math.exp(DEFAULT_WEIGHTS[14] * (1 - retrieval));
  // ลืมแล้วความจำต้องไม่คงทนกว่าเดิม
  return clamp(Math.min(raw, stability), MIN_STABILITY, MAX_STABILITY);
}

/** การ์ดใหม่ที่ยังไม่เคยเรียน — ถึงกำหนดทันที */
export function createCard(wordId: string, now: Date): SrsCard {
  return {
    wordId,
    stability: MIN_STABILITY,
    difficulty: 5,
    dueAt: now.toISOString(),
    lastReviewedAt: null,
    reps: 0,
    lapses: 0,
    state: "new",
  };
}

/**
 * แปลงผลการตอบของเด็กเป็นเรตติ้ง
 *
 * ใช้เวลาที่ใช้ตอบเป็นตัวแยกระหว่าง "จำได้แม่น" กับ "นึกออกแบบฝืน ๆ"
 * เกณฑ์เวลาตั้งไว้ใจกว้างกว่าแอปผู้ใหญ่ เพราะเด็กอ่านโจทย์ช้ากว่า
 */
export function ratingFromAttempt(correct: boolean, latencyMs: number): Rating {
  if (!correct) return 1;
  if (latencyMs > 8000) return 2;
  if (latencyMs < 3000) return 4;
  return 3;
}

/** บันทึกผลการทบทวนหนึ่งครั้ง แล้วคืนการ์ดใบใหม่ */
export function review(card: SrsCard, rating: Rating, now: Date): SrsCard {
  const isNew = card.state === "new" || card.lastReviewedAt === null;

  if (isNew) {
    const stability = initialStability(rating);
    const difficulty = initialDifficulty(rating);
    const interval =
      rating === 1 ? MIN_INTERVAL_DAYS : intervalForStability(stability);

    return {
      ...card,
      stability,
      difficulty,
      dueAt: addDays(now, interval).toISOString(),
      lastReviewedAt: now.toISOString(),
      reps: card.reps + 1,
      lapses: card.lapses + (rating === 1 ? 1 : 0),
      state: rating === 1 ? "learning" : "review",
    };
  }

  const elapsed = daysBetween(new Date(card.lastReviewedAt!), now);
  const retrieval = retrievabilityAt(elapsed, card.stability);
  const difficulty = nextDifficulty(card.difficulty, rating);

  if (rating === 1) {
    const stability = stabilityAfterLapse(
      card.stability,
      card.difficulty,
      retrieval,
    );
    return {
      ...card,
      stability,
      difficulty,
      // ลืมแล้วต้องได้เจอใหม่เร็ว ๆ ไม่ใช่รอตามสูตร
      dueAt: addDays(now, MIN_INTERVAL_DAYS).toISOString(),
      lastReviewedAt: now.toISOString(),
      reps: card.reps + 1,
      lapses: card.lapses + 1,
      state: "relearning",
    };
  }

  const stability = stabilityAfterSuccess(
    card.stability,
    card.difficulty,
    retrieval,
    rating,
  );

  return {
    ...card,
    stability,
    difficulty,
    dueAt: addDays(now, intervalForStability(stability)).toISOString(),
    lastReviewedAt: now.toISOString(),
    reps: card.reps + 1,
    lapses: card.lapses,
    state: "review",
  };
}

/** การ์ดที่ถึงกำหนดทบทวนแล้ว เรียงจากค้างนานสุดก่อน */
export function dueCards(cards: SrsCard[], now: Date): SrsCard[] {
  return cards
    .filter((card) => new Date(card.dueAt).getTime() <= now.getTime())
    .sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    );
}
