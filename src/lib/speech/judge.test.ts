import { describe, expect, it } from "vitest";

import WORDS from "@/content/words.json";

import { acceptedForms, judgeSpoken } from "./judge";
import type { Heard } from "./types";

function heard(...alternatives: string[]): Heard {
  return { alternatives };
}

describe("judgeSpoken", () => {
  it("ยอมรับเมื่อถอดเสียงได้ตรงคำ", () => {
    expect(judgeSpoken(heard("cat"), "cat").kind).toBe("correct");
  });

  it("ไม่สนตัวพิมพ์ใหญ่และเครื่องหมายวรรคตอนที่ตัวถอดเสียงใส่มาเอง", () => {
    expect(judgeSpoken(heard("Cat."), "cat").kind).toBe("correct");
    expect(judgeSpoken(heard("Two?"), "two").kind).toBe("correct");
  });

  /**
   * ข้อนี้คือเหตุผลที่เราขอหลายตัวเลือกจากบริการถอดเสียง — อันดับของตัวเลือก
   * มาจากความถี่ของคำในภาษาอังกฤษ ไม่ใช่ความใกล้เคียงของเสียง
   */
  it("ยอมรับเมื่อคำที่ถูกอยู่ในตัวเลือกรอง ไม่ใช่ตัวแรก", () => {
    const verdict = judgeSpoken(heard("bet", "bat", "but"), "bat");
    expect(verdict.kind).toBe("correct");
  });

  it("ยอมรับเมื่อเด็กพูดเป็นประโยคที่มีคำเป้าหมายอยู่ข้างใน", () => {
    expect(judgeSpoken(heard("it is a cat"), "cat").kind).toBe("correct");
    expect(judgeSpoken(heard("I see a big dog"), "dog").kind).toBe("correct");
  });

  it("ยอมรับคำพ้องเสียง เพราะเด็กออกเสียงถูกแต่ระบบเดาตัวสะกดอีกคำ", () => {
    expect(judgeSpoken(heard("to"), "two").kind).toBe("correct");
    expect(judgeSpoken(heard("too"), "two").kind).toBe("correct");
    expect(judgeSpoken(heard("for"), "four").kind).toBe("correct");
    expect(judgeSpoken(heard("ate"), "eight").kind).toBe("correct");
    expect(judgeSpoken(heard("won"), "one").kind).toBe("correct");
    expect(judgeSpoken(heard("sea"), "see").kind).toBe("correct");
  });

  it("คำยาวที่เพี้ยนตัวเดียวนับว่าเกือบถูก ให้ลองใหม่ได้", () => {
    const verdict = judgeSpoken(heard("elephan"), "elephant");
    expect(verdict.kind).toBe("near");
  });

  /**
   * คำสั้นต่างกันตัวเดียวคือคนละคำไปเลย (cat/cup) จะนับว่าเกือบถูกไม่ได้
   * ไม่งั้นเด็กจะได้ผ่านโดยที่ออกเสียงสระผิดทั้งคำ
   */
  it("คำสั้นที่เพี้ยนตัวเดียวไม่นับว่าเกือบถูก", () => {
    expect(judgeSpoken(heard("cup"), "cat").kind).toBe("wrong");
  });

  it("ฟังออกเป็นคำอื่นไปเลยนับว่ายังไม่ได้", () => {
    const verdict = judgeSpoken(heard("banana"), "cat");
    expect(verdict.kind).toBe("wrong");
    expect(verdict.heard).toBe("banana");
  });

  it("ตัวเลือกว่างเปล่าไม่ทำให้พัง", () => {
    expect(judgeSpoken(heard(), "cat").kind).toBe("wrong");
    expect(judgeSpoken(heard("", "  "), "cat").kind).toBe("wrong");
  });
});

describe("acceptedForms", () => {
  it("มีคำเป้าหมายอยู่ด้วยเสมอ", () => {
    expect(acceptedForms("cat")).toContain("cat");
    expect(acceptedForms("two")).toContain("two");
  });

  /**
   * ตารางคำพ้องเสียงต้องเป็นสองทาง ไม่งั้นเด็กที่ถูกถามว่า "sea"
   * แล้วระบบได้ยิน "see" จะถูกตัดว่าผิด แต่ถ้าถามสลับข้างกลับผ่าน
   */
  it("คู่คำพ้องเสียงที่อยู่ในคลังคำทั้งคู่ ต้องยอมรับกันทั้งสองทาง", () => {
    const inBank = new Set(WORDS.map((word) => word.en));

    for (const word of WORDS) {
      for (const form of acceptedForms(word.en)) {
        if (form === word.en || !inBank.has(form)) continue;
        expect(acceptedForms(form)).toContain(word.en);
      }
    }
  });

  /**
   * read ในคลังเราเป็นกริยา /ɹid/ ไม่ใช่รูปอดีต /ɹɛd/ จึงไม่ใช่คำพ้องเสียง
   * ของ red ถ้าใส่ไว้ เด็กที่ออกเสียง red ผิดเป็น reed จะได้ผ่าน
   */
  it("ไม่จับ red กับ read เป็นคำพ้องเสียง", () => {
    expect(acceptedForms("red")).not.toContain("read");
    expect(acceptedForms("read")).not.toContain("red");
  });
});
