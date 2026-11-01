import { describe, expect, it } from "vitest";

import {
  DEFAULT_RATING,
  difficultyForSuccessRate,
  expectedScore,
  kFactor,
  selectByDifficulty,
  TARGET_SUCCESS_RATE,
  updateRatings,
} from "./elo";

describe("expectedScore", () => {
  it("เสมอกันเมื่อคะแนนเท่ากัน", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 10);
  });

  it("เด็กเก่งกว่าข้อ โอกาสถูกมากกว่าครึ่ง", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(800, 1000)).toBeLessThan(0.5);
  });

  it("ห่างกัน 400 แต้ม คือโอกาสราว 10 ต่อ 1", () => {
    expect(expectedScore(1400, 1000)).toBeCloseTo(10 / 11, 3);
  });
});

describe("difficultyForSuccessRate", () => {
  it("เป็นฟังก์ชันผกผันของ expectedScore", () => {
    for (const rate of [0.6, 0.7, TARGET_SUCCESS_RATE, 0.9]) {
      const difficulty = difficultyForSuccessRate(1000, rate);
      expect(expectedScore(1000, difficulty)).toBeCloseTo(rate, 6);
    }
  });

  it("ข้อเป้าหมายต้องง่ายกว่าตัวเด็ก เพราะเราอยากให้ตอบถูกเกินครึ่ง", () => {
    expect(difficultyForSuccessRate(1000)).toBeLessThan(1000);
  });

  it("เด็กเก่งขึ้น ข้อเป้าหมายก็ยากขึ้นตาม", () => {
    expect(difficultyForSuccessRate(1400)).toBeGreaterThan(
      difficultyForSuccessRate(1000),
    );
  });
});

describe("kFactor", () => {
  it("ขยับแรงตอนเริ่ม แล้วค่อย ๆ นิ่งลง", () => {
    expect(kFactor(0)).toBeGreaterThan(kFactor(30));
    expect(kFactor(30)).toBeGreaterThan(kFactor(200));
  });
});

describe("updateRatings", () => {
  it("ตอบถูกแล้วคะแนนเด็กขึ้น ความยากของข้อลด", () => {
    const result = updateRatings(1000, 1000, true, 0);

    expect(result.playerRating).toBeGreaterThan(1000);
    expect(result.itemDifficulty).toBeLessThan(1000);
  });

  it("ตอบผิดแล้วคะแนนเด็กลง ความยากของข้อเพิ่ม", () => {
    const result = updateRatings(1000, 1000, false, 0);

    expect(result.playerRating).toBeLessThan(1000);
    expect(result.itemDifficulty).toBeGreaterThan(1000);
  });

  it("ตอบถูกข้อยากได้คะแนนมากกว่าตอบถูกข้อง่าย", () => {
    const hard = updateRatings(1000, 1400, true, 0).playerRating - 1000;
    const easy = updateRatings(1000, 600, true, 0).playerRating - 1000;

    expect(hard).toBeGreaterThan(easy);
  });

  it("ตอบผิดข้อง่ายเสียคะแนนมากกว่าตอบผิดข้อยาก", () => {
    const easy = 1000 - updateRatings(1000, 600, false, 0).playerRating;
    const hard = 1000 - updateRatings(1000, 1400, false, 0).playerRating;

    expect(easy).toBeGreaterThan(hard);
  });

  it("เด็กที่ทำข้อมาเยอะแล้ว คะแนนขยับน้อยลง", () => {
    const rookie = updateRatings(1000, 1000, true, 0).playerRating - 1000;
    const veteran = updateRatings(1000, 1000, true, 500).playerRating - 1000;

    expect(veteran).toBeLessThan(rookie);
  });

  it("ตอบถูกรัว ๆ คะแนนไต่ขึ้นเรื่อย ๆ จนเข้าใกล้ความยากของข้อ", () => {
    let rating = DEFAULT_RATING;
    for (let i = 0; i < 60; i += 1) {
      rating = updateRatings(rating, 1400, true, i).playerRating;
    }

    expect(rating).toBeGreaterThan(DEFAULT_RATING);
    expect(expectedScore(rating, 1400)).toBeGreaterThan(0.5);
  });
});

describe("selectByDifficulty", () => {
  const pool = Array.from({ length: 20 }, (_, index) => ({
    id: `item-${index}`,
    difficultyElo: 600 + index * 50,
  }));

  it("คืนจำนวนตามที่ขอ", () => {
    expect(selectByDifficulty(pool, 1000, 5, () => 0).length).toBe(5);
  });

  it("ไม่คืนเกินจำนวนที่มี", () => {
    expect(selectByDifficulty(pool.slice(0, 3), 1000, 10, () => 0).length).toBe(
      3,
    );
  });

  it("คืนลิสต์ว่างเมื่อไม่มีตัวเลือกหรือขอ 0 ข้อ", () => {
    expect(selectByDifficulty([], 1000, 5)).toEqual([]);
    expect(selectByDifficulty(pool, 1000, 0)).toEqual([]);
  });

  it("ข้อที่เลือกมามีโอกาสตอบถูกอยู่ในโซนที่เรียนรู้ได้ดี", () => {
    const picked = selectByDifficulty(pool, 1000, 4, () => 0.5);

    for (const item of picked) {
      const chance = expectedScore(1000, item.difficultyElo);
      expect(chance).toBeGreaterThan(0.6);
      expect(chance).toBeLessThan(0.95);
    }
  });

  it("เด็กเก่งกว่าได้ข้อที่ยากกว่า", () => {
    const beginner = selectByDifficulty(pool, 700, 3, () => 0);
    const advanced = selectByDifficulty(pool, 1500, 3, () => 0);

    const average = (items: { difficultyElo: number }[]) =>
      items.reduce((sum, item) => sum + item.difficultyElo, 0) / items.length;

    expect(average(advanced)).toBeGreaterThan(average(beginner));
  });

  it("ไม่แก้ไขอาร์เรย์ต้นฉบับ", () => {
    const original = pool.map((item) => item.id);
    selectByDifficulty(pool, 1000, 5);

    expect(pool.map((item) => item.id)).toEqual(original);
  });
});
