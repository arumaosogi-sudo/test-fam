import { describe, expect, it } from "vitest";

import { UNITS, WORDS, getUnit, getWord, wordsInUnit } from "./index";
import {
  buildItems,
  chunkEvenly,
  LESSONS,
  WORDS_PER_LESSON,
  getLesson,
  lessonsInUnit,
  previousLesson,
  totalAnswersInLesson,
} from "./lessons";

/**
 * เทสชุดนี้ตรวจ "คุณภาพของเนื้อหา" ไม่ใช่แค่ตรรกะ
 * เพราะคลังคำจะถูกแก้โดยคนทำเนื้อหา ไม่ใช่โปรแกรมเมอร์
 */
describe("คลังคำ Pre-A1", () => {
  it("มีครบ 120 คำ และ 10 หน่วย ตามแผนเนื้อหา", () => {
    expect(WORDS.length).toBe(120);
    expect(UNITS.length).toBe(10);
  });

  it("id ของคำและของหน่วยไม่ซ้ำกัน", () => {
    expect(new Set(WORDS.map((word) => word.id)).size).toBe(WORDS.length);
    expect(new Set(UNITS.map((unit) => unit.id)).size).toBe(UNITS.length);
  });

  it("ทุกคำสังกัดหน่วยที่มีอยู่จริง", () => {
    for (const word of WORDS) {
      expect(getUnit(word.unitId), `${word.id} อ้างหน่วยที่ไม่มีอยู่`).toBeDefined();
    }
  });

  it("ทุกหน่วยมีคำอย่างน้อย 5 คำ จึงจะปั้นเป็นด่านได้", () => {
    for (const unit of UNITS) {
      expect(wordsInUnit(unit.id).length, unit.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("ไม่มีคำอังกฤษซ้ำกันภายในหน่วยเดียวกัน", () => {
    for (const unit of UNITS) {
      const words = wordsInUnit(unit.id).map((word) => word.en);
      expect(new Set(words).size, unit.id).toBe(words.length);
    }
  });

  it("ทุกคำมีคำแปลไทย คำอ่าน และอิโมจิ", () => {
    for (const word of WORDS) {
      expect(word.th.trim().length, word.id).toBeGreaterThan(0);
      expect(word.ipa.startsWith("/"), `${word.id} คำอ่านต้องอยู่ในเครื่องหมาย /`).toBe(true);
      expect(word.emoji.length, word.id).toBeGreaterThan(0);
    }
  });

  it("คำแปลไทยต้องไม่มีตัวอักษรภาษาอังกฤษปน", () => {
    for (const word of WORDS) {
      expect(/[a-zA-Z]/.test(word.th), `${word.id}: "${word.th}"`).toBe(false);
    }
  });

  it("ระดับของทุกคำเป็น Pre-A1 ตรงกับชื่อไฟล์", () => {
    for (const word of WORDS) {
      expect(word.cefr).toBe("Pre-A1");
    }
  });

  it("getWord หาเจอและคืน undefined เมื่อไม่มี", () => {
    expect(getWord("w-cat")?.en).toBe("cat");
    expect(getWord("ไม่มีคำนี้")).toBeUndefined();
  });
});

describe("chunkEvenly", () => {
  it("แบ่งให้ขนาดใกล้เคียงกัน ไม่ทิ้งเศษกลุ่มเล็กจิ๋ว", () => {
    expect(chunkEvenly([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 5)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11],
    ]);
  });

  it("ไม่ทำกลุ่มเกินขนาดสูงสุด และรวมกันแล้วได้ของครบ", () => {
    for (let total = 1; total <= 40; total += 1) {
      const items = Array.from({ length: total }, (_, i) => i);
      const chunks = chunkEvenly(items, 5);

      expect(chunks.flat()).toEqual(items);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(5);
        expect(chunk.length).toBeGreaterThan(0);
      }
    }
  });

  it("รับลิสต์ว่างได้", () => {
    expect(chunkEvenly([], 5)).toEqual([]);
  });
});

describe("ด่าน", () => {
  it("ทุกคำในคลังถูกบรรจุอยู่ในด่านใดด่านหนึ่ง ไม่มีคำตกหล่น", () => {
    const inLessons = LESSONS.flatMap((lesson) => lesson.wordIds);

    expect(new Set(inLessons).size).toBe(WORDS.length);
  });

  it("ไม่มีคำไหนอยู่ในสองด่าน", () => {
    const inLessons = LESSONS.flatMap((lesson) => lesson.wordIds);

    expect(inLessons.length).toBe(new Set(inLessons).size);
  });

  it("ทุกด่านมีคำไม่เกินที่กำหนด และไม่ว่างเปล่า", () => {
    for (const lesson of LESSONS) {
      expect(lesson.wordIds.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.wordIds.length, lesson.id).toBeLessThanOrEqual(
        WORDS_PER_LESSON,
      );
    }
  });

  it("id ของด่านไม่ซ้ำ และหาเจอด้วย getLesson", () => {
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(
      LESSONS.length,
    );
    expect(getLesson(LESSONS[0].id)).toEqual(LESSONS[0]);
    expect(getLesson("ไม่มีด่านนี้")).toBeUndefined();
  });

  it("ด่านแรกสุดไม่มีด่านก่อนหน้า ด่านอื่นมี", () => {
    expect(previousLesson(LESSONS[0].id)).toBeUndefined();
    expect(previousLesson(LESSONS[1].id)).toEqual(LESSONS[0]);
  });

  it("ด่านในหน่วยเรียงลำดับต่อเนื่องจาก 1", () => {
    for (const unit of UNITS) {
      const lessons = lessonsInUnit(unit.id);
      expect(lessons.length, unit.id).toBeGreaterThan(0);
      lessons.forEach((lesson, index) => {
        expect(lesson.order).toBe(index + 1);
      });
    }
  });
});

describe("buildItems", () => {
  const lesson = LESSONS[0];

  it("สร้างสองรอบ และแต่ละรอบครอบคลุมคำของด่าน", () => {
    const items = buildItems(lesson, () => 0);

    expect(items.length).toBe(2);
    for (const item of items) {
      expect(item.kind).toBe("match");
      expect(new Set(item.wordIds).size).toBe(item.wordIds.length);
      for (const wordId of item.wordIds) {
        expect(lesson.wordIds).toContain(wordId);
      }
    }
  });

  it("จำนวนข้อที่ต้องตอบทั้งด่านเท่ากับผลรวมของทุกรอบ", () => {
    expect(totalAnswersInLesson(lesson)).toBe(lesson.wordIds.length * 2);
  });

  it("ลำดับคำสลับกันได้ตามตัวสุ่มที่ส่งเข้าไป", () => {
    const ordered = buildItems(lesson, () => 0)[0].wordIds;
    const reversed = buildItems(lesson, () => 0.999)[0].wordIds;

    expect(new Set(ordered)).toEqual(new Set(reversed));
  });
});
