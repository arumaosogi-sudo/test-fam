import { describe, expect, it } from "vitest";

import { seededRandom } from "@/lib/random";
import type { Word } from "@/lib/types";

import { buildChoices, pickDistractors } from "./distractors";
import { WORDS, getWord, wordsInUnit } from "./index";

function word(id: string): Word {
  const found = getWord(id);
  if (!found) throw new Error(`ไม่มีคำ ${id} ในคลังคำ`);
  return found;
}

describe("pickDistractors", () => {
  it("เลือกจากหน่วยเดียวกันก่อน ตัวเลวงจึงใกล้เคียงคำตอบ", () => {
    const answer = word("w-cat");
    const picked = pickDistractors(answer, 3, seededRandom("s"));

    expect(picked.length).toBe(3);
    for (const distractor of picked) {
      expect(distractor.unitId).toBe(answer.unitId);
    }
  });

  it("ไม่มีคำตอบที่ถูกอยู่ในตัวลวง", () => {
    const answer = word("w-cat");
    const picked = pickDistractors(answer, 3, seededRandom("s"));

    expect(picked.map((item) => item.id)).not.toContain(answer.id);
  });

  it("ตัวลวงไม่ซ้ำกันเอง", () => {
    for (const answer of WORDS) {
      const picked = pickDistractors(answer, 3, seededRandom(answer.id));
      expect(new Set(picked.map((item) => item.id)).size, answer.id).toBe(
        picked.length,
      );
    }
  });

  it("ไม่เอาคำที่สะกดเหมือนคำตอบมาเป็นตัวลวง ไม่งั้นข้อนั้นมีคำตอบถูกสองใบ", () => {
    const answer = word("w-cat");
    const twin: Word = { ...answer, id: "w-cat-copy", th: "เหมียว" };
    const picked = pickDistractors(answer, 3, seededRandom("s"), [
      ...WORDS,
      twin,
    ]);

    expect(picked.map((item) => item.en)).not.toContain(answer.en);
  });

  it("หน่วยเล็กกว่าจำนวนที่ขอ ก็ยังได้ตัวลวงครบจากหน่วยอื่น", () => {
    // ขอตัวลวงมากกว่าจำนวนคำในหน่วยนั้น ต้องไม่คืนมาขาด
    const answer = word("w-one");
    const unitSize = wordsInUnit(answer.unitId).length;
    const picked = pickDistractors(answer, unitSize + 4, seededRandom("s"));

    expect(picked.length).toBe(unitSize + 4);
    expect(new Set(picked.map((item) => item.id)).size).toBe(picked.length);
  });

  it("ขอ 0 ตัวก็ได้อาร์เรย์ว่าง", () => {
    expect(pickDistractors(word("w-cat"), 0, seededRandom("s"))).toEqual([]);
  });
});

describe("buildChoices", () => {
  it("มีคำตอบที่ถูกอยู่หนึ่งใบเสมอ และได้ตัวเลือกครบตามจำนวน", () => {
    for (const answer of WORDS) {
      const choices = buildChoices(answer, 4, seededRandom(answer.id));

      expect(choices.length, answer.id).toBe(4);
      expect(
        choices.filter((choice) => choice.id === answer.id).length,
        answer.id,
      ).toBe(1);
      expect(new Set(choices.map((choice) => choice.id)).size, answer.id).toBe(
        4,
      );
    }
  });

  it("คำตอบที่ถูกไม่ได้อยู่ตำแหน่งเดิมทุกข้อ", () => {
    const positions = new Set(
      WORDS.slice(0, 40).map((answer) =>
        buildChoices(answer, 4, seededRandom(answer.id)).findIndex(
          (choice) => choice.id === answer.id,
        ),
      ),
    );

    // ถ้าคำตอบอยู่ตำแหน่งเดิมทุกข้อ เด็กจะกดช่องเดิมผ่านได้ทั้งด่าน
    expect(positions.size).toBeGreaterThan(1);
  });

  it("seed เดียวกันได้ตัวเลือกชุดเดิม ไม่สลับใหม่ตอน React วาดซ้ำ", () => {
    const answer = word("w-apple");

    expect(buildChoices(answer, 3, seededRandom("x"))).toEqual(
      buildChoices(answer, 3, seededRandom("x")),
    );
  });
});
