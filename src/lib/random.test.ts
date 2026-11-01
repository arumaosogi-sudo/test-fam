import { describe, expect, it } from "vitest";

import { seededRandom, shuffleDistinct, shuffleWithSeed } from "./random";

describe("seededRandom", () => {
  it("seed เดียวกันให้ลำดับเดิมเสมอ", () => {
    const a = seededRandom("item-1");
    const b = seededRandom("item-1");

    for (let i = 0; i < 20; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it("seed ต่างกันให้ลำดับต่างกัน", () => {
    const a = seededRandom("item-1");
    const b = seededRandom("item-2");

    expect(a()).not.toBe(b());
  });

  it("ค่าที่ได้อยู่ในช่วง 0 ถึง 1", () => {
    const random = seededRandom("seed");

    for (let i = 0; i < 500; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("shuffleWithSeed", () => {
  const items = ["a", "b", "c", "d", "e"];

  it("ได้ของครบเท่าเดิม ไม่หายไม่เกิน", () => {
    const result = shuffleWithSeed(items, "x");

    expect([...result].sort()).toEqual([...items].sort());
  });

  it("seed เดียวกันได้ลำดับเดิม", () => {
    expect(shuffleWithSeed(items, "x")).toEqual(shuffleWithSeed(items, "x"));
  });

  it("ไม่แก้ไขอาร์เรย์ต้นฉบับ", () => {
    const original = [...items];
    shuffleWithSeed(items, "x");

    expect(items).toEqual(original);
  });

  it("สลับจริง ไม่ได้คืนลำดับเดิมทุก seed", () => {
    const seeds = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const anyShuffled = seeds.some(
      (seed) => shuffleWithSeed(items, seed).join() !== items.join(),
    );

    expect(anyShuffled).toBe(true);
  });
});

describe("shuffleDistinct", () => {
  it("ไม่เคยคืนลำดับเดิม ไม่ว่าจะใช้ seed ไหน", () => {
    const items = ["a", "b", "c", "d"];

    // ไล่ seed จำนวนมากเพื่อให้เจอกรณีที่สลับแล้วบังเอิญได้ลำดับเดิม
    for (let i = 0; i < 400; i += 1) {
      const result = shuffleDistinct(items, `seed-${i}`);

      expect(result.join()).not.toBe(items.join());
      expect([...result].sort()).toEqual([...items].sort());
    }
  });

  it("รายการที่มีไม่ถึงสองชิ้นคืนตามเดิมได้ ไม่พยายามสลับ", () => {
    expect(shuffleDistinct([], "x")).toEqual([]);
    expect(shuffleDistinct(["only"], "x")).toEqual(["only"]);
  });

  it("ยังคงให้ผลเหมือนเดิมเมื่อ seed เดิม", () => {
    const items = ["a", "b", "c", "d", "e"];

    expect(shuffleDistinct(items, "x")).toEqual(shuffleDistinct(items, "x"));
  });

  it("ไม่แก้ไขอาร์เรย์ต้นฉบับ", () => {
    const items = ["a", "b", "c"];
    const original = [...items];
    shuffleDistinct(items, "x");

    expect(items).toEqual(original);
  });
});
