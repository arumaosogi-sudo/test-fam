"use client";

import { useState } from "react";

import { Milo } from "@/components/mascot/milo";
import { SpeakerButton } from "@/components/ui/speaker-button";
import type { ChatRole, LanguageError } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type ChatBubbleProps = {
  role: ChatRole;
  text: string;
  /** คำแปลไทย ซ่อนไว้จนกว่าเด็กจะกดขอ */
  textTh?: string;
  /** จุดที่เด็กพูดผิดในเทิร์นก่อนหน้า แสดงแบบชวนลองใหม่ ไม่ใช่ขีดผิด */
  errors?: LanguageError[];
};

/**
 * บับเบิลข้อความหนึ่งอัน — เป็น component ที่ไม่มี state ของบทสนทนา
 *
 * แยกออกมาจากหน้าแชทเพื่อให้เอาไปวางในหน้า styleguide พร้อมข้อมูลตัวอย่างได้
 * ซึ่งเป็นวิธีเดียวที่จะตรวจหน้าตาของทุกสถานะได้โดยไม่ต้องมี API key
 * และไม่ต้องใส่ AI ปลอมลงไปในแอปจริง
 */
export function ChatBubble({ role, text, textTh, errors }: ChatBubbleProps) {
  const [showThai, setShowThai] = useState(false);

  if (role === "child") {
    return (
      <div className="flex justify-end">
        <p className="bg-primary-soft border-primary rounded-card text-ink text-kid max-w-[85%] border-2 px-4 py-3 font-bold">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Milo state="happy" size={48} className="mt-1 shrink-0" />

      <div className="bg-surface border-border rounded-card min-w-0 flex-1 space-y-3 border-2 p-4">
        <p className="text-kid text-ink font-bold">{text}</p>

        <div className="flex flex-wrap items-center gap-2">
          <SpeakerButton text={text} size="sm" />
          <SpeakerButton text={text} slow size="sm" />

          {textTh ? (
            <button
              type="button"
              onClick={() => setShowThai((value) => !value)}
              aria-expanded={showThai}
              className="pressable active:pressable-sunk rounded-pill [--edge:var(--border)] bg-surface-2 border-border text-ink text-kid-sm ml-auto h-11 border-2 px-4 font-extrabold"
            >
              {showThai ? "ซ่อนคำแปล" : "แปลเป็นไทย"}
            </button>
          ) : null}
        </div>

        {showThai && textTh ? (
          <p className="text-ink-muted text-kid-sm border-border border-t-2 pt-3 font-bold">
            {textTh}
          </p>
        ) : null}

        {errors && errors.length > 0 ? (
          <div className="bg-accent-soft rounded-tile space-y-1 p-3">
            <p className="text-ink text-kid-sm font-extrabold">
              ลองพูดแบบนี้ดูนะ
            </p>
            {errors.map((item, index) => (
              <p key={index} className="text-ink text-kid-sm font-bold">
                <span className="line-through opacity-60">
                  {item.childSaid}
                </span>{" "}
                → {item.correct}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** บับเบิลตอน Milo กำลังคิด — เด็กต้องเห็นว่าระบบยังทำงานอยู่ ไม่ได้ค้าง */
export function ThinkingBubble({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Milo state="listening" size={48} className="shrink-0" />
      <div className="bg-surface border-border rounded-card flex gap-1.5 border-2 px-4 py-4">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="bg-ink-muted size-2.5 animate-bounce rounded-full"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
        <span className="sr-only">Milo กำลังคิดอยู่</span>
      </div>
    </div>
  );
}
