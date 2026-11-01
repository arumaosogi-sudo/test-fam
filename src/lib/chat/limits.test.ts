import { describe, expect, it } from "vitest";

import {
  DAILY_TURN_LIMIT,
  EMPTY_BUDGET,
  canChat,
  spendTurn,
  turnsLeft,
} from "./limits";

const today = new Date("2026-11-01T10:00:00");
const tomorrow = new Date("2026-11-02T08:00:00");

describe("โควตาแชทรายวัน", () => {
  it("ตัวนับเริ่มต้นยังไม่ผูกกับวันไหน จึงได้โควตาเต็มเสมอ", () => {
    expect(turnsLeft(EMPTY_BUDGET, today)).toBe(DAILY_TURN_LIMIT);
    expect(canChat(EMPTY_BUDGET, today)).toBe(true);
  });

  it("ใช้ไปหนึ่งเทิร์นแล้วเหลือน้อยลงหนึ่ง", () => {
    const budget = spendTurn(EMPTY_BUDGET, today);

    expect(budget.used).toBe(1);
    expect(turnsLeft(budget, today)).toBe(DAILY_TURN_LIMIT - 1);
  });

  it("ใช้ครบแล้วคุยต่อไม่ได้", () => {
    let budget = EMPTY_BUDGET;
    for (let i = 0; i < DAILY_TURN_LIMIT; i += 1) {
      budget = spendTurn(budget, today);
    }

    expect(turnsLeft(budget, today)).toBe(0);
    expect(canChat(budget, today)).toBe(false);
  });

  it("ข้ามวันแล้วรีเซ็ตเอง ไม่ต้องมีใครมาล้างให้", () => {
    let budget = EMPTY_BUDGET;
    for (let i = 0; i < DAILY_TURN_LIMIT; i += 1) {
      budget = spendTurn(budget, today);
    }

    expect(canChat(budget, tomorrow)).toBe(true);
    expect(turnsLeft(budget, tomorrow)).toBe(DAILY_TURN_LIMIT);

    const afterMidnight = spendTurn(budget, tomorrow);
    expect(afterMidnight.used).toBe(1);
  });

  it("ไม่แก้ไขตัวนับเดิม คืนตัวใหม่เสมอ", () => {
    const before = { ...EMPTY_BUDGET };
    spendTurn(EMPTY_BUDGET, today);

    expect(EMPTY_BUDGET).toEqual(before);
  });

  it("จำนวนที่เหลือไม่ติดลบ ถึงตัวนับจะเกินเพดานไปแล้ว", () => {
    const over = { dateKey: "2026-11-01", used: DAILY_TURN_LIMIT + 10 };

    expect(turnsLeft(over, today)).toBe(0);
  });
});
