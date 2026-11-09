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
import { serverTts } from "@/lib/speech/server-tts";

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

/** เสียงที่กำลังใช้จริงอยู่ เอาไว้บอกผู้ใช้บนหน้าจอ */
export type VoiceSource = "server" | "kokoro" | "browser";

/**
 * เสียงของ Milo มีสามทาง เรียงจากดีที่สุดลงมา และต้องถอยลงมาเองได้เสมอ
 *
 * 1. **บริการคลาวด์** ผ่าน `/api/tts` — เสียงดีที่สุด ไม่ต้องโหลดอะไร
 *    แต่ต้องตั้งคีย์ไว้ที่เซิร์ฟเวอร์ ต่อเน็ตทุกครั้ง และคิดเงินตามตัวอักษร
 * 2. **Kokoro ในเครื่อง** — ดีรองลงมา ฟรี ใช้ออฟไลน์ได้ แต่ครั้งแรกโหลด 88 MB
 *    จึงต้องให้ผู้ใช้กดเลือกเอง
 * 3. **เสียงของเบราว์เซอร์** — คุณภาพขึ้นกับเครื่อง แต่มีทุกที่และไม่ต้องรอ
 *
 * กฎที่ห้ามพัง: **เด็กต้องได้ยินเสียงตอบทุกครั้ง** ถ้าทางบนใช้ไม่ได้
 * ต้องไหลลงทางล่างเงียบ ๆ ไม่ใช่เงียบไปเฉย ๆ แล้วเด็กไม่รู้ว่าเกิดอะไรขึ้น
 */
export function useMiloVoice() {
  const useKokoro = useSyncExternalStore(
    subscribePreference,
    () => preferKokoro,
    () => false,
  );

  const [status, setStatus] = useState<KokoroStatus>(kokoroTts.status);
  const [serverReady, setServerReady] = useState(false);

  useEffect(() => kokoroTts.subscribe(setStatus), []);

  useEffect(() => {
    let alive = true;
    void serverTts.isConfigured().then((ready) => {
      if (alive) setServerReady(ready);
    });
    return () => {
      alive = false;
    };
  }, []);

  // เคยเลือกไว้แล้วก็โหลดต่อเองตอนกลับเข้าหน้า ไม่ต้องให้กดซ้ำ
  useEffect(() => {
    if (useKokoro && !serverReady) void kokoroTts.load();
  }, [useKokoro, serverReady]);

  const source: VoiceSource = serverReady
    ? "server"
    : useKokoro && status.kind === "ready"
      ? "kokoro"
      : "browser";

  const enableKokoro = useCallback(async () => {
    setPreference(true);
    await kokoroTts.load();
  }, []);

  const disableKokoro = useCallback(() => {
    setPreference(false);
    kokoroTts.cancel();
  }, []);

  const speak = useCallback(
    async (text: string, options: { slow?: boolean } = {}) => {
      const spoken = speakableText(text);
      if (spoken.length === 0) return;

      /*
       * ปิดเสียงที่ค้างอยู่ให้ครบทั้งสามทางก่อนเสมอ
       *
       * สามทางนี้เล่นคนละกลไก — คลาวด์กับ Kokoro ใช้ <audio> ส่วนเบราว์เซอร์
       * ใช้ speechSynthesis ตัวหนึ่งหยุดอีกตัวไม่ได้ ถ้าไม่ปิดให้ครบ เสียงจาก
       * ทางเก่าจะเล่นค้างทับเสียงใหม่ เจอตอน serverReady เปลี่ยนค่ากลางคัน
       * หรือเด็กกดปุ่มลำโพงระหว่างที่ Milo กำลังพูดคำตอบอยู่
       */
      serverTts.cancel();
      kokoroTts.cancel();
      getTts().cancel();

      /*
       * ปุ่มฟังช้าต้องช้าจริงทุกเสียง ไม่ใช่เฉพาะเสียงเบราว์เซอร์
       * เสียงคลาวด์กับ Kokoro ปรับด้วยความเร็วการเล่นไฟล์ ซึ่งเบราว์เซอร์
       * คงระดับเสียงไว้ให้อยู่แล้ว จึงไม่กลายเป็นเสียงทุ้มผิดธรรมชาติ
       */
      const slow = options.slow === true;

      if (source === "server") {
        await serverTts.speak(spoken, { rate: slow ? 0.6 : 1 });
        // ถ้าคีย์หายไประหว่างทาง isConfigured จะกลายเป็น false ในรอบหน้า
        return;
      }

      if (source === "kokoro") {
        await kokoroTts.speak(spoken, {
          voiceId: DEFAULT_KOKORO_VOICE,
          rate: slow ? 0.7 : 1,
        });
        return;
      }

      await getTts().speak(spoken, {
        ...MILO_VOICE,
        rate: slow ? 0.6 : MILO_VOICE.rate,
      });
    },
    [source],
  );

  const cancel = useCallback(() => {
    serverTts.cancel();
    kokoroTts.cancel();
    getTts().cancel();
  }, []);

  return {
    source,
    serverReady,
    useKokoro,
    status,
    enableKokoro,
    disableKokoro,
    speak,
    cancel,
  };
}
