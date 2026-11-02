"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceTile } from "@/components/ui/choice-tile";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { WordImage } from "@/components/ui/word-image";
import { buildChoices } from "@/lib/content/distractors";
import { fillSentence, sentenceWithGap, splitSentence } from "@/lib/content/sentence";
import { skillForClozeLevel } from "@/lib/games/skills";
import { checkTypedAnswer, normalizeAnswer } from "@/lib/games/spelling";
import { seededRandom } from "@/lib/random";
import type { AttemptDraft, ClozeLevel, Word } from "@/lib/types";

import { FeedbackPanel } from "./feedback-panel";
import { LetterTiles } from "./letter-tiles";
import { useItemTimer } from "./use-item-timer";

const CHOICE_COUNT = 3;

/**
 * โหมดพิมพ์เองให้แก้ได้สองครั้ง — ครั้งแรกพลาดตัวเดียวจะได้คำใบ้แล้วลองใหม่
 * ครั้งที่สองตัดสินเลย เพื่อไม่ให้กลายเป็นเดาได้ไม่จำกัดครั้ง
 */
const MAX_TYPE_TRIES = 2;

type ClozeGameProps = {
  itemId: string;
  /** ต้องมีประโยคตัวอย่าง ไม่งั้นไม่มีอะไรให้เติม — ตัวเรียกเป็นคนกรองให้ */
  word: Word & { sentence: string };
  level: ClozeLevel;
  onComplete: (attempts: AttemptDraft[]) => void;
};

export function ClozeGame({
  itemId,
  word,
  level,
  onComplete,
}: ClozeGameProps) {
  const { before, after } = useMemo(
    () => splitSentence(word.sentence),
    [word.sentence],
  );

  const choices = useMemo(
    () =>
      level === "bank"
        ? buildChoices(word, CHOICE_COUNT, seededRandom(itemId))
        : [],
    [level, word, itemId],
  );

  const elapsed = useItemTimer();
  const [answerShown, setAnswerShown] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [nearPosition, setNearPosition] = useState<number | null>(null);
  const [triesUsed, setTriesUsed] = useState(0);
  const [attempt, setAttempt] = useState<AttemptDraft | null>(null);

  function settle(shown: string, correct: boolean) {
    setAnswerShown(shown);
    setAttempt({
      wordId: word.id,
      skill: skillForClozeLevel(level),
      correct,
      latencyMs: elapsed(),
    });
  }

  function handlePick(choiceId: string, choiceEn: string) {
    if (answerShown !== null) return;
    settle(choiceEn, choiceId === word.id);
  }

  function handleSpelled(value: string) {
    if (answerShown !== null) return;
    settle(value, normalizeAnswer(value) === normalizeAnswer(word.en));
  }

  function handleTyped(event: FormEvent) {
    event.preventDefault();
    if (answerShown !== null) return;

    const verdict = checkTypedAnswer(typed, word.en);
    const tries = triesUsed + 1;
    setTriesUsed(tries);

    if (verdict.kind === "correct") {
      settle(typed, true);
      return;
    }

    // สะกดผิดตัวเดียวและยังเหลือโอกาส — บอกตำแหน่งที่พลาดแล้วให้แก้
    if (verdict.kind === "near" && tries < MAX_TYPE_TRIES) {
      setNearPosition(verdict.position);
      return;
    }

    settle(typed, false);
  }

  const answered = answerShown !== null;
  const blankText = answered ? answerShown : "_____";

  return (
    <div className="space-y-5">
      <p className="text-kid-lg text-center font-extrabold">เติมคำที่หายไป</p>

      <div className="bg-surface-2 rounded-card border-border space-y-3 border-2 p-4">
        <p className="text-kid-lg text-ink text-center font-bold">
          {before}
          <span
            className={
              answered
                ? "text-primary-edge font-extrabold underline decoration-2"
                : "text-ink-muted font-extrabold tracking-widest"
            }
          >
            {blankText}
          </span>
          {after}
        </p>

        <div className="flex items-center justify-center gap-2">
          <SpeakerButton
            text={answered ? fillSentence(word.sentence, word.en) : sentenceWithGap(word.sentence)}
            size="sm"
          />
          <span className="text-ink-muted text-kid-sm font-bold">
            ฟังประโยค
          </span>
        </div>
      </div>

      {/* คำใบ้: ภาพกับคำแปลไทยของคำที่หายไป เด็กที่อ่านประโยคไม่ออกยังเล่นได้ */}
      <div className="flex items-center justify-center gap-3">
        {word.image ? (
          <WordImage wordId={word.id} className="size-14" />
        ) : null}
        <span className="text-kid-lg font-extrabold">{word.th}</span>
      </div>

      {level === "bank" ? (
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
                    : choice.en === answerShown
                      ? "wrong"
                      : "idle"
              }
              disabled={answered}
              onClick={() => handlePick(choice.id, choice.en)}
            />
          ))}
        </div>
      ) : null}

      {level === "tiles" ? (
        <LetterTiles
          answer={word.en}
          seed={itemId}
          disabled={answered}
          onSubmit={handleSpelled}
        />
      ) : null}

      {level === "type" ? (
        <form onSubmit={handleTyped} className="space-y-3">
          <label htmlFor={`${itemId}-input`} className="sr-only">
            พิมพ์คำภาษาอังกฤษที่หายไป
          </label>
          <input
            id={`${itemId}-input`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={answered}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="พิมพ์คำตอบ"
            className="rounded-tile border-border bg-surface text-ink text-kid-lg focus:border-primary h-14 w-full border-2 px-4 text-center font-extrabold outline-none"
          />

          {nearPosition !== null && !answered ? (
            <p
              role="status"
              aria-live="polite"
              className="text-accent-edge text-kid-sm text-center font-extrabold"
            >
              ใกล้แล้ว! ตัวอักษรที่ {nearPosition} ยังไม่ถูก ลองแก้อีกครั้งนะ
            </p>
          ) : null}

          <Button
            type="submit"
            size="md"
            variant="accent"
            className="w-full"
            disabled={answered || typed.trim().length === 0}
          >
            ตรวจคำตอบ
          </Button>
        </form>
      ) : null}

      {attempt ? (
        <FeedbackPanel
          correct={attempt.correct}
          word={word}
          sentence={fillSentence(word.sentence, word.en)}
          onNext={() => onComplete([attempt])}
        />
      ) : null}
    </div>
  );
}
