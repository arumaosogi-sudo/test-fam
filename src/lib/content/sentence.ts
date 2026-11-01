import { BLANK } from "@/lib/types";

/**
 * ประโยคตัวอย่างในคลังคำเก็บช่องว่างไว้เป็น `{}` เช่น "The {} says meow."
 * ไฟล์นี้คือที่เดียวที่รู้รูปแบบนั้น เกมเติมคำกับเกมอ่านจึงไม่ต้องไปแยกเอง
 */

export type SplitSentence = {
  /** ข้อความก่อนช่องว่าง */
  before: string;
  /** ข้อความหลังช่องว่าง */
  after: string;
};

/**
 * แยกประโยคออกเป็นสองฝั่งของช่องว่าง
 *
 * schema บังคับไว้แล้วว่าต้องมีช่องว่างพอดีหนึ่งช่อง แต่ฟังก์ชันนี้ยังรับ
 * ประโยคที่ไม่มีช่องว่างได้โดยไม่พัง (ถือว่าช่องอยู่ท้ายสุด) เพราะมันถูกเรียก
 * ตอนวาดหน้าจอ และการ throw ตอนนั้นจะทำให้ทั้งด่านจอขาวแทนที่จะเสียแค่ข้อเดียว
 */
export function splitSentence(sentence: string): SplitSentence {
  const index = sentence.indexOf(BLANK);
  if (index === -1) return { before: sentence, after: "" };

  return {
    before: sentence.slice(0, index),
    after: sentence.slice(index + BLANK.length),
  };
}

/** ประโยคเต็มที่เติมคำตอบลงช่องแล้ว ใช้ตอนอ่านออกเสียงและตอนเฉลย */
export function fillSentence(sentence: string, answer: string): string {
  const { before, after } = splitSentence(sentence);
  return `${before}${answer}${after}`;
}

/**
 * ประโยคที่อ่านให้ฟังก่อนเด็กตอบ — แทนช่องว่างด้วยการเว้นจังหวะ
 *
 * ถ้าอ่านประโยคที่มี "{}" ตรง ๆ เครื่องอ่านออกเสียงจะพูดชื่อสัญลักษณ์ออกมา
 * ส่วนการเว้นจังหวะช่วยให้เด็กรู้ว่าคำที่หายไปอยู่ตำแหน่งไหนของประโยค
 */
export function sentenceWithGap(sentence: string): string {
  return fillSentence(sentence, "…").replace(/\s+/g, " ").trim();
}
