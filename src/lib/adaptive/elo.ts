/**
 * ปรับความยากของข้อให้พอดีกับเด็กแต่ละคน ด้วยระบบคะแนนแบบ Elo
 *
 * ทั้งเด็กและข้อสอบมีคะแนนของตัวเอง เด็กตอบถูกข้อยาก = คะแนนขึ้นเยอะ
 * ตอบผิดข้อง่าย = คะแนนลงเยอะ ส่วนตัวข้อเองก็ถูกปรับตามว่าเด็กส่วนใหญ่ทำได้ไหม
 *
 * เป้าคือเลือกข้อที่เด็กมีโอกาสตอบถูกราว 75–80% ซึ่งเป็นช่วงที่เรียนรู้ได้ดีที่สุด
 * ง่ายกว่านี้เด็กเบื่อ ยากกว่านี้เด็กท้อ
 */

/** คะแนนเริ่มต้นของเด็กและของข้อที่ยังไม่มีสถิติ */
export const DEFAULT_RATING = 1000;

/** โอกาสตอบถูกที่เราอยากให้เป็น */
export const TARGET_SUCCESS_RATE = 0.78;

/** โอกาสที่เด็กคะแนน playerRating จะตอบข้อความยาก itemDifficulty ได้ถูก */
export function expectedScore(playerRating: number, itemDifficulty: number) {
  return 1 / (1 + Math.pow(10, (itemDifficulty - playerRating) / 400));
}

/**
 * ค่า K คือ "ขยับคะแนนแรงแค่ไหนต่อหนึ่งข้อ"
 *
 * ช่วงแรกเรายังไม่รู้ระดับเด็กเลย จึงให้ขยับแรงเพื่อหาระดับที่แท้จริงเร็ว ๆ
 * พอทำข้อไปเยอะแล้วค่อยลดลงเพื่อให้คะแนนนิ่ง ไม่แกว่งเพราะพลาดครั้งเดียว
 */
export function kFactor(totalAttempts: number) {
  if (totalAttempts < 20) return 40;
  if (totalAttempts < 60) return 24;
  return 16;
}

export type RatingUpdate = {
  playerRating: number;
  itemDifficulty: number;
};

export function updateRatings(
  playerRating: number,
  itemDifficulty: number,
  correct: boolean,
  totalAttempts: number,
): RatingUpdate {
  const expected = expectedScore(playerRating, itemDifficulty);
  const actual = correct ? 1 : 0;
  const k = kFactor(totalAttempts);
  const delta = k * (actual - expected);

  return {
    playerRating: playerRating + delta,
    // ข้อขยับสวนทางกับเด็ก และขยับช้ากว่า เพราะข้อหนึ่งถูกเล่นโดยเด็กหลายคน
    itemDifficulty: itemDifficulty - delta * 0.25,
  };
}

/** ข้อที่ยากแค่ไหน เด็กคนนี้จึงจะมีโอกาสตอบถูกเท่ากับ successRate */
export function difficultyForSuccessRate(
  playerRating: number,
  successRate = TARGET_SUCCESS_RATE,
) {
  const clamped = Math.min(0.999, Math.max(0.001, successRate));
  return playerRating + 400 * Math.log10(1 / clamped - 1);
}

export type Difficulty = { difficultyElo: number };

/**
 * เลือกข้อที่ความยากใกล้เป้าที่สุด
 *
 * เราไม่หยิบ "ใกล้ที่สุด n ข้อ" ตรง ๆ แต่คัดผู้เข้าชิงมาเป็น 2 เท่าก่อน
 * แล้วค่อยสุ่มเลือก เพื่อไม่ให้เด็กเจอข้อชุดเดิมซ้ำทุกครั้งที่เล่น
 */
export function selectByDifficulty<T extends Difficulty>(
  candidates: T[],
  playerRating: number,
  count: number,
  random: () => number = Math.random,
): T[] {
  if (count <= 0 || candidates.length === 0) return [];

  const target = difficultyForSuccessRate(playerRating);
  const ranked = [...candidates].sort(
    (a, b) =>
      Math.abs(a.difficultyElo - target) - Math.abs(b.difficultyElo - target),
  );

  const poolSize = Math.min(ranked.length, Math.max(count, count * 2));
  const pool = ranked.slice(0, poolSize);

  // สุ่มสลับแบบ Fisher–Yates แล้วตัดเอาเท่าที่ต้องการ
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(count, pool.length));
}
