import { browserRecognizer } from "./browser-stt";
import { browserTts } from "./browser-tts";
import type { SpeechRecognizer, TtsProvider } from "./types";

/**
 * จุดเดียวที่เลือกผู้ให้บริการเสียง — เวลาย้ายไปบริการคลาวด์แก้แค่ไฟล์นี้
 * (ดู docs/TASKS.md ภารกิจ T301–T302 และ docs/adr/0008-speech-recognition.md)
 */
export function getTts(): TtsProvider {
  return browserTts;
}

/**
 * ตัวถอดเสียงที่ใช้อยู่
 *
 * เบราว์เซอร์บางตัว (Firefox) ไม่มีให้เลย ผู้เรียกจึงต้องเช็ค isSupported()
 * ทุกครั้งแล้วมีทางถอย ห้ามถือว่าเกมพูดเล่นได้ทุกเครื่อง
 */
export function getRecognizer(): SpeechRecognizer {
  return browserRecognizer;
}

export * from "./hints";
export * from "./judge";
export * from "./types";
