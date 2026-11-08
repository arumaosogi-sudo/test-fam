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
  /**
   * ความสูงของเสียง 0–2 (1 = ปกติ)
   *
   * ใช้ทำเสียงให้เป็นมิตรกับเด็ก เสียง default ของเครื่องส่วนใหญ่เป็น
   * เสียงผู้ใหญ่กลาง ๆ ซึ่งฟังเหมือนระบบประกาศมากกว่าเพื่อนเล่น
   */
  pitch?: number;
  /** อยากได้เสียงผู้หญิงถ้าเครื่องนี้มี — ใช้กับเสียงของ Milo */
  preferFemale?: boolean;
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

/**
 * ความพร้อมของการถอดเสียงบนเครื่องนี้
 *
 * แยก "ใช้ได้แต่ส่งออกนอกเครื่อง" ออกจาก "ใช้ได้ในเครื่อง" เพราะนี่คือแอปเด็ก
 * เสียงเด็กที่ถูกส่งไปเซิร์ฟเวอร์ของผู้ให้บริการเบราว์เซอร์เป็นข้อมูลส่วนบุคคล
 * ที่ผู้ปกครองควรรู้ ไม่ใช่รายละเอียดที่ซ่อนไว้ในโค้ด (ดู docs/adr/0008-speech-recognition.md)
 */
export type RecognizerAvailability =
  /** เบราว์เซอร์นี้ไม่มี API ถอดเสียงเลย */
  | "unsupported"
  /** ใช้ได้ แต่เสียงถูกส่งไปประมวลผลที่เซิร์ฟเวอร์ของเบราว์เซอร์ */
  | "cloud"
  /** ใช้ได้ และประมวลผลในเครื่อง เสียงไม่ออกไปไหน */
  | "on-device"
  /** กำลังดาวน์โหลดชุดภาษาสำหรับประมวลผลในเครื่อง */
  | "downloading";

export type Heard = {
  /**
   * ข้อความที่ถอดได้ เรียงจากที่บริการมั่นใจมากไปน้อย
   *
   * ต้องเก็บหลายตัวเลือกไม่ใช่แค่ตัวแรก เพราะเสียงเด็กและเสียงคนไทยพูดอังกฤษ
   * อยู่นอกข้อมูลที่โมเดลเหล่านี้ฝึกมา คำที่ออกเสียงถูกจึงตกไปอยู่ตัวเลือกที่
   * สองหรือสามได้บ่อย ถ้าดูแค่ตัวแรกเราจะตัดว่าเด็กพูดผิดทั้งที่พูดถูก
   */
  alternatives: string[];
  /** 0–1 ถ้าบริการบอกมา — หลายเบราว์เซอร์คืน 0 เสมอ จึงใช้ตัดสินไม่ได้ */
  confidence?: number;
};

/**
 * สาเหตุที่ฟังไม่สำเร็จ — ทุกตัวแปลว่า "ไม่รู้ว่าเด็กพูดถูกหรือผิด"
 * ไม่ใช่ "เด็กพูดผิด" ตัวเกมจึงต้องไม่บันทึกว่าตอบผิดเมื่อเจอค่าพวกนี้
 */
export type ListenFailure =
  /** ไม่ได้ยินเสียงพูดเลย */
  | "no-speech"
  /** ผู้ใช้ไม่อนุญาตให้ใช้ไมค์ */
  | "not-allowed"
  /** เปิดไมค์ไม่ได้ (ไม่มีอุปกรณ์ หรือถูกโปรแกรมอื่นยึดไว้) */
  | "audio-capture"
  /** เน็ตหลุดระหว่างส่งเสียงไปถอด */
  | "network"
  /** ถูกสั่งหยุดก่อนได้ผล */
  | "aborted"
  | "unknown";

export type ListenOutcome =
  | { kind: "heard"; heard: Heard }
  | { kind: "failed"; reason: ListenFailure };

export type ListenOptions = {
  lang?: string;
  /**
   * ฟังต่อเนื่องจนสั่งหยุด ใช้กับการอ่านทั้งเรื่อง (G6)
   *
   * โหมดคำเดียวจะปิดไมค์เองเมื่อเงียบ ซึ่งถูกสำหรับข้อพูดทีละคำ แต่ทำให้
   * การอ่านทั้งเรื่องถูกตัดกลางประโยคทุกครั้งที่เด็กหายใจ
   *
   * ในโหมดนี้ข้อความทุกช่วงที่ถอดได้จะถูกต่อกันเป็นก้อนเดียวใน
   * `alternatives[0]` เพราะเรื่องหนึ่งคือลำดับคำชุดเดียว ไม่ใช่หลายตัวเลือก
   */
  continuous?: boolean;
  /** เวลาที่ยอมให้ฟังนานสุด เรื่องยาวต้องมากกว่าคำเดียว */
  timeoutMs?: number;
  /** ข้อความที่ถอดได้ระหว่างทาง ใช้โชว์ให้เด็กเห็นว่าระบบกำลังได้ยินอะไร */
  onInterim?: (text: string) => void;
  /**
   * เด็กเริ่มเปล่งเสียงแล้ว (ไม่ใช่ตอนกดปุ่ม)
   *
   * จำเป็นสำหรับวัดความเร็วการอ่าน ถ้านับเวลาจากตอนกดปุ่ม ช่วงที่เด็ก
   * หายใจเข้าก่อนอ่านจะถูกนับเป็นเวลาอ่าน แล้วความเร็วจะต่ำกว่าจริงทุกครั้ง
   */
  onSpeechStart?: () => void;
  /** เรียกครั้งเดียวเสมอ ไม่ว่าจะสำเร็จ ล้มเหลว หรือถูกยกเลิก */
  onDone: (outcome: ListenOutcome) => void;
};

export type ListenHandle = {
  /** หยุดฟังแล้วรอผลจากเสียงเท่าที่ได้มา */
  stop(): void;
  /** เลิกฟังโดยไม่เอาผล ใช้ตอนออกจากหน้า */
  abort(): void;
};

/**
 * การถอดเสียงแบบสตรีม — ต่างจาก SttProvider ข้างบนโดยตั้งใจ
 *
 * SttProvider รับไฟล์เสียงที่อัดเสร็จแล้ว ซึ่งเข้ากับบริการคลาวด์
 * แต่ตัวถอดเสียงในเบราว์เซอร์เปิดไมค์และถอดเสียงไปพร้อมกัน ไม่เคยส่งไฟล์
 * ให้เราเลย ถ้าดัดให้เข้ารูป Blob เราต้องอัดซ้ำซ้อนอีกชุดเพื่อให้ได้ไฟล์ที่
 * ไม่มีใครใช้ ทั้งสองแบบจึงอยู่คู่กัน และ getRecognizer() เป็นคนเลือกให้
 */
export interface SpeechRecognizer {
  readonly id: string;
  /** เช็คเร็ว ๆ ว่ามี API ไหม ใช้ตอน render ได้ ไม่ async */
  isSupported(): boolean;
  /** เช็คละเอียดว่าประมวลผลในเครื่องได้หรือต้องพึ่งคลาวด์ */
  availability(lang?: string): Promise<RecognizerAvailability>;
  /** สั่งดาวน์โหลดชุดภาษาเพื่อให้ประมวลผลในเครื่องได้ */
  install?(lang?: string): Promise<boolean>;
  listen(options: ListenOptions): ListenHandle;
}
