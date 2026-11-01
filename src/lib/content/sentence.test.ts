import { describe, expect, it } from "vitest";

import { fillSentence, sentenceWithGap, splitSentence } from "./sentence";

describe("splitSentence", () => {
  it("แยกสองฝั่งของช่องว่าง", () => {
    expect(splitSentence("The {} says meow.")).toEqual({
      before: "The ",
      after: " says meow.",
    });
  });

  it("ช่องว่างอยู่ต้นประโยคก็ได้", () => {
    expect(splitSentence("{} is my friend.")).toEqual({
      before: "",
      after: " is my friend.",
    });
  });

  it("ประโยคที่ไม่มีช่องว่างไม่ทำให้พัง ถือว่าช่องอยู่ท้ายสุด", () => {
    // ถ้า throw ตรงนี้ ทั้งด่านจะจอขาวเพราะเนื้อหาผิดแค่คำเดียว
    expect(splitSentence("I like cats.")).toEqual({
      before: "I like cats.",
      after: "",
    });
  });
});

describe("fillSentence", () => {
  it("เติมคำตอบลงช่อง", () => {
    expect(fillSentence("The {} says meow.", "cat")).toBe("The cat says meow.");
  });

  it("คำที่มีช่องว่างในตัวก็เติมได้", () => {
    expect(fillSentence("The {} is cold.", "ice cream")).toBe(
      "The ice cream is cold.",
    );
  });
});

describe("sentenceWithGap", () => {
  it("แทนช่องว่างด้วยจุดสามจุด ไม่ปล่อยสัญลักษณ์ให้เครื่องอ่านออกเสียง", () => {
    expect(sentenceWithGap("The {} says meow.")).toBe("The … says meow.");
  });

  it("ไม่เหลือช่องว่างซ้อนเวลาช่องอยู่ติดคำ", () => {
    expect(sentenceWithGap("Count with me: one, {}, three.")).toBe(
      "Count with me: one, …, three.",
    );
  });
});
