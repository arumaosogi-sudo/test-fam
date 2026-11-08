"use client";

import { Turtle, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { getTts, type SpeakOptions } from "@/lib/speech";
import { cn } from "@/lib/utils";

type SpeakerButtonProps = {
  /** ข้อความที่จะอ่านออกเสียง */
  text: string;
  lang?: string;
  /** ช้าลงสำหรับเด็กที่ต้องการฟังทีละคำ */
  slow?: boolean;
  size?: "sm" | "md" | "lg";
  /**
   * ปรับแต่งเสียงเฉพาะที่ เช่น เสียงของ Milo ในหน้าแชท
   *
   * ค่าเริ่มต้นคือเสียงอ่านคำศัพท์ที่เน้นความชัด ไม่ใช่เสียงตัวละคร
   * สองอย่างนี้ต้องต่างกัน เพราะการ์ดคำศัพท์ต้องการให้เด็กได้ยินคำชัด ๆ
   */
  voice?: SpeakOptions;
  className?: string;
};

const sizeClass = {
  sm: "size-11",
  md: "size-13",
  lg: "size-16",
} as const;

const iconClass = {
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
} as const;

/** ความพร้อมของเสียงไม่เปลี่ยนระหว่างใช้งาน จึงไม่ต้อง subscribe อะไร */
const noopSubscribe = () => () => {};

function useTtsAvailable() {
  return useSyncExternalStore(
    noopSubscribe,
    () => getTts().isAvailable(),
    // ตอน SSR ถือว่าใช้ได้ไว้ก่อน เพื่อไม่ให้ปุ่มกระพริบจาก disabled เป็น enabled
    () => true,
  );
}

/**
 * ปุ่มลำโพงที่ใช้ได้ทุกที่ในแอป
 *
 * กฎการออกแบบข้อ 1 ของโปรเจกต์: ทุกข้อความบนจอต้องกดฟังเสียงได้
 * เพราะเด็กอนุบาลยังอ่านไม่ออก ปุ่มนี้จึงต้องอยู่ข้างทุกคำศัพท์และทุกประโยค
 *
 * ปุ่มฟังช้าใช้ไอคอนเต่าแทนลำโพง เพราะหน้าจอหลายหน้าวางปุ่มฟังปกติกับ
 * ปุ่มฟังช้าไว้ติดกัน ถ้าใช้ไอคอนเดียวกันทั้งคู่ เด็กที่ยังอ่านไม่ออกจะ
 * แยกไม่ออกว่าปุ่มไหนคืออะไร (เจอตอนทดสอบหน้าเฉลย)
 */
export function SpeakerButton({
  text,
  lang = "en-US",
  slow = false,
  size = "md",
  voice,
  className,
}: SpeakerButtonProps) {
  const supported = useTtsAvailable();
  const [speaking, setSpeaking] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    // หยุดเสียงที่ค้างอยู่เมื่อผู้ใช้ออกจากหน้านี้
    return () => {
      mounted.current = false;
      getTts().cancel();
    };
  }, []);

  async function handleClick() {
    const tts = getTts();
    if (!tts.isAvailable()) return;

    setSpeaking(true);
    await tts.speak(text, {
      lang,
      ...voice,
      // ปุ่มฟังช้าต้องช้าจริงเสมอ แม้เสียงตัวละครจะตั้งความเร็วไว้แล้ว
      rate: slow ? 0.6 : (voice?.rate ?? 0.9),
    });
    // ถ้า component ถูกถอดออกไปแล้วระหว่างอ่าน ก็ไม่ต้อง setState
    if (mounted.current) setSpeaking(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!supported}
      aria-label={`${slow ? "ฟังแบบช้า" : "ฟังเสียง"}: ${text}`}
      title={supported ? undefined : "เบราว์เซอร์นี้ยังอ่านออกเสียงไม่ได้"}
      className={cn(
        "pressable active:pressable-sunk [--edge:var(--primary-edge)] bg-primary text-primary-ink inline-flex items-center justify-center rounded-full disabled:opacity-45 disabled:shadow-none",
        sizeClass[size],
        className,
      )}
    >
      {slow ? (
        <Turtle
          className={cn(iconClass[size], speaking && "animate-pulse")}
          strokeWidth={2.75}
          aria-hidden
        />
      ) : (
        <Volume2
          className={cn(iconClass[size], speaking && "animate-pulse")}
          strokeWidth={2.75}
          aria-hidden
        />
      )}
    </button>
  );
}
