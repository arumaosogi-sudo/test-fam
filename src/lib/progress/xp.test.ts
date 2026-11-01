import { describe, expect, it } from "vitest";

import {
  daysBetweenKeys,
  lessonXp,
  levelFromXp,
  levelProgress,
  localDateKey,
  registerActivity,
  starsFromAccuracy,
  XP_FIRST_CLEAR_BONUS,
  XP_PERFECT_BONUS,
  XP_PER_CORRECT,
  xpForLevel,
} from "./xp";

describe("ระดับและ XP", () => {
  it("เริ่มที่เลเวล 1 เมื่อยังไม่มี XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("เลเวลไม่ลดลงเมื่อ XP เพิ่มขึ้น", () => {
    let previous = levelFromXp(0);
    for (let xp = 0; xp <= 5000; xp += 25) {
      const level = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("xpForLevel กับ levelFromXp สอดคล้องกัน", () => {
    for (let level = 1; level <= 12; level += 1) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      // ขาดอีกแต้มเดียวต้องยังไม่ขึ้นเลเวล
      expect(levelFromXp(xpForLevel(level + 1) - 1)).toBe(level);
    }
  });

  it("levelProgress อยู่ในช่วงของเลเวลนั้นเสมอ", () => {
    for (const xp of [0, 49, 50, 199, 200, 1234]) {
      const { current, needed } = levelProgress(xp);
      expect(current).toBeGreaterThanOrEqual(0);
      expect(current).toBeLessThan(needed);
      expect(needed).toBeGreaterThan(0);
    }
  });

  it("จัดการค่า XP ติดลบอย่างปลอดภัย", () => {
    expect(levelFromXp(-100)).toBe(1);
  });
});

describe("lessonXp", () => {
  it("ให้ XP ตามจำนวนข้อที่ตอบถูก", () => {
    expect(lessonXp({ correctCount: 3, totalCount: 5, isFirstClear: false })).toBe(
      3 * XP_PER_CORRECT,
    );
  });

  it("ตอบถูกหมดได้โบนัส", () => {
    expect(lessonXp({ correctCount: 5, totalCount: 5, isFirstClear: false })).toBe(
      5 * XP_PER_CORRECT + XP_PERFECT_BONUS,
    );
  });

  it("ผ่านด่านครั้งแรกได้โบนัสเพิ่ม", () => {
    expect(lessonXp({ correctCount: 5, totalCount: 5, isFirstClear: true })).toBe(
      5 * XP_PER_CORRECT + XP_PERFECT_BONUS + XP_FIRST_CLEAR_BONUS,
    );
  });

  it("ไม่ให้โบนัสเต็มเมื่อด่านไม่มีข้อเลย", () => {
    expect(lessonXp({ correctCount: 0, totalCount: 0, isFirstClear: false })).toBe(
      0,
    );
  });
});

describe("starsFromAccuracy", () => {
  it("เล่นจบได้อย่างน้อย 1 ดาวเสมอ", () => {
    expect(starsFromAccuracy(0)).toBe(1);
    expect(starsFromAccuracy(0.3)).toBe(1);
  });

  it("แม่นขึ้นได้ดาวมากขึ้น", () => {
    expect(starsFromAccuracy(0.7)).toBe(2);
    expect(starsFromAccuracy(0.89)).toBe(2);
    expect(starsFromAccuracy(0.9)).toBe(3);
    expect(starsFromAccuracy(1)).toBe(3);
  });
});

describe("วันที่", () => {
  it("localDateKey ใช้เวลาท้องถิ่น", () => {
    const date = new Date(2026, 0, 5, 23, 30);
    expect(localDateKey(date)).toBe("2026-01-05");
  });

  it("daysBetweenKeys ข้ามเดือนและข้ามปีได้", () => {
    expect(daysBetweenKeys("2026-01-01", "2026-01-02")).toBe(1);
    expect(daysBetweenKeys("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetweenKeys("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetweenKeys("2026-02-28", "2026-03-01")).toBe(1);
    expect(daysBetweenKeys("2026-01-10", "2026-01-01")).toBe(-9);
  });
});

describe("registerActivity", () => {
  const base = { streakDays: 5, lastActiveDate: "2026-01-10", streakFreezes: 2 };

  it("เล่นครั้งแรกเริ่มไฟที่ 1 วัน", () => {
    const result = registerActivity(
      { streakDays: 0, lastActiveDate: null, streakFreezes: 2 },
      new Date(2026, 0, 10, 10),
    );

    expect(result.streakDays).toBe(1);
    expect(result.lastActiveDate).toBe("2026-01-10");
  });

  it("เล่นซ้ำในวันเดียวกันไฟไม่เพิ่ม", () => {
    const result = registerActivity(base, new Date(2026, 0, 10, 20));

    expect(result.streakDays).toBe(5);
    expect(result.streakFreezes).toBe(2);
  });

  it("เล่นต่อวันถัดไปไฟเพิ่ม 1", () => {
    const result = registerActivity(base, new Date(2026, 0, 11, 8));

    expect(result.streakDays).toBe(6);
    expect(result.usedFreeze).toBe(false);
  });

  it("ขาดไป 1 วันแล้วมีตั๋ว ใช้ตั๋วต่อไฟให้", () => {
    const result = registerActivity(base, new Date(2026, 0, 12, 8));

    expect(result.streakDays).toBe(6);
    expect(result.streakFreezes).toBe(1);
    expect(result.usedFreeze).toBe(true);
  });

  it("ขาดไป 1 วันแต่ตั๋วหมด ไฟเริ่มใหม่", () => {
    const result = registerActivity(
      { ...base, streakFreezes: 0 },
      new Date(2026, 0, 12, 8),
    );

    expect(result.streakDays).toBe(1);
    expect(result.usedFreeze).toBe(false);
  });

  it("หายไปหลายวัน ตั๋วช่วยไม่ได้ ไฟเริ่มใหม่", () => {
    const result = registerActivity(base, new Date(2026, 0, 20, 8));

    expect(result.streakDays).toBe(1);
    expect(result.streakFreezes).toBe(2);
  });

  it("นาฬิกาเครื่องย้อนหลังไม่ทำให้ไฟเสียหาย", () => {
    const result = registerActivity(base, new Date(2026, 0, 8, 8));

    expect(result.streakDays).toBe(5);
    expect(result.lastActiveDate).toBe("2026-01-10");
  });
});
