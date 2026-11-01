"use client";

import { useMemo, useState } from "react";

import { ChoiceTile } from "@/components/ui/choice-tile";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { WordImage } from "@/components/ui/word-image";
import { buildChoices } from "@/lib/content/distractors";
import { normalizeAnswer } from "@/lib/games/spelling";
import { skillForPictureVariant } from "@/lib/games/skills";
import { seededRandom } from "@/lib/random";
import type { AttemptDraft, PictureVariant, Word } from "@/lib/types";

import { FeedbackPanel } from "./feedback-panel";
import { LetterTiles } from "./letter-tiles";
import { useItemTimer } from "./use-item-timer";

/** 3 ตัวเลือกสำหรับคำอังกฤษ — การอ่านคำใช้เวลากว่าดูภาพ จึงให้น้อยกว่าโหมดฟัง */
const CHOICE_COUNT = 3;

type PictureGameProps = {
  itemId: string;
  word: Word;
  variant: PictureVariant;
  onComplete: (attempts: AttemptDraft[]) => void;
};

/**
 * ดูภาพแล้วเติมคำ (G4) — ตรงกับที่โจทย์ขอว่า "มีภาพประกอบและให้เติมคำให้ตรงกับในภาพ"
 *
 * มีสองโหมดย่อยไล่ตามความคุ้นของเด็กกับคำนั้น: คำที่เพิ่งเจอให้เลือกจากตัวเลือก
 * คำที่คุ้นแล้วให้สะกดเอง ภาพเดียวจึงใช้ฝึกได้ทั้งการจำคำและการเขียนคำ
 *
 * โหมดย่อยที่สาม (พูดชื่อภาพให้ระบบตรวจการออกเสียง) ต้องรอ STT ในเฟส P3
 * ยังไม่ทำในรอบนี้ — ดู docs/TASKS.md ภารกิจ T203 กับ T305
 */
export function PictureGame({
  itemId,
  word,
  variant,
  onComplete,
}: PictureGameProps) {
  const choices = useMemo(
    () =>
      variant === "choose"
        ? buildChoices(word, CHOICE_COUNT, seededRandom(itemId))
        : [],
    [variant, word, itemId],
  );

  const elapsed = useItemTimer();
  const [picked, setPicked] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptDraft | null>(null);

  function record(correct: boolean) {
    setAttempt({
      wordId: word.id,
      skill: skillForPictureVariant(variant),
      correct,
      latencyMs: elapsed(),
    });
  }

  function handlePick(wordId: string) {
    if (picked) return;
    setPicked(wordId);
    record(wordId === word.id);
  }

  function handleSpelled(value: string) {
    if (picked) return;
    setPicked(value);
    record(normalizeAnswer(value) === normalizeAnswer(word.en));
  }

  const answered = picked !== null;

  return (
    <div className="space-y-5">
      <p className="text-kid-lg text-center font-extrabold">
        {variant === "choose" ? "ภาพนี้คือคำไหน" : "สะกดคำที่เห็นในภาพ"}
      </p>

      <div className="bg-surface-2 rounded-card border-border flex flex-col items-center gap-2 border-2 py-6">
        <WordImage wordId={word.id} className="size-32" />
        <span className="sr-only">ภาพของคำว่า {word.th}</span>
        {/* คำแปลไทยเป็นคำใบ้เฉพาะโหมดสะกด เพราะโหมดเลือกคำถ้าโชว์ไทยด้วย
            เด็กจะจับคู่ไทยกับภาพแล้วเดาคำอังกฤษได้โดยไม่ต้องอ่าน */}
        {variant === "spell" ? (
          <span className="text-kid-lg text-ink font-extrabold">{word.th}</span>
        ) : null}
      </div>

      {variant === "choose" ? (
        <div className="grid gap-3">
          {choices.map((choice) => (
            <ChoiceTile
              key={choice.id}
              label={choice.en}
              className="min-h-16 flex-row"
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
      ) : (
        <>
          <div className="flex justify-center">
            <SpeakerButton text={word.en} size="md" />
          </div>
          <LetterTiles
            answer={word.en}
            seed={itemId}
            disabled={answered}
            onSubmit={handleSpelled}
          />
        </>
      )}

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
