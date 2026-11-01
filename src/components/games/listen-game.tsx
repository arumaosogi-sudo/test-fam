"use client";

import { useEffect, useMemo, useState } from "react";

import { ChoiceTile } from "@/components/ui/choice-tile";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { WordImage } from "@/components/ui/word-image";
import { buildChoices } from "@/lib/content/distractors";
import { seededRandom } from "@/lib/random";
import { getTts } from "@/lib/speech";
import type { AttemptDraft, Word } from "@/lib/types";

import { FeedbackPanel } from "./feedback-panel";
import { useItemTimer } from "./use-item-timer";

/** 4 ตัวเลือก ทำให้เดาสุ่มถูกแค่ 25% และยังสแกนด้วยตาได้เร็วเพราะเป็นภาพ */
const CHOICE_COUNT = 4;

type ListenGameProps = {
  itemId: string;
  word: Word;
  onComplete: (attempts: AttemptDraft[]) => void;
};

/**
 * ฟังแล้วเลือก (G7) — ได้ยินคำอังกฤษ แล้วเลือกภาพที่ตรงกับคำนั้น
 *
 * ตัวเลือกจงใจไม่โชว์คำอังกฤษ มีแต่ภาพกับคำแปลไทย เพราะถ้าโชว์คำสะกดไว้ด้วย
 * เด็กจะใช้วิธีจับคู่ตัวอักษรที่ได้ยินกับที่เห็น แทนที่จะฟังความหมายจริง ๆ
 * ด่านนี้จึงเล่นได้แม้เด็กยังอ่านภาษาอังกฤษไม่ออกเลย ซึ่งคือทั้งเหตุผลที่มีมัน
 */
export function ListenGame({ itemId, word, onComplete }: ListenGameProps) {
  const choices = useMemo(
    () => buildChoices(word, CHOICE_COUNT, seededRandom(itemId)),
    [word, itemId],
  );

  const elapsed = useItemTimer();
  const [picked, setPicked] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptDraft | null>(null);

  // อ่านคำให้ฟังทันทีที่ข้อขึ้นจอ เด็กไม่ต้องหาปุ่มก่อนจะได้เริ่มเล่น
  useEffect(() => {
    void getTts().speak(word.en);
    return () => getTts().cancel();
  }, [word.en]);

  function handlePick(wordId: string) {
    if (picked) return;

    setPicked(wordId);
    setAttempt({
      wordId: word.id,
      skill: "listen",
      correct: wordId === word.id,
      latencyMs: elapsed(),
    });
  }

  const answered = picked !== null;

  return (
    <div className="space-y-5">
      <p className="text-kid-lg text-center font-extrabold">
        ฟังแล้วเลือกภาพที่ถูก
      </p>

      <div className="flex flex-col items-center gap-2">
        <SpeakerButton text={word.en} size="lg" />
        <div className="flex items-center gap-2">
          <SpeakerButton text={word.en} slow size="sm" />
          <span className="text-ink-muted text-kid-sm font-bold">
            ฟังแบบช้า
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice) => (
          <ChoiceTile
            key={choice.id}
            // ไม่แสดงคำอังกฤษ ให้เด็กตัดสินจากภาพและความหมาย
            label={choice.th}
            visual={<WordImage wordId={choice.id} className="size-16" />}
            state={
              !answered
                ? "idle"
                : choice.id === word.id
                  ? "correct"
                  : choice.id === picked
                    ? "wrong"
                    : "idle"
            }
            disabled={answered}
            onClick={() => handlePick(choice.id)}
          />
        ))}
      </div>

      {attempt ? (
        <FeedbackPanel
          correct={attempt.correct}
          word={word}
          onNext={() => onComplete([attempt])}
        />
      ) : null}
    </div>
  );
}
