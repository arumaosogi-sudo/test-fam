import { acceptedForms } from "./judge";

/**
 * วัดการอ่านออกเสียงหนึ่งเรื่อง (G6)
 *
 * **ข้อจำกัดที่กำหนดรูปของทุกอย่างในไฟล์นี้**: ตัวถอดเสียงของเบราว์เซอร์
 * คืนมาแค่ข้อความ ไม่มีเวลาของแต่ละคำ (ดู ADR-0008) เราจึง:
 *
 * - วัดความแม่นได้จริง จากการจับคู่ลำดับคำที่ได้ยินกับลำดับคำในเรื่อง
 * - วัดความเร็วได้เป็น **ค่าเฉลี่ยทั้งเรื่อง** จากนาฬิกาฝั่งเรา
 *   (คำที่อ่านถูกต่อนาที — WCPM ซึ่งเป็นหน่วยที่ใช้วัดความคล่องการอ่านจริง)
 * - **วัดไม่ได้**: หยุดตะกุกตะกักตรงไหน จังหวะการอ่าน และน้ำเสียง
 *   เพราะทั้งหมดต้องรู้เวลาของแต่ละคำ
 *
 * แยกเป็นฟังก์ชันบริสุทธิ์ทั้งหมด เพราะเป็นส่วนที่ตัดสินคะแนนของเด็ก
 * ต้องเทสได้โดยไม่ต้องมีไมค์
 */

/** มองข้ามไปข้างหน้าได้กี่คำเวลาหาคำที่ตรง */
const LOOKAHEAD = 3;

/** เวลาน้อยกว่านี้คิดความเร็วไม่ได้ (เด็กกดหยุดทันทีหรือไมค์ไม่ติด) */
const MIN_MEASURABLE_MS = 1000;

function clean(word: string): string {
  return word
    .toLowerCase()
    .replace(/[.,!?;:"“”'’]/g, "")
    .trim();
}

/** คำที่ยอมรับได้ของเป้าหมายหนึ่ง รวมคำพ้องเสียง (two/to/too) */
function accepts(target: string, spoken: string): boolean {
  const said = clean(spoken);
  if (said.length === 0) return false;
  return acceptedForms(clean(target)).includes(said);
}

export type ReadAloudProgress = {
  /** อ่านคืบไปถึงคำที่เท่าไรของเรื่อง (ใช้ไฮไลต์) */
  cursor: number;
  /** อ่านตรงกี่คำ */
  matched: number;
  /** คำในเรื่องที่ข้ามหรืออ่านไม่ตรง (ตามลำดับในเรื่อง) */
  missed: string[];
};

/**
 * จับคู่ลำดับคำที่ได้ยินกับลำดับคำในเรื่อง
 *
 * ใช้วิธีเดินหน้าอย่างเดียว (ไม่ย้อน) พร้อมมองข้ามไปข้างหน้าได้ไม่กี่คำ
 * ไม่ใช้การจับคู่ที่ดีที่สุดทั่วทั้งเรื่อง เพราะ:
 *
 * 1. การอ่านออกเสียงเป็นลำดับโดยธรรมชาติ เด็กอ่านซ้าย→ขวา การย้อนไปจับคู่
 *    คำท้ายเรื่องกับเสียงต้นเรื่องจึงให้คะแนนจากสิ่งที่ไม่ได้เกิดขึ้น
 * 2. ตัวไฮไลต์ต้องเดินหน้าอย่างเดียว ถ้าใช้การจับคู่ทั่วเรื่อง ไฮไลต์จะ
 *    กระโดดถอยหลังเวลาตัวถอดเสียงแก้ข้อความที่เดาไว้ก่อนหน้า
 *
 * การมองข้ามไปข้างหน้าทำให้ข้ามคำที่เด็กอ่านตกได้ (นับเป็นอ่านไม่ตรง)
 * และคำที่ตัวถอดเสียงแทรกมาเกินจะถูกข้ามไปเอง
 */
export function alignReading(
  passage: string[],
  spoken: string[],
): ReadAloudProgress {
  let cursor = 0;
  let matched = 0;
  const missed: string[] = [];

  for (const said of spoken) {
    if (cursor >= passage.length) break;

    for (let offset = 0; offset < LOOKAHEAD; offset += 1) {
      const index = cursor + offset;
      if (index >= passage.length) break;
      if (!accepts(passage[index], said)) continue;

      // คำที่ถูกข้ามไปนับเป็นอ่านไม่ตรง
      for (let skipped = cursor; skipped < index; skipped += 1) {
        missed.push(passage[skipped]);
      }

      matched += 1;
      cursor = index + 1;
      break;
    }
  }

  // คำที่เหลือท้ายเรื่องคืออ่านไม่ถึง
  for (let index = cursor; index < passage.length; index += 1) {
    missed.push(passage[index]);
  }

  return { cursor, matched, missed };
}

export type ReadAloudScore = ReadAloudProgress & {
  total: number;
  /** 0–1 */
  accuracy: number;
  /** คำที่อ่านถูกต่อนาที — null เมื่อเวลาน้อยเกินกว่าจะคิดได้ */
  wcpm: number | null;
};

/**
 * คะแนนรวมของการอ่านหนึ่งรอบ
 *
 * @param elapsedMs เวลาจากตอนเด็กเริ่มพูด (ไม่ใช่ตอนกดปุ่ม) ถึงตอนจบ
 *        — ถ้านับจากตอนกดปุ่ม ช่วงที่เด็กหายใจเข้าก่อนอ่านจะถูกนับเป็น
 *        เวลาอ่าน แล้วความเร็วจะต่ำกว่าจริงทุกครั้ง
 */
export function scoreReading(
  passage: string[],
  spoken: string[],
  elapsedMs: number,
): ReadAloudScore {
  const progress = alignReading(passage, spoken);
  const total = passage.length;

  const minutes = elapsedMs / 60_000;
  const measurable = elapsedMs >= MIN_MEASURABLE_MS && minutes > 0;

  return {
    ...progress,
    total,
    accuracy: total === 0 ? 0 : progress.matched / total,
    wcpm: measurable ? Math.round(progress.matched / minutes) : null,
  };
}

/**
 * ความเร็วการอ่านนี้อยู่ระดับไหน — ใช้บอกเด็กเป็นคำพูด ไม่ใช่ตัวเลขเปล่า
 *
 * เกณฑ์ตั้งจากช่วงที่ใช้กันทั่วไปของการอ่านออกเสียงภาษาอังกฤษของเด็กประถม
 * ต้นที่อ่านภาษาอังกฤษเป็นภาษาที่สอง ซึ่ง **ยังไม่มีครูภาษาไทยตรวจ**
 * และต่ำกว่าเกณฑ์ของเด็กเจ้าของภาษาโดยตั้งใจ เพราะเอาเกณฑ์เจ้าของภาษา
 * มาใช้กับเด็กที่เพิ่งเริ่มจะได้ผลว่า "ช้า" ทุกคนตลอดไป ซึ่งไม่บอกอะไรเลย
 */
export function paceLabel(wcpm: number | null): string {
  if (wcpm === null) return "สั้นเกินกว่าจะวัดความเร็ว";
  if (wcpm >= 80) return "อ่านคล่องมาก";
  if (wcpm >= 50) return "อ่านคล่องดี";
  if (wcpm >= 25) return "อ่านได้ กำลังคล่องขึ้น";
  return "อ่านช้า ๆ ได้ ไม่ต้องรีบ";
}
