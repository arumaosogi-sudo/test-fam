import { describe, expect, it } from "vitest";

import { BLANK } from "@/lib/types";

import { UNITS, WORDS, getUnit, getWord, wordsInUnit } from "./index";
import { fillSentence, sentenceWithGap, splitSentence } from "./sentence";
import {
  buildItems,
  buildReviewItems,
  chunkEvenly,
  clozeLevelFor,
  pictureVariantFor,
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

  it("ให้ทุกคำของด่านครบทั้งสามทาง: จับคู่ ฟัง และผลิตคำเอง", () => {
    const items = buildItems(lesson, () => 0);

    const match = items.filter((item) => item.kind === "match");
    expect(match.length).toBe(1);
    expect(new Set(match[0].wordIds)).toEqual(new Set(lesson.wordIds));

    const asked = (kinds: string[]) =>
      new Set(
        items
          .filter((item) => kinds.includes(item.kind))
          .flatMap((item) => item.wordIds),
      );

    // ฟังหนึ่งข้อต่อคำ และผลิตคำเองหนึ่งข้อต่อคำ ไม่มีคำไหนตกหล่น
    expect(asked(["listen"])).toEqual(new Set(lesson.wordIds));
    expect(asked(["picture", "cloze"])).toEqual(new Set(lesson.wordIds));
  });

  it("id ของทุกข้อไม่ซ้ำกัน เพราะใช้เป็น key และเป็น seed ของการสุ่ม", () => {
    for (const current of LESSONS) {
      const ids = buildItems(current, () => 0).map((item) => item.id);
      expect(new Set(ids).size, current.id).toBe(ids.length);
    }
  });

  it("ข้อผลิตคำสลับโหมดกัน ไม่ให้เจอเกมเดียวห้าจอติด", () => {
    const produce = buildItems(lesson, () => 0).filter(
      (item) => item.kind === "picture" || item.kind === "cloze",
    );

    expect(produce.length).toBeGreaterThan(1);
    expect(new Set(produce.map((item) => item.kind)).size).toBe(2);
  });

  it("จำนวนข้อที่ต้องตอบทั้งด่านคือสามข้อต่อหนึ่งคำ", () => {
    expect(totalAnswersInLesson(lesson)).toBe(lesson.wordIds.length * 3);
  });

  it("ลำดับคำสลับกันได้ตามตัวสุ่มที่ส่งเข้าไป", () => {
    const ordered = buildItems(lesson, () => 0)[0].wordIds;
    const reversed = buildItems(lesson, () => 0.999)[0].wordIds;

    expect(new Set(ordered)).toEqual(new Set(reversed));
  });

  it("ความชำนาญสูงขึ้นแล้วได้โหมดย่อยที่ยากขึ้น", () => {
    const easy = buildItems(lesson, () => 0, () => ({ recognize: 0, write: 0 }));
    const hard = buildItems(lesson, () => 0, () => ({ recognize: 5, write: 5 }));

    const levels = (items: ReturnType<typeof buildItems>) =>
      items.flatMap((item) =>
        item.kind === "cloze"
          ? [item.level]
          : item.kind === "picture"
            ? [item.variant]
            : [],
      );

    expect(levels(easy)).toContain("bank");
    expect(levels(easy)).toContain("choose");
    expect(levels(hard)).toContain("type");
    expect(levels(hard)).toContain("spell");
  });
});

describe("clozeLevelFor / pictureVariantFor", () => {
  it("ไล่ระดับจากจำคำได้ ไปต่อตัวอักษร ไปพิมพ์เอง", () => {
    expect(clozeLevelFor({ recognize: 0, write: 0 })).toBe("bank");
    expect(clozeLevelFor({ recognize: 1, write: 0 })).toBe("bank");
    expect(clozeLevelFor({ recognize: 2, write: 0 })).toBe("tiles");
    expect(clozeLevelFor({ recognize: 5, write: 2 })).toBe("tiles");
    expect(clozeLevelFor({ recognize: 5, write: 3 })).toBe("type");
  });

  it("เกมภาพเปลี่ยนเป็นสะกดคำตอนจำคำได้แล้ว ตรงกับขั้นแรกของเกมเติมคำ", () => {
    expect(pictureVariantFor({ recognize: 1, write: 0 })).toBe("choose");
    expect(pictureVariantFor({ recognize: 2, write: 0 })).toBe("spell");
  });

  it("ระดับความยากเดินหน้าได้จริง ไม่ล็อกตัวเองอยู่ที่ขั้นง่ายสุด", () => {
    // ขั้นง่ายสุดฝึกแค่การจำคำ ถ้าขั้นถัดไปต้องใช้ดาวเขียนเป็นเกณฑ์
    // เด็กจะไม่มีทางได้เล่นข้อที่เพิ่มดาวเขียนเลย — เทสนี้กันไม่ให้พลาดซ้ำ
    const afterRecognizing = { recognize: 2, write: 0 };

    expect(clozeLevelFor(afterRecognizing)).not.toBe("bank");
    expect(pictureVariantFor(afterRecognizing)).not.toBe("choose");
  });
});

/**
 * ประโยคตัวอย่างเป็นเนื้อหาที่คนทำเนื้อหาจะมาแก้เหมือนคลังคำ
 * เทสชุดนี้จึงตรวจสิ่งที่ทำให้ "ข้อนั้นเล่นไม่ได้" ไม่ใช่ตรวจสำนวน
 */
describe("ประโยคตัวอย่างของเกมเติมคำ", () => {
  it("ทุกคำมีประโยคที่มีช่องว่างพอดีหนึ่งช่อง", () => {
    for (const word of WORDS) {
      const { before, after } = splitSentence(word.sentence);
      expect(`${before}${BLANK}${after}`, word.id).toBe(word.sentence);
      expect(word.sentence.split(BLANK).length, word.id).toBe(2);
    }
  });

  it("ประโยคไม่เฉลยคำตอบด้วยตัวเอง", () => {
    for (const word of WORDS) {
      const around = word.sentence.replace(BLANK, " ");
      const appearsAlready = new RegExp(`\b${word.en}\b`, "i").test(around);

      // ถ้าคำตอบโผล่อยู่ในประโยคอยู่แล้ว เด็กลอกจากประโยคได้โดยไม่ต้องรู้คำ
      expect(appearsAlready, `${word.id}: ${word.sentence}`).toBe(false);
    }
  });

  it("ประโยคเป็นภาษาอังกฤษล้วน ไม่มีตัวอักษรไทยปน", () => {
    for (const word of WORDS) {
      expect(/[฀-๿]/.test(word.sentence), word.id).toBe(false);
    }
  });

  it("ประโยคสั้นพอสำหรับ Pre-A1 และจบด้วยเครื่องหมายวรรคตอน", () => {
    for (const word of WORDS) {
      const filled = fillSentence(word.sentence, word.en);

      expect(filled.length, `${word.id}: ${filled}`).toBeLessThanOrEqual(45);
      expect(filled, word.id).toMatch(/[.!?]$/);
      expect(filled[0], word.id).toBe(filled[0].toUpperCase());
    }
  });

  it("ประโยคที่เติมคำแล้วมีคำตอบอยู่จริง", () => {
    for (const word of WORDS) {
      expect(fillSentence(word.sentence, word.en), word.id).toContain(word.en);
    }
  });

  it("ประโยคที่ใช้อ่านออกเสียงไม่มีสัญลักษณ์ช่องว่างหลุดไปให้เครื่องอ่าน", () => {
    for (const word of WORDS) {
      expect(sentenceWithGap(word.sentence), word.id).not.toContain(BLANK);
    }
  });
});

describe("buildReviewItems", () => {
  const wordIds = LESSONS[0].wordIds.concat(LESSONS[1].wordIds);

  it("ถามหนึ่งข้อต่อหนึ่งคำ ไม่มากกว่านั้น", () => {
    const items = buildReviewItems(wordIds);

    expect(items.length).toBe(wordIds.length);
    expect(items.flatMap((item) => item.wordIds)).toEqual(wordIds);
  });

  it("ไม่มีโหมดจับคู่ เพราะจับคู่เอาคำตอบมาวางให้เห็นอยู่แล้ว", () => {
    // การทบทวนต้องการรู้ว่าเด็ก "นึกคำออกเอง" หรือเปล่า
    const kinds = new Set(buildReviewItems(wordIds).map((item) => item.kind));

    expect(kinds.has("match")).toBe(false);
  });

  it("หมุนโหมดไม่ให้เจอเกมเดิมติดกันทั้งชุด", () => {
    const kinds = buildReviewItems(wordIds).map((item) => item.kind);

    expect(new Set(kinds).size).toBe(3);
  });

  it("id ของทุกข้อไม่ซ้ำกัน เพราะใช้เป็น key และเป็น seed ของการสุ่ม", () => {
    const ids = buildReviewItems(wordIds).map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ความชำนาญสูงขึ้นแล้วได้โหมดย่อยที่ยากขึ้น", () => {
    const easy = buildReviewItems(wordIds, () => ({ recognize: 0, write: 0 }));
    const hard = buildReviewItems(wordIds, () => ({ recognize: 5, write: 5 }));

    const levels = (items: ReturnType<typeof buildReviewItems>) =>
      items.flatMap((item) =>
        item.kind === "cloze"
          ? [item.level]
          : item.kind === "picture"
            ? [item.variant]
            : [],
      );

    expect(levels(easy)).toContain("bank");
    expect(levels(easy)).toContain("choose");
    expect(levels(hard)).toContain("type");
    expect(levels(hard)).toContain("spell");
  });

  it("ชุดว่างก็คืนอาร์เรย์ว่าง ไม่พัง", () => {
    expect(buildReviewItems([])).toEqual([]);
  });
});
