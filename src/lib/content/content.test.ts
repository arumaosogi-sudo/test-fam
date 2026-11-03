import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BLANK, type Word } from "@/lib/types";

import { UNITS, WORDS, getUnit, getWord, wordsInUnit } from "./index";
import { splitWords, wordIsInLevel } from "./readings";
import { fillSentence, sentenceWithGap, splitSentence } from "./sentence";
import {
  buildItems,
  buildReviewItems,
  chunkEvenly,
  clozeLevelFor,
  levelFloorFor,
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
describe("คลังคำ", () => {
  it("มีคำและหน่วยครบตามที่นำเข้าไว้", () => {
    // ตัวเลขนี้เป็นหมุดกันคำหายโดยไม่มีใครรู้ ไม่ใช่เป้าหมายของเนื้อหา
    expect(WORDS.length).toBe(542);
    expect(UNITS.length).toBe(62);
  });

  /**
   * ประโยคตัวอย่างต้องอ่านได้ด้วยคำที่เด็กเรียนมาแล้ว
   *
   * เกมเติมคำโชว์ประโยคบนจอให้เด็กอ่านเพื่อเดาคำที่หายไป ถ้าในประโยคมีคำที่
   * เด็กยังไม่เคยเรียนอยู่ด้วย ข้อนั้นเลิกวัดคำเป้าหมาย แล้วกลายเป็นวัดคำที่
   * เด็กไม่รู้จักแทน — ปัญหานี้หนักที่สุดกับเด็กอนุบาลที่อ่านอังกฤษแทบไม่ออก
   *
   * เรื่องอ่าน (readings) มีด่านนี้แบบเข้มอยู่แล้ว (`unknownWords` ต้องว่าง)
   * แต่ประโยคตัวอย่างไม่เคยมี จึงสะสมคำนอกคลังไว้ 208 ประโยคจาก 495
   * ก่อนจะเจอตอนเพิ่มคำ A2 ชุดที่สอง — ตอนนี้แก้ครบทุกระดับแล้ว
   * เทสนี้จึงเป็นด่านเข้มเท่ากับของเรื่องอ่าน ไม่ใช่เพดานที่ค่อย ๆ ลดอีกต่อไป
   */
  it("ประโยคตัวอย่างทุกคำใช้แต่คำที่อยู่ในคลังแล้ว", () => {
    const bad = WORDS.filter((word) => word.sentence).filter((word) =>
      splitWords(word.sentence as string).some((token) => !wordIsInLevel(token)),
    );

    expect(
      bad.map(
        (word) =>
          `${word.id} (${word.cefr}): ${word.sentence} << ${splitWords(
            word.sentence as string,
          )
            .filter((token) => !wordIsInLevel(token))
            .join(" ")}`,
      ),
    ).toEqual([]);
  });

  it("ทุกหน่วยมีคำอยู่จริง ไม่มีหน่วยว่าง", () => {
    for (const unit of UNITS) {
      expect(wordsInUnit(unit.id).length, unit.id).toBeGreaterThan(0);
    }
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

  it("ทุกคำมีคำแปลไทยและคำอ่าน", () => {
    for (const word of WORDS) {
      expect(word.th.trim().length, word.id).toBeGreaterThan(0);
      expect(word.ipa.startsWith("/"), `${word.id} คำอ่านต้องอยู่ในเครื่องหมาย /`).toBe(true);
    }
  });

  it("คำแปลไทยต้องไม่มีตัวอักษรภาษาอังกฤษปน", () => {
    for (const word of WORDS) {
      expect(/[a-zA-Z]/.test(word.th), `${word.id}: "${word.th}"`).toBe(false);
    }
  });

  it("ระดับของคำตรงกับระดับของหน่วยที่สังกัด", () => {
    // ถ้าสองอย่างนี้ไม่ตรงกัน แผนที่ด่านจะบอกระดับหนึ่งแต่สอนอีกระดับหนึ่ง
    for (const word of WORDS) {
      expect(getUnit(word.unitId)?.cefr, word.id).toBe(word.cefr);
    }
  });

  it("มีเนื้อหามากกว่าหนึ่งระดับแล้ว", () => {
    expect(new Set(UNITS.map((unit) => unit.cefr)).size).toBeGreaterThan(1);
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
    expect(asked(["picture", "cloze", "say"])).toEqual(
      new Set(lesson.wordIds),
    );
  });

  it("id ของทุกข้อไม่ซ้ำกัน เพราะใช้เป็น key และเป็น seed ของการสุ่ม", () => {
    for (const current of LESSONS) {
      const ids = buildItems(current, () => 0).map((item) => item.id);
      expect(new Set(ids).size, current.id).toBe(ids.length);
    }
  });

  it("ข้อผลิตคำสลับโหมดกัน ไม่ให้เจอเกมเดียวห้าจอติด", () => {
    const produce = buildItems(lesson, () => 0).filter((item) =>
      ["picture", "cloze", "say"].includes(item.kind),
    );

    expect(produce.length).toBeGreaterThan(1);
    expect(new Set(produce.map((item) => item.kind)).size).toBe(3);
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
  /**
   * คำที่นำเข้าจาก NGSL ยังไม่มีประโยคตัวอย่าง เกมเติมคำจึงข้ามคำพวกนั้นไป
   * เทสชุดนี้ตรวจเฉพาะคำที่มีประโยคแล้วว่าประโยคนั้นใช้ได้จริง
   */
  const withSentence = WORDS.filter(
    (word): word is Word & { sentence: string } => Boolean(word.sentence),
  );

  it("ตอนนี้ทุกคำมีประโยคแล้ว", () => {
    // schema ยอมให้คำไม่มีประโยคได้ (เกมเติมคำจะข้ามไป) แต่คลังปัจจุบันมีครบ
    // เพิ่มคำใหม่โดยไม่เขียนประโยค เทสนี้จะพังให้รู้ตัวก่อน
    const withoutSentence = WORDS.filter((word) => !word.sentence);

    expect(withoutSentence.map((word) => word.id)).toEqual([]);
    expect(withSentence.length).toBe(WORDS.length);
  });

  it("ทุกประโยคมีช่องว่างพอดีหนึ่งช่อง", () => {
    for (const word of withSentence) {
      const { before, after } = splitSentence(word.sentence);
      expect(`${before}${BLANK}${after}`, word.id).toBe(word.sentence);
      expect(word.sentence.split(BLANK).length, word.id).toBe(2);
    }
  });

  it("ประโยคไม่เฉลยคำตอบด้วยตัวเอง", () => {
    for (const word of withSentence) {
      const around = word.sentence.replace(BLANK, " ");
      const appearsAlready = new RegExp(`\b${word.en}\b`, "i").test(around);

      // ถ้าคำตอบโผล่อยู่ในประโยคอยู่แล้ว เด็กลอกจากประโยคได้โดยไม่ต้องรู้คำ
      expect(appearsAlready, `${word.id}: ${word.sentence}`).toBe(false);
    }
  });

  it("ประโยคเป็นภาษาอังกฤษล้วน ไม่มีตัวอักษรไทยปน", () => {
    for (const word of withSentence) {
      expect(/[฀-๿]/.test(word.sentence), word.id).toBe(false);
    }
  });

  it("ประโยคสั้นพอสำหรับ Pre-A1 และจบด้วยเครื่องหมายวรรคตอน", () => {
    for (const word of withSentence) {
      const filled = fillSentence(word.sentence, word.en);

      expect(filled.length, `${word.id}: ${filled}`).toBeLessThanOrEqual(45);
      expect(filled, word.id).toMatch(/[.!?]$/);
      expect(filled[0], word.id).toBe(filled[0].toUpperCase());
    }
  });

  it("ประโยคที่เติมคำแล้วมีคำตอบอยู่จริง", () => {
    for (const word of withSentence) {
      expect(fillSentence(word.sentence, word.en), word.id).toContain(word.en);
    }
  });

  it("ประโยคที่ใช้อ่านออกเสียงไม่มีสัญลักษณ์ช่องว่างหลุดไปให้เครื่องอ่าน", () => {
    for (const word of withSentence) {
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

    expect(new Set(kinds).size).toBe(4);
  });

  /**
   * ด่านทบทวนต้องมีข้อพูดด้วย ไม่ใช่เฉพาะด่านเรียนใหม่
   *
   * คำที่พูดได้วันนี้ก็ลืมวิธีออกเสียงได้เหมือนคำที่สะกดได้ ถ้าการทบทวนไม่แตะ
   * ทักษะพูดเลย ดาวทักษะพูดจะค้างอยู่ที่ค่าของวันที่เรียนคำนั้นไปตลอด
   */
  it("มีข้อพูดอยู่ในด่านทบทวนด้วย", () => {
    const kinds = buildReviewItems(wordIds).map((item) => item.kind);

    expect(kinds).toContain("say");
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

describe("ภาพประกอบคำศัพท์", () => {
  const dir = join(process.cwd(), "public", "words");

  /** คำนามธรรมอย่าง think หรือ important วาดเป็นภาพไม่ได้ จึงไม่มีไฟล์ภาพ */
  const withImage = WORDS.filter((word) => word.image);

  it("มีคำที่มีภาพให้ตรวจจริง", () => {
    expect(withImage.length).toBeGreaterThan(100);
  });

  it("คำที่บอกว่ามีภาพ ต้องมีไฟล์ภาพจริง", () => {
    // ถ้าธงกับไฟล์ไม่ตรงกัน เด็กจะเห็นรูปแตกบนจอ
    for (const word of withImage) {
      expect(existsSync(join(dir, `${word.id}.svg`)), word.id).toBe(true);
    }
  });

  it("คำที่บอกว่าไม่มีภาพ ต้องไม่มีไฟล์ภาพค้างอยู่", () => {
    for (const word of WORDS.filter((w) => !w.image)) {
      expect(existsSync(join(dir, `${word.id}.svg`)), word.id).toBe(false);
    }
  });

  it("ไม่มีไฟล์ภาพที่ไม่มีคำรองรับ", () => {
    const owned = new Set(withImage.map((word) => `${word.id}.svg`));
    const orphans = readdirSync(dir).filter(
      (file) => file.endsWith(".svg") && !owned.has(file),
    );

    expect(orphans).toEqual([]);
  });

  it("ไฟล์เป็น SVG จริง ไม่ใช่หน้า error ที่ดาวน์โหลดมา", () => {
    for (const word of withImage) {
      const svg = readFileSync(join(dir, `${word.id}.svg`), "utf8");
      expect(svg.trimStart().startsWith("<svg"), word.id).toBe(true);
    }
  });

  it("ไม่มีคำสองคำที่ใช้ภาพเดียวกัน", () => {
    // ถ้าซ้ำ เกมจับคู่กับเกมฟังจะมีภาพเหมือนกันสองใบ เด็กแยกไม่ออกว่าอันไหนคือคำตอบ
    const byEmoji = new Map<string, string[]>();
    for (const word of withImage) {
      if (!word.emoji) continue;
      byEmoji.set(word.emoji, [...(byEmoji.get(word.emoji) ?? []), word.id]);
    }

    const shared = [...byEmoji.entries()].filter(([, ids]) => ids.length > 1);
    expect(shared.map(([emoji, ids]) => `${emoji} -> ${ids.join(", ")}`)).toEqual(
      [],
    );
  });

  it("คำที่มีภาพต้องบอกด้วยว่าภาพมาจากอิโมจิตัวไหน", () => {
    for (const word of withImage) {
      expect(word.emoji, word.id).toBeTruthy();
    }
  });

  it("มีไฟล์แจ้งสัญญาอนุญาตอยู่กับชุดภาพ", () => {
    // ภาพชุดนี้เป็น CC BY-SA 4.0 ซึ่งบังคับให้ต้องให้เครดิต
    const license = readFileSync(join(dir, "LICENSE.md"), "utf8");

    expect(license).toContain("OpenMoji");
    expect(license).toContain("CC BY-SA 4.0");
  });
});

describe("ระดับที่ผู้เรียนเลือกเอง", () => {
  it("ระดับยิ่งสูง พื้นความยากยิ่งสูง ไม่มีระดับไหนย้อนกลับ", () => {
    expect(levelFloorFor("Pre-A1")).toBe("bank");
    expect(levelFloorFor("A1")).toBe("tiles");
    expect(levelFloorFor("A2")).toBe("type");
    expect(levelFloorFor("B1")).toBe("type");
    expect(levelFloorFor("C1")).toBe("type");
  });

  it("พื้นความยากดันข้อขึ้น แม้เด็กยังไม่มีดาวความชำนาญเลย", () => {
    // เด็ก ป.5 ที่เพิ่งเปิดแอปไม่ควรต้องไล่กดเลือกจากสามตัวเลือกไปทั้งหน่วย
    const fresh = { recognize: 0, write: 0 };

    expect(clozeLevelFor(fresh, "bank")).toBe("bank");
    expect(clozeLevelFor(fresh, "tiles")).toBe("tiles");
    expect(clozeLevelFor(fresh, "type")).toBe("type");
    expect(pictureVariantFor(fresh, "tiles")).toBe("spell");
  });

  it("ความชำนาญยังดันให้ยากกว่าพื้นได้ แต่พื้นไม่เคยดึงลง", () => {
    const skilled = { recognize: 5, write: 5 };

    // เก่งแล้วได้พิมพ์เอง แม้เลือกระดับต่ำสุด
    expect(clozeLevelFor(skilled, "bank")).toBe("type");
    // และพื้นไม่ทำให้ข้อง่ายลงกว่าที่ความชำนาญถึง
    expect(clozeLevelFor(skilled, "tiles")).toBe("type");
  });

  it("ส่งพื้นความยากเข้า buildItems แล้วข้อยากขึ้นจริงทั้งด่าน", () => {
    const lesson = LESSONS[0];
    const easy = buildItems(lesson, () => 0, undefined, "bank");
    const hard = buildItems(lesson, () => 0, undefined, "type");

    const clozeLevels = (items: ReturnType<typeof buildItems>) =>
      items.flatMap((item) => (item.kind === "cloze" ? [item.level] : []));

    expect(clozeLevels(easy).every((level) => level === "bank")).toBe(true);
    expect(clozeLevels(hard).every((level) => level === "type")).toBe(true);
  });
});

/**
 * คำแปลผิดในสื่อสอนเด็กคือความเสียหายจริง และโตตามจำนวนคำ
 * เทสชุดนี้จึงกันไม่ให้คำที่ยังไม่มีใครตรวจหลุดถึงเด็กโดยไม่มีใครรู้ตัว
 */
describe("ที่มาของคำแปลไทย", () => {
  it("ทุกคำต้องระบุว่าคำแปลมีอะไรรองรับ", () => {
    for (const word of WORDS) {
      expect(["wiktionary", "adapted", "unverified"], word.id).toContain(
        word.thSource,
      );
    }
  });

  it("ไม่มีคำที่ยังไม่ได้ตรวจหลงอยู่ในคลัง", () => {
    // เพิ่มคำใหม่โดยไม่ตรวจคำแปลก่อน เทสนี้จะพังทันที
    const unverified = WORDS.filter((word) => word.thSource === "unverified");

    expect(unverified.map((word) => word.id)).toEqual([]);
  });

  it("คำที่ปรับถ้อยคำเองต้องมีเหตุผลเขียนไว้ในเอกสาร", () => {
    const review = readFileSync(
      join(process.cwd(), "docs", "thai-review.md"),
      "utf8",
    );

    for (const word of WORDS.filter((item) => item.thSource === "adapted")) {
      expect(review, word.id).toContain(`| ${word.en} |`);
    }
  });

  it("เอกสารตรวจคำแปลบอกที่มาและไม่ลืมให้เครดิต", () => {
    const review = readFileSync(
      join(process.cwd(), "docs", "thai-review.md"),
      "utf8",
    );

    expect(review).toContain("Wiktionary");
    expect(review).toContain("kaikki.org");
  });

  it("ส่วนใหญ่ต้องมีพจนานุกรมรองรับตรงตัว ไม่ใช่ปรับเองเกือบทั้งคลัง", () => {
    const fromDictionary = WORDS.filter(
      (word) => word.thSource === "wiktionary",
    ).length;

    // ถ้าวันหนึ่งสัดส่วนนี้ตก แปลว่าเริ่มเขียนคำแปลเองมากกว่าอ้างพจนานุกรม
    expect(fromDictionary / WORDS.length).toBeGreaterThan(0.8);
  });
});

/**
 * คำอ่านที่ปนสำเนียงแย่กว่าไม่มีคำอ่านเลย เพราะเด็กเห็นสัญลักษณ์อย่างหนึ่ง
 * แต่ได้ยินเครื่องอ่านออกเสียงอีกอย่างหนึ่ง เทสชุดนี้คุมไม่ให้หลุดกลับมา
 */
describe("คำอ่าน IPA", () => {
  it("ทุกคำต้องระบุว่าคำอ่านมีอะไรรองรับ", () => {
    for (const word of WORDS) {
      expect(["wiktionary", "unverified"], word.id).toContain(word.ipaSource);
    }
  });

  it("ไม่มีคำที่คำอ่านยังไม่ได้ตรวจหลงอยู่ในคลัง", () => {
    const unverified = WORDS.filter((word) => word.ipaSource === "unverified");

    expect(unverified.map((word) => word.id)).toEqual([]);
  });

  it("คำอ่านอยู่ในเครื่องหมาย / / และไม่ว่าง", () => {
    for (const word of WORDS) {
      expect(word.ipa.startsWith("/"), word.id).toBe(true);
      expect(word.ipa.endsWith("/"), word.id).toBe(true);
      expect(word.ipa.length, word.id).toBeGreaterThan(3);
    }
  });

  it("ไม่มีร่องรอยสำเนียงอังกฤษหลงเหลือ", () => {
    /**
     * สระ əʊ ɜː ɑː ɒ ไม่มีในสำเนียงอเมริกันมาตรฐาน
     *
     * ส่วน tj dj nj คือการคงเสียง y หลังพยัญชนะ (tune /tjuːn/ · new /njuː/)
     * ซึ่งอเมริกันตัดทิ้ง — แต่ต้องดูตัวที่ตามมาด้วย เพราะเสียง y แบบอังกฤษ
     * มาก่อนสระ u เท่านั้น ถ้าเช็คแค่ตัวอักษรสองตัวจะจับคำที่ถูกอยู่แล้วผิด:
     * onion /ˈʌnj(ə)n/ มี nj ที่เป็นเสียงควบปกติ ออกเสียงเหมือนกันทั้งสองสำเนียง
     * (เจอตอนนำเข้าคำ A2 — เทสฟ้อง onion ทั้งที่คำอ่านเป็นอเมริกันถูกต้อง)
     */
    const british = WORDS.filter((word) =>
      /əʊ|ɜː|ɑː|ɒ|[tdn]j(?=[uʊ])/.test(word.ipa),
    );

    expect(british.map((word) => `${word.en} ${word.ipa}`)).toEqual([]);
  });

  /** กันการแก้เทสข้างบนให้หลวมจนไม่จับอะไรเลย */
  it("ตัวตรวจสำเนียงอังกฤษยังจับของจริงได้", () => {
    const rpMarkers = /əʊ|ɜː|ɑː|ɒ|[tdn]j(?=[uʊ])/;

    // ตัวอย่างคำอ่านสำเนียงอังกฤษจริงจากพจนานุกรม
    expect(rpMarkers.test("/njuː/")).toBe(true);
    expect(rpMarkers.test("/tjuːn/")).toBe(true);
    expect(rpMarkers.test("/ˈstjuːdnt/")).toBe(true);
    expect(rpMarkers.test("/ɡəʊ/")).toBe(true);
    expect(rpMarkers.test("/bɑːθ/")).toBe(true);

    // ตัวอย่างคำอ่านอเมริกันที่ต้องไม่ถูกจับ
    expect(rpMarkers.test("/ˈʌnj(ə)n/")).toBe(false);
    expect(rpMarkers.test("/ˈstudnt/")).toBe(false);
    expect(rpMarkers.test("/ɡoʊ/")).toBe(false);
  });

  it("เอกสารคำอ่านบอกที่มาและสำเนียงที่เลือก", () => {
    const review = readFileSync(
      join(process.cwd(), "docs", "ipa-review.md"),
      "utf8",
    );

    expect(review).toContain("Wiktionary");
    expect(review).toContain("General American");
  });
});
