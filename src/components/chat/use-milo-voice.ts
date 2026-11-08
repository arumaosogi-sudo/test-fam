"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { speakableText } from "@/lib/chat/speakable";
import { MILO_VOICE } from "@/lib/chat/voice";
import { getTts } from "@/lib/speech";
import {
  DEFAULT_KOKORO_VOICE,
  kokoroTts,
  type KokoroStatus,
} from "@/lib/speech/kokoro-tts";

const STORAGE_KEY = "linguakids.milo-voice";

/*
 * เก็บความชอบไว้นอก React เพราะต้องอ่านจาก localStorage ซึ่งมีแต่ฝั่งเบราว์เซอร์
 *
 * ถ้าอ่านตอน render ตรง ๆ ฝั่งเซิร์ฟเวอร์กับฝั่งเบราว์เซอร์จะได้คนละค่า
 * และถ้า setState ในเอฟเฟกต์ก็จะ render ซ้ำโดยไม่จำเป็น (ESLint ห้ามไว้)
 * วิธีที่เหลือคือทำเป็น store เล็ก ๆ แล้วให้ React subscribe เอา
 */
let preferKokoro = false;
let loadedFromStorage = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribePreference(listener: () => void) {
  if (!loadedFromStorage) {
    loadedFromStorage = true;
    try {
      preferKokoro = window.localStorage.getItem(STORAGE_KEY) === "kokoro";
    } catch {
      // localStorage ถูกปิดอยู่ — ใช้ค่าเริ่มต้นไป ไม่ใช่เรื่องคอขาดบาดตาย
    }
    if (preferKokoro) queueMicrotask(notify);
  }

  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setPreference(next: boolean) {
  preferKokoro = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "kokoro" : "browser");
  } catch {
    // เก็บค่าไม่ได้ก็ยังใช้ได้ในรอบนี้
  }
  notify();
}

/**
 * เสียงของ Milo มีสองทาง และต้องสลับได้โดยไม่ทำให้แชทพัง
 *
 * ทางปกติคือเสียงที่ติดมากับเบราว์เซอร์ — ฟรี เร็ว ไม่ต้องโหลดอะไร
 * แต่คุณภาพขึ้นกับเครื่องและฟังเหมือนระบบประกาศ
 *
 * อีกทางคือโมเดล Kokoro ที่รันในเครื่อง เสียงเป็นธรรมชาติกว่ามาก
 * แต่ครั้งแรกต้องโหลดราว 82 MB จึง **ต้องให้ผู้ใช้กดเลือกเอง**
 * เปิดให้อัตโนมัติไม่ได้ เพราะเด็กที่ใช้เน็ตมือถืออาจเสียค่าเน็ตฟรี ๆ
 *
 * ถ้าโหลดไม่สำเร็จหรือยังโหลดไม่เสร็จ ต้องพูดด้วยเสียงเบราว์เซอร์ไปก่อนเสมอ
 * — เด็กต้องได้ยินเสียงตอบทุกครั้ง ไม่ใช่เงียบไปเพราะโมเดลยังโหลดอยู่
 */
export function useMiloVoice() {
  const useKokoro = useSyncExternalStore(
    subscribePreference,
    () => preferKokoro,
    () => false,
  );

  const [status, setStatus] = useState<KokoroStatus>(kokoroTts.status);

  useEffect(() => kokoroTts.subscribe(setStatus), []);

  // เคยเลือกไว้แล้วก็โหลดต่อเองตอนกลับเข้าหน้า ไม่ต้องให้กดซ้ำ
  useEffect(() => {
    if (useKokoro) void kokoroTts.load();
  }, [useKokoro]);

  const enableKokoro = useCallback(async () => {
    setPreference(true);
    await kokoroTts.load();
  }, []);

  const disableKokoro = useCallback(() => {
    setPreference(false);
    kokoroTts.cancel();
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const spoken = speakableText(text);
      if (spoken.length === 0) return;

      if (useKokoro && kokoroTts.status.kind === "ready") {
        await kokoroTts.speak(spoken, { voiceId: DEFAULT_KOKORO_VOICE });
        return;
      }
      await getTts().speak(spoken, MILO_VOICE);
    },
    [useKokoro],
  );

  const cancel = useCallback(() => {
    kokoroTts.cancel();
    getTts().cancel();
  }, []);

  return { useKokoro, status, enableKokoro, disableKokoro, speak, cancel };
}
