import { describe, expect, it } from "vitest";

import { seededRandom } from "@/lib/random";

import {
  answerSlots,
  checkTypedAnswer,
  editDistance,
  letterSlotPositions,
  letterTiles,
  normalizeAnswer,
} from "./spelling";

describe("answerSlots", () => {
  it("แยกช่องตัวอักษรกับช่องว่างระหว่างคำออกจากกัน", () => {
    expect(answerSlots("cat")).toEqual([
      { kind: "letter", expected: "c" },
      { kind: "letter", expected: "a" },
      { kind: "letter", expected: "t" },
    ]);
  });

  it("คำที่มีช่องว่างได้ช่องว่างเป็นช่องที่เติมไว้แล้ว", () => {
    const slots = answerSlots("ice cream");

    expect(slots.length).toBe(9);
    expect(slots[3]).toEqual({ kind: "space" });
    expect(slots.filter((slot) => slot.kind === "letter").length).toBe(8);
  });

  it("ไม่สนตัวพิมพ์ใหญ่", () => {
    expect(answerSlots("Cat")).toEqual(answerSlots("cat"));
  });
});

describe("letterSlotPositions", () => {
  it("นับลำดับช่องตัวอักษรข้ามช่องว่างไปถูกต้อง", () => {
    // "ice cream" — ช่องบนจอ 9 ช่อง แต่ตัวอักษรที่ต้องวางมี 8 ตัว
    expect(letterSlotPositions(answerSlots("ice cream"))).toEqual([
      0,
      1,
      2,
      null,
      3,
      4,
      5,
      6,
      7,
    ]);
  });
});

describe("letterTiles", () => {
  it("มีตัวอักษรของคำตอบครบ รวมตัวที่ซ้ำกัน", () => {
    const tiles = letterTiles("banana", seededRandom("x"), 0);

    expect([...tiles].sort().join("")).toBe("aaabnn");
  });

  it("ไม่นับช่องว่างเป็นตัวอักษรที่ต้องวาง", () => {
    const tiles = letterTiles("ice cream", seededRandom("x"), 0);

    expect(tiles).not.toContain(" ");
    expect(tiles.length).toBe(8);
  });

  it("คำสั้นได้ตัวหลอกเพิ่ม เพื่อไม่ให้เรียงถูกโดยไม่ต้องคิด", () => {
    const tiles = letterTiles("cat", seededRandom("x"));

    expect(tiles.length).toBeGreaterThan(3);
  });

  it("ตัวหลอกไม่ซ้ำกับตัวอักษรในคำตอบ ไม่งั้นจะมีคำตอบถูกหลายทาง", () => {
    const answer = "cat";
    const tiles = letterTiles(answer, seededRandom("seed-7"));
    const extra = [...tiles];

    for (const letter of answer) {
      extra.splice(extra.indexOf(letter), 1);
    }

    for (const decoy of extra) {
      expect(answer).not.toContain(decoy);
    }
  });

  it("seed เดียวกันได้ลำดับเดิม", () => {
    expect(letterTiles("apple", seededRandom("s"))).toEqual(
      letterTiles("apple", seededRandom("s")),
    );
  });
});

describe("editDistance", () => {
  it("คำเหมือนกันได้ 0", () => {
    expect(editDistance("cat", "cat")).toBe(0);
  });

  it("นับการแก้ตัวอักษร เพิ่ม และลบ เป็นหนึ่งครั้ง", () => {
    expect(editDistance("cet", "cat")).toBe(1);
    expect(editDistance("ct", "cat")).toBe(1);
    expect(editDistance("caat", "cat")).toBe(1);
  });

  it("สลับตำแหน่งตัวอักษรนับเป็นสองครั้ง", () => {
    expect(editDistance("act", "cat")).toBe(2);
  });

  it("คำว่างได้ระยะเท่าความยาวของอีกคำ", () => {
    expect(editDistance("", "cat")).toBe(3);
    expect(editDistance("cat", "")).toBe(3);
  });
});

describe("normalizeAnswer", () => {
  it("ตัดช่องว่างหัวท้าย ยุบช่องว่างซ้ำ และไม่สนตัวพิมพ์ใหญ่", () => {
    expect(normalizeAnswer("  Ice   Cream ")).toBe("ice cream");
  });
});

describe("checkTypedAnswer", () => {
  it("สะกดถูกก็ถูก ไม่สนตัวพิมพ์ใหญ่กับช่องว่างหัวท้าย", () => {
    expect(checkTypedAnswer("Cat", "cat")).toEqual({ kind: "correct" });
    expect(checkTypedAnswer(" ice cream ", "ice cream")).toEqual({
      kind: "correct",
    });
  });

  it("สะกดผิดตัวเดียวยังไม่นับว่าผิด แต่บอกตำแหน่งที่พลาด", () => {
    expect(checkTypedAnswer("cet", "cat")).toEqual({
      kind: "near",
      position: 2,
    });
  });

  it("พิมพ์ขาดตัวท้ายก็ยังถือว่าใกล้ และชี้ไปที่ตัวที่ขาด", () => {
    expect(checkTypedAnswer("ca", "cat")).toEqual({
      kind: "near",
      position: 3,
    });
  });

  it("ผิดตั้งแต่สองตัวขึ้นไปนับว่าผิด", () => {
    expect(checkTypedAnswer("dog", "cat")).toEqual({ kind: "wrong" });
    expect(checkTypedAnswer("act", "cat")).toEqual({ kind: "wrong" });
  });

  it("ไม่พิมพ์อะไรเลยนับว่าผิด ไม่ใช่ใกล้แล้ว", () => {
    // คำว่าง "a" ห่างจาก "a" แค่หนึ่งตัว แต่การไม่ตอบไม่ควรได้คำใบ้
    expect(checkTypedAnswer("", "a")).toEqual({ kind: "wrong" });
    expect(checkTypedAnswer("   ", "cat")).toEqual({ kind: "wrong" });
  });
});
