import { DEFAULT_RATING, selectByDifficulty } from "@/lib/adaptive/elo";
import type { SrsCard } from "@/lib/types";

import { dueCards, retrievability } from "./fsrs";

/**
 * สร้างชุดคำสำหรับด่านทบทวนรายวันจากคิวของ FSRS
 *
 * นี่คือจุดที่ตารางทบทวนซึ่งบันทึกไว้ทุกครั้งที่เด็กตอบ กลายเป็นของที่เด็กเห็นจริง
 * ก่อนหน้านี้ระบบคำนวณวันนัดไว้ถูกต้องแต่ไม่มีหน้าไหนหยิบมาใช้เลย
 */

/** คำต่อหนึ่งด่านทบทวน — ข้อละหนึ่งคำ ประมาณ 3 นาที ตรงกับเป้าเซสชันสั้น */
export const REVIEW_DECK_SIZE = 8;

export type ReviewDeck = {
  /** เรียงจากคำที่ใกล้ลืมที่สุดไปหาน้อยที่สุด */
  wordIds: string[];
  /** กี่คำในชุดนี้ที่ถึงกำหนดทบทวนจริง ที่เหลือคือคำฝึกเพิ่ม */
  dueCount: number;
};

/** จำนวนคำที่ถึงกำหนดทบทวนวันนี้ ใช้ขึ้นป้ายบนแผนที่ด่าน */
export function countDue(cards: Record<string, SrsCard>, now: Date): number {
  return dueCards(Object.values(cards), now).length;
}

/**
 * เลือกคำที่จะทบทวน
 *
 * **ลำดับหลักคือ "ใกล้ลืมที่สุดก่อน"** ไม่ใช่ความยาก — วัดจาก retrievability
 * ซึ่งแม่นกว่าการเรียงตามวันนัด เพราะคำที่เลยกำหนดมานานแต่ความจำแน่น
 * ยังจำได้ดีกว่าคำที่เพิ่งถึงกำหนดแต่ความจำเปราะ
 *
 * **ความยากใช้ตอนเติมเท่านั้น** ถ้าคำที่ถึงกำหนดมีไม่พอเต็มชุด เราเติมด้วยคำที่
 * เคยเรียนแล้วโดยเลือกจากคะแนนความยากให้เด็กมีโอกาสตอบถูกราว 78%
 * (`selectByDifficulty`) ซึ่งเป็นโจทย์ "เลือกข้อให้พอดีกับคนเรียน" จริง ๆ
 * ต่างจากการจัดคิวทบทวนที่ต้องยึดความจำเป็นหลัก การเอา Elo มาจัดคิวทบทวน
 * จะทำให้คำที่กำลังจะลืมแต่ง่ายเกินไปถูกเลื่อนออกไปจนลืมจริง
 */
export function buildReviewDeck({
  cards,
  wordDifficulty,
  playerRating = DEFAULT_RATING,
  now,
  size = REVIEW_DECK_SIZE,
  random = Math.random,
}: {
  cards: Record<string, SrsCard>;
  wordDifficulty: Record<string, number>;
  playerRating?: number;
  now: Date;
  size?: number;
  random?: () => number;
}): ReviewDeck {
  const all = Object.values(cards);

  const due = dueCards(all, now).sort(
    (a, b) => retrievability(a, now) - retrievability(b, now),
  );

  const chosen = due.slice(0, size);
  const dueCount = chosen.length;

  if (chosen.length < size) {
    // เติมจากคำที่เคยเรียนแล้วแต่ยังไม่ถึงกำหนด
    const takenIds = new Set(chosen.map((card) => card.wordId));
    const spare = all
      .filter((card) => !takenIds.has(card.wordId))
      .map((card) => ({
        wordId: card.wordId,
        difficultyElo: wordDifficulty[card.wordId] ?? DEFAULT_RATING,
      }));

    const filler = selectByDifficulty(
      spare,
      playerRating,
      size - chosen.length,
      random,
    );

    return {
      wordIds: [...chosen.map((card) => card.wordId), ...filler.map((item) => item.wordId)],
      dueCount,
    };
  }

  return { wordIds: chosen.map((card) => card.wordId), dueCount };
}
