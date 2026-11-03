import { describe, expect, it } from "vitest";

import { CEFR_ORDER } from "@/lib/types";

import {
  FUNCTION_WORDS,
  READINGS,
  bankWordIdFor,
  displayTokens,
  getReading,
  passageWords,
  splitWords,
  unknownWords,
  wordIsInLevel,
} from "./readings";

describe("เรื่องอ่าน", () => {
  it("โหลดได้และ id ไม่ซ้ำ", () => {
    expect(READINGS.length).toBeGreaterThan(0);
    expect(new Set(READINGS.map((r) => r.id)).size).toBe(READINGS.length);
  });

  it("หาเรื่องจาก id ได้", () => {
    expect(getReading(READINGS[0].id)?.titleEn).toBe(READINGS[0].titleEn);
    expect(getReading("ไม่มีจริง")).toBeUndefined();
  });

  /**
   * ด่านสำคัญที่สุดของไฟล์นี้
   *
   * ถ้าเทสข้อนี้พัง แปลว่าเรื่องอ่านมีคำที่เด็กยังไม่เคยเรียน แล้วโหมดอ่าน
   * ออกเสียงจะกลายเป็นการเดาคำแปลกหน้า ไม่ใช่การอ่านของที่เรียนมาให้คล่อง
   * ทางแก้คือแก้เรื่องให้ใช้คำในคลัง **ไม่ใช่** เติมคำลง FUNCTION_WORDS
   */
  it("ทุกคำในทุกเรื่องอยู่ในระดับที่เด็กเข้าถึงได้", () => {
    for (const reading of READINGS) {
      expect(unknownWords(reading), reading.id).toEqual([]);
    }
  });

  /**
   * เพดานความยาวแยกตามระดับ
   *
   * ถ้าใช้เพดานเดียวทุกระดับ เรื่อง B1 จะยาวเท่าเรื่องอนุบาล แล้วป้ายระดับ
   * ก็ไม่ได้บอกอะไรเลยนอกจากคำศัพท์ — เด็ก ป.5–6 อ่านยาวกว่านั้นได้
   * และโหมดอ่านออกเสียงวัดความเร็วจากทั้งเรื่อง ยิ่งสั้นยิ่งวัดได้หยาบ
   *
   * ตัวเลขเลือกจากความยาวที่เด็กแต่ละช่วงชั้นอ่านจบในสมาธิหนึ่งรอบ
   * **ยังไม่มีครูตรวจ** เหมือนเกณฑ์ความเร็วการอ่านใน paceLabel
   */
  const LIMITS: Record<string, { words: number; perSentence: number }> = {
    "Pre-A1": { words: 60, perSentence: 12 },
    A1: { words: 60, perSentence: 12 },
    A2: { words: 70, perSentence: 13 },
    B1: { words: 85, perSentence: 15 },
  };

  it("ประโยคต่อเรื่องและคำต่อประโยคอยู่ในระดับที่เด็กอ่านจบได้", () => {
    for (const reading of READINGS) {
      expect(reading.sentences.length, reading.id).toBeLessThanOrEqual(10);

      const limit = LIMITS[reading.cefr];
      expect(limit, `${reading.id}: ไม่มีเพดานของระดับ ${reading.cefr}`).toBeDefined();

      for (const sentence of reading.sentences) {
        // ประโยคยาวเกินเพดาน เด็กอ่านออกเสียงแล้วหลุดกลางทาง
        expect(splitWords(sentence).length, sentence).toBeLessThanOrEqual(
          limit.perSentence,
        );
      }
    }
  });

  it("มีเรื่องอ่านครบทุกระดับที่คลังคำมีคำอยู่", () => {
    const levels = new Set(READINGS.map((r) => r.cefr));

    // สี่ระดับที่คลังคำมีคำอยู่จริง ต้องมีเรื่องอ่านของตัวเอง
    for (const level of ["Pre-A1", "A1", "A2", "B1"] as const) {
      expect(levels.has(level), level).toBe(true);
    }
    for (const level of levels) expect(CEFR_ORDER).toContain(level);
  });

  it("คำถามท้ายเรื่องมีคำตอบที่ชี้ไปยังตัวเลือกที่มีอยู่", () => {
    for (const reading of READINGS) {
      const { choicesTh, answerIndex } = reading.question;

      expect(choicesTh[answerIndex], reading.id).toBeTruthy();
      // ตัวเลือกซ้ำกันทำให้มีคำตอบถูกสองข้อ
      expect(new Set(choicesTh).size, reading.id).toBe(choicesTh.length);
    }
  });

  /** เรื่องที่ยาวกว่าเพดานของระดับ เด็กอ่านออกเสียงไม่จบในหนึ่งรอบสมาธิ */
  it("เรื่องหนึ่งไม่เกินเพดานคำของระดับตัวเอง", () => {
    for (const reading of READINGS) {
      expect(
        passageWords(reading).length,
        `${reading.id} (${reading.cefr})`,
      ).toBeLessThanOrEqual(LIMITS[reading.cefr].words);
    }
  });
});

describe("splitWords", () => {
  it("ตัดเครื่องหมายวรรคตอนหัวท้ายออก", () => {
    expect(splitWords("My cat is black and white.")).toEqual([
      "My",
      "cat",
      "is",
      "black",
      "and",
      "white",
    ]);
    expect(splitWords("a book, a pen and two pencils.")).toEqual([
      "a",
      "book",
      "a",
      "pen",
      "and",
      "two",
      "pencils",
    ]);
  });

  /** "don't" เป็นคำเดียว ถ้าตัด apostrophe จะกลายเป็นสองคำที่อ่านไม่ได้ */
  it("ไม่ตัด apostrophe กลางคำ", () => {
    expect(splitWords("I don't know.")).toEqual(["I", "don't", "know"]);
  });

  it("ประโยคว่างได้ลิสต์ว่าง", () => {
    expect(splitWords("   ")).toEqual([]);
  });
});

describe("displayTokens", () => {
  /**
   * เจอตอนทดสอบในเบราว์เซอร์: ตอนแรกหน้าเกมแสดงผลด้วย splitWords
   * ประโยคจึงขึ้นจอว่า "I have a cat" ไม่มีจุด ซึ่งสอนการอ่านผิดตั้งแต่ต้น
   */
  it("เก็บเครื่องหมายวรรคตอนไว้ให้เด็กเห็น", () => {
    const tokens = displayTokens("My cat is black and white.");

    expect(tokens.map((t) => t.text).join(" ")).toBe(
      "My cat is black and white.",
    );
  });

  it("ลำดับคำตรงกับที่ splitWords ตัดได้", () => {
    const sentence = "In my bag I have a book, a pen and two pencils.";
    const tokens = displayTokens(sentence);

    expect(tokens.filter((t) => t.wordIndex !== null).length).toBe(
      splitWords(sentence).length,
    );
    expect(tokens.map((t) => t.wordIndex).filter((i) => i !== null)).toEqual(
      splitWords(sentence).map((_, index) => index),
    );
  });

  it("นับต่อจากลำดับคำที่ส่งเข้าไป เพื่อให้ไฮไลต์ตรงทั้งเรื่อง", () => {
    const tokens = displayTokens("She runs and jumps.", 10);

    expect(tokens[0].wordIndex).toBe(10);
    expect(tokens.at(-1)?.wordIndex).toBe(13);
  });

  it("โทเคนที่ไม่มีตัวอักษรเลยไม่กินลำดับคำ", () => {
    const tokens = displayTokens("I have — a cat.");
    const dash = tokens.find((t) => t.text === "—");

    expect(dash?.wordIndex).toBeNull();
    expect(tokens.filter((t) => t.wordIndex !== null).length).toBe(4);
  });

  /** ลำดับคำของทุกเรื่องต้องต่อเนื่องกันพอดี ไม่งั้นไฮไลต์เลื่อน */
  it("ลำดับคำต่อเนื่องตลอดเรื่องจริงทุกเรื่อง", () => {
    for (const reading of READINGS) {
      const indexes: number[] = [];
      let before = 0;

      for (const sentence of reading.sentences) {
        for (const token of displayTokens(sentence, before)) {
          if (token.wordIndex !== null) indexes.push(token.wordIndex);
        }
        before += splitWords(sentence).length;
      }

      expect(indexes, reading.id).toEqual(
        passageWords(reading).map((_, index) => index),
      );
    }
  });
});

describe("wordIsInLevel", () => {
  it("รับคำในคลังคำตรงตัว ไม่สนตัวพิมพ์", () => {
    expect(wordIsInLevel("cat")).toBe(true);
    expect(wordIsInLevel("Cat")).toBe(true);
  });

  it("รับรูปผันของคำในคลัง", () => {
    expect(wordIsInLevel("cats")).toBe(true);
    expect(wordIsInLevel("likes")).toBe(true);
    expect(wordIsInLevel("sleeping")).toBe(true);
    expect(wordIsInLevel("running")).toBe(true);
    expect(wordIsInLevel("studies")).toBe(true);
    expect(wordIsInLevel("washed")).toBe(true);
  });

  it("รับคำไวยากรณ์ในลิสต์", () => {
    for (const word of ["the", "is", "and", "with"]) {
      expect(wordIsInLevel(word), word).toBe(true);
    }
  });

  it("ไม่รับคำที่อยู่นอกคลังและนอกลิสต์", () => {
    expect(wordIsInLevel("delicious")).toBe(false);
    expect(wordIsInLevel("although")).toBe(false);
  });

  /**
   * ลิสต์คำไวยากรณ์คือรูที่คำใหม่จะเข้ามาได้ ถ้ามันโตขึ้นเรื่อย ๆ
   * ด่านคุมคำศัพท์ก็ไม่เหลือความหมาย
   */
  it("ลิสต์คำไวยากรณ์ยังสั้นอยู่", () => {
    expect(FUNCTION_WORDS.size).toBeLessThanOrEqual(60);
  });
});

describe("bankWordIdFor", () => {
  it("หา id ของคำในคลังได้ รวมรูปผัน", () => {
    expect(bankWordIdFor("cat")).toBe("w-cat");
    expect(bankWordIdFor("Cat")).toBe("w-cat");
    expect(bankWordIdFor("cats")).toBe("w-cat");
    expect(bankWordIdFor("sleeping")).toBe("w-sleep");
  });

  it("คำไวยากรณ์ไม่มี id จึงไม่ถูกนับเข้าความชำนาญ", () => {
    for (const word of ["the", "is", "a", "and"]) {
      expect(bankWordIdFor(word), word).toBeUndefined();
    }
  });

  it("คำนอกคลังไม่มี id", () => {
    expect(bankWordIdFor("delicious")).toBeUndefined();
  });

  /**
   * ทุกคำเนื้อหาในเรื่องต้องหา id ได้ ไม่งั้นการอ่านเรื่องนั้นจะป้อนผล
   * กลับเข้าระบบได้ไม่ครบ โดยไม่มีอะไรฟ้อง
   */
  it("คำเนื้อหาในทุกเรื่องหา id ได้ครบ", () => {
    for (const reading of READINGS) {
      for (const word of passageWords(reading)) {
        if (FUNCTION_WORDS.has(word.toLowerCase())) continue;
        expect(bankWordIdFor(word), `${reading.id}: ${word}`).toBeTruthy();
      }
    }
  });
});
