import { browserTts } from "./browser-tts";
import type { TtsProvider } from "./types";

/**
 * จุดเดียวที่เลือกผู้ให้บริการเสียง — เวลาย้ายไป Azure แก้แค่ไฟล์นี้
 * (ดู docs/TASKS.md ภารกิจ T301–T302)
 */
export function getTts(): TtsProvider {
  return browserTts;
}

export * from "./types";
