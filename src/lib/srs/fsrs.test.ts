import { describe, expect, it } from "vitest";

import {
  createCard,
  DESIRED_RETENTION,
  dueCards,
  intervalForStability,
  ratingFromAttempt,
  retrievabilityAt,
  review,
  type Rating,
} from "./fsrs";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date("2026-01-01T09:00:00.000Z");

function days(card: { dueAt: string }, from: Date) {
  return (new Date(card.dueAt).getTime() - from.getTime()) / DAY_MS;
}

/** ทบทวนซ้ำ ๆ โดยกดเล่นตรงวันนัดพอดีทุกครั้ง */
function reviewOnSchedule(wordId: string, ratings: Rating[]) {
  let card = createCard(wordId, START);
  let now = START;
  const intervals: number[] = [];

  for (const rating of ratings) {
    card = review(card, rating, now);
    intervals.push(days(card, now));
    now = new Date(card.dueAt);
  }

  return { card, intervals };
}

describe("retrievability", () => {
  it("เริ่มที่ 1 แล้วลดลงเรื่อย ๆ ตามเวลา", () => {
    expect(retrievabilityAt(0, 10)).toBeCloseTo(1, 10);

    const after1 = retrievabilityAt(1, 10);
    const after5 = retrievabilityAt(5, 10);
    const after30 = retrievabilityAt(30, 10);

    expect(after1).toBeLessThan(1);
    expect(after5).toBeLessThan(after1);
    expect(after30).toBeLessThan(after5);
    expect(after30).toBeGreaterThan(0);
  });

  it("ความจำที่คงทนกว่า ลืมช้ากว่า เมื่อผ่านเวลาเท่ากัน", () => {
    expect(retrievabilityAt(10, 50)).toBeGreaterThan(retrievabilityAt(10, 5));
  });
});

describe("intervalForStability", () => {
  it("นัดทบทวนตรงจุดที่ความจำเหลือพอดีกับ retention ที่ตั้งไว้", () => {
    // นี่คือคุณสมบัติที่ผูกสูตรช่วงห่างกับสูตรความจำเข้าด้วยกัน
    for (const stability of [1, 7, 30, 180]) {
      const interval = intervalForStability(stability);
      const actual = retrievabilityAt(interval, stability);
      expect(actual).toBeCloseTo(DESIRED_RETENTION, 1);
    }
  });

  it("ยิ่งจำได้คงทน ยิ่งทิ้งช่วงได้นาน", () => {
    expect(intervalForStability(30)).toBeGreaterThan(intervalForStability(3));
  });

  it("ไม่นัดถี่กว่า 1 วัน และไม่เกิน 1 ปี", () => {
    expect(intervalForStability(0.01)).toBe(1);
    expect(intervalForStability(100000)).toBe(365);
  });
});

describe("review", () => {
  it("การ์ดใหม่ที่ตอบถูกจะถูกเลื่อนไปอนาคตและเข้าสถานะ review", () => {
    const card = review(createCard("w1", START), 3, START);

    expect(card.state).toBe("review");
    expect(card.reps).toBe(1);
    expect(card.lapses).toBe(0);
    expect(days(card, START)).toBeGreaterThanOrEqual(1);
  });

  it("ตอบถูกติดกันหลายครั้ง ช่วงห่างต้องยาวขึ้นเรื่อย ๆ", () => {
    const { intervals } = reviewOnSchedule("w1", [3, 3, 3, 3, 3]);

    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it("ตอบว่า easy ได้ช่วงห่างยาวกว่า good และ good ยาวกว่า hard", () => {
    const base = review(createCard("w1", START), 3, START);
    const next = new Date(base.dueAt);

    const hard = days(review(base, 2, next), next);
    const good = days(review(base, 3, next), next);
    const easy = days(review(base, 4, next), next);

    expect(good).toBeGreaterThan(hard);
    expect(easy).toBeGreaterThan(good);
  });

  it("ลืมแล้วต้องกลับมาเจอใน 1 วัน ความจำลดลง และนับ lapse เพิ่ม", () => {
    const { card: learned } = reviewOnSchedule("w1", [3, 3, 3]);
    const forgetAt = new Date(learned.dueAt);
    const lapsed = review(learned, 1, forgetAt);

    expect(days(lapsed, forgetAt)).toBe(1);
    expect(lapsed.state).toBe("relearning");
    expect(lapsed.lapses).toBe(learned.lapses + 1);
    expect(lapsed.stability).toBeLessThanOrEqual(learned.stability);
  });

  it("ความยากขยับตามการตอบ และอยู่ในช่วง 1–10 เสมอ", () => {
    const base = review(createCard("w1", START), 3, START);
    const next = new Date(base.dueAt);

    expect(review(base, 1, next).difficulty).toBeGreaterThan(base.difficulty);
    expect(review(base, 4, next).difficulty).toBeLessThan(base.difficulty);

    // ตอบผิดรัว ๆ ความยากต้องไม่ทะลุ 10
    let card = createCard("w2", START);
    let now = START;
    for (let i = 0; i < 30; i += 1) {
      card = review(card, 1, now);
      now = new Date(card.dueAt);
      expect(card.difficulty).toBeLessThanOrEqual(10);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
    }
  });

  it("คำที่ยากกว่าได้ช่วงห่างสั้นกว่าคำที่ง่ายกว่า เมื่อความคงทนเท่ากัน", () => {
    const easyWord = { ...createCard("easy", START), stability: 10, difficulty: 2, lastReviewedAt: START.toISOString(), state: "review" as const, reps: 1 };
    const hardWord = { ...easyWord, wordId: "hard", difficulty: 9 };
    const at = new Date(START.getTime() + 10 * DAY_MS);

    expect(days(review(easyWord, 3, at), at)).toBeGreaterThan(
      days(review(hardWord, 3, at), at),
    );
  });
});

describe("ratingFromAttempt", () => {
  it("ตอบผิดคือลืม", () => {
    expect(ratingFromAttempt(false, 1000)).toBe(1);
    expect(ratingFromAttempt(false, 20000)).toBe(1);
  });

  it("ตอบถูกเร็วคือ easy ปกติคือ good ช้าคือ hard", () => {
    expect(ratingFromAttempt(true, 1500)).toBe(4);
    expect(ratingFromAttempt(true, 5000)).toBe(3);
    expect(ratingFromAttempt(true, 12000)).toBe(2);
  });
});

describe("dueCards", () => {
  it("คืนเฉพาะใบที่ถึงกำหนด เรียงใบที่ค้างนานสุดก่อน", () => {
    const overdue = {
      ...createCard("overdue", START),
      dueAt: new Date(START.getTime() - 5 * DAY_MS).toISOString(),
    };
    const justDue = { ...createCard("just", START), dueAt: START.toISOString() };
    const future = {
      ...createCard("future", START),
      dueAt: new Date(START.getTime() + 3 * DAY_MS).toISOString(),
    };

    const result = dueCards([future, justDue, overdue], START);

    expect(result.map((card) => card.wordId)).toEqual(["overdue", "just"]);
  });
});
