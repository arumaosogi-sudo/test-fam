/**
 * สัญญากลางของทุกบริการด้านเสียง (ตาม ADR-0003)
 *
 * เหตุผลที่แยก interface ไว้ตั้งแต่ต้น: เฟสแรกเราใช้ของฟรีในเบราว์เซอร์
 * แต่สุดท้ายต้องย้ายไป Azure (หรือเจ้าอื่น) เพื่อให้คะแนนการออกเสียงระดับ
 * หน่วยเสียงได้ ถ้าไม่มีชั้นนี้ไว้ก่อน โค้ดเกมจะผูกกับ API ของเบราว์เซอร์
 * แล้วต้องรื้อทั้งแอปตอนเปลี่ยน
 */

export type SpeakOptions = {
  /** รหัสภาษา เช่น "en-US" (ค่าเริ่มต้น) หรือ "th-TH" */
  lang?: string;
  /** ความเร็ว 1 = ปกติ — สำหรับเด็กเราใช้ช้ากว่าปกติเล็กน้อย */
  rate?: number;
  /** ระดับเสียง 0–1 */
  volume?: number;
};

export interface TtsProvider {
  readonly id: string;
  /** ใช้ได้จริงบนเครื่อง/เบราว์เซอร์นี้หรือไม่ */
  isAvailable(): boolean;
  /** อ่านออกเสียง; resolve เมื่ออ่านจบหรือถูกยกเลิก */
  speak(text: string, options?: SpeakOptions): Promise<void>;
  /** หยุดที่กำลังอ่านอยู่ทันที */
  cancel(): void;
}

export type TranscriptResult = {
  text: string;
  /** 0–1 ถ้าผู้ให้บริการบอกมา */
  confidence?: number;
};

export interface SttProvider {
  readonly id: string;
  isAvailable(): boolean;
  transcribe(audio: Blob, options?: { lang?: string }): Promise<TranscriptResult>;
}

export type PhonemeScore = {
  /** สัญลักษณ์หน่วยเสียง เช่น "th", "r" */
  phoneme: string;
  /** 0–100 */
  score: number;
};

export type WordScore = {
  word: string;
  /** 0–100 */
  score: number;
  phonemes?: PhonemeScore[];
};

export type PronunciationResult = {
  /** ทุกค่า 0–100 */
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody?: number;
  words: WordScore[];
};

export interface PronunciationProvider {
  readonly id: string;
  isAvailable(): boolean;
  /** ส่งเสียงที่เด็กพูด + ประโยคที่ควรพูด เพื่อให้คะแนน */
  assess(audio: Blob, reference: string): Promise<PronunciationResult>;
}
