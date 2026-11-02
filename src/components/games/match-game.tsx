"use client";

import { Check, X } from "lucide-react";
import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { WordImage } from "@/components/ui/word-image";
import { shuffleDistinct } from "@/lib/random";
import { getTts } from "@/lib/speech";
import type { AttemptDraft, Word } from "@/lib/types";
import { cn } from "@/lib/utils";

type MatchGameProps = {
  /** ใช้เป็น seed ให้การสลับการ์ดคงที่ ไม่เพี้ยนตอน hydrate */
  itemId: string;
  words: Word[];
  onComplete: (attempts: AttemptDraft[]) => void;
};

type Side = "en" | "th";

type TileState = "idle" | "selected" | "matched" | "wrong";

const WRONG_FLASH_MS = 700;

const tileTone: Record<TileState, string> = {
  idle: "[--edge:var(--border)] bg-surface border-border text-ink",
  selected:
    "[--edge:var(--primary-edge)] bg-primary-soft border-primary text-ink",
  matched:
    "[--edge:var(--success-edge)] bg-success-soft border-success text-ink",
  wrong: "[--edge:var(--danger-edge)] bg-danger-soft border-danger text-ink",
};

function MatchTile({
  label,
  visual,
  state,
  onClick,
  disabled,
}: {
  label: string;
  visual?: ReactNode;
  state: TileState;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "selected"}
      className={cn(
        "pressable active:pressable-sunk rounded-tile flex min-h-16 w-full items-center justify-center gap-2 border-2 px-3 py-2 text-center font-extrabold transition-colors",
        tileTone[state],
        state === "matched" && "opacity-60",
      )}
    >
      {visual}
      <span className="text-kid-lg leading-tight">{label}</span>
      {state === "matched" ? (
        <Check
          className="text-success size-5 shrink-0"
          strokeWidth={3.5}
          aria-hidden
        />
      ) : null}
      {state === "wrong" ? (
        <X
          className="text-danger size-5 shrink-0"
          strokeWidth={3.5}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

/**
 * เกมจับคู่คำอังกฤษกับคำแปลไทย
 *
 * การนับว่า "ตอบถูก" คือจับคู่ได้โดยไม่เคยจับผิดกับคำนั้นมาก่อน
 * ไม่ใช่แค่สุดท้ายแล้วจับครบ เพราะถ้านับแบบหลัง เด็กกดมั่วจนครบก็ได้คะแนนเต็ม
 * ซึ่งจะทำให้ตารางทบทวนเข้าใจผิดว่าเด็กจำคำนั้นได้แล้ว
 *
 * เวลาที่ใช้ตอบวัดจาก event.timeStamp ของเบราว์เซอร์ ไม่ใช่ Date.now()
 * เพื่อไม่ให้ component ไปอ่านนาฬิการะหว่าง render
 */
export function MatchGame({ itemId, words, onComplete }: MatchGameProps) {
  const thaiOrder = useMemo(
    () => shuffleDistinct(words, `${itemId}-th`),
    [words, itemId],
  );

  const [selected, setSelected] = useState<{
    side: Side;
    wordId: string;
  } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongPicks, setWrongPicks] = useState<
    { side: Side; wordId: string }[]
  >([]);
  const [locked, setLocked] = useState(false);

  const mistakes = useRef<Record<string, number>>({});
  const selectedAt = useRef(0);
  const attempts = useRef<AttemptDraft[]>([]);

  function handlePick(
    event: MouseEvent<HTMLButtonElement>,
    side: Side,
    wordId: string,
  ) {
    if (locked || matched.includes(wordId)) return;

    // อ่านออกเสียงคำอังกฤษที่เด็กแตะ ให้ได้ยินเสียงควบคู่กับการเห็นคำ
    if (side === "en") {
      const word = words.find((item) => item.id === wordId);
      if (word) void getTts().speak(word.en);
    }

    // แตะใบแรก หรือเปลี่ยนใจเลือกใบอื่นในฝั่งเดิม
    if (!selected || selected.side === side) {
      const isSameTile =
        selected?.side === side && selected.wordId === wordId;

      if (isSameTile) {
        setSelected(null);
        return;
      }

      setSelected({ side, wordId });
      selectedAt.current = event.timeStamp;
      return;
    }

    const latencyMs = Math.max(0, Math.round(event.timeStamp - selectedAt.current));

    if (selected.wordId === wordId) {
      attempts.current.push({
        wordId,
        skill: "recognize",
        correct: (mistakes.current[wordId] ?? 0) === 0,
        latencyMs,
      });

      const nextMatched = [...matched, wordId];
      setMatched(nextMatched);
      setSelected(null);

      if (nextMatched.length === words.length) {
        // เรียงผลตามลำดับคำในข้อ เพื่อให้ผลลัพธ์คาดเดาได้
        const ordered = words.map(
          (word) =>
            attempts.current.find((attempt) => attempt.wordId === word.id) ?? {
              wordId: word.id,
              skill: "recognize" as const,
              correct: false,
              latencyMs: 0,
            },
        );
        onComplete(ordered);
      }
      return;
    }

    mistakes.current[selected.wordId] =
      (mistakes.current[selected.wordId] ?? 0) + 1;
    mistakes.current[wordId] = (mistakes.current[wordId] ?? 0) + 1;

    // เก็บทั้งฝั่งและคำ เพื่อไฮไลต์เฉพาะ 2 ใบที่เด็กแตะจริง
    setWrongPicks([selected, { side, wordId }]);
    setLocked(true);

    window.setTimeout(() => {
      setWrongPicks([]);
      setSelected(null);
      setLocked(false);
    }, WRONG_FLASH_MS);
  }

  function tileState(side: Side, wordId: string): TileState {
    if (matched.includes(wordId)) return "matched";
    if (
      wrongPicks.some((pick) => pick.side === side && pick.wordId === wordId)
    ) {
      return "wrong";
    }
    if (selected?.side === side && selected.wordId === wordId) {
      return "selected";
    }
    return "idle";
  }

  return (
    <div className="space-y-4">
      <p className="text-kid-lg text-center font-extrabold">
        จับคู่คำอังกฤษกับคำแปล
      </p>

      <p aria-live="polite" className="sr-only">
        จับคู่ได้แล้ว {matched.length} จาก {words.length} คู่
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {words.map((word) => (
            <MatchTile
              key={`en-${word.id}`}
              label={word.en}
              state={tileState("en", word.id)}
              disabled={locked || matched.includes(word.id)}
              onClick={(event) => handlePick(event, "en", word.id)}
            />
          ))}
        </div>

        <div className="space-y-3">
          {thaiOrder.map((word) => (
            <MatchTile
              key={`th-${word.id}`}
              label={word.th}
              visual={
                word.image ? (
                  <WordImage wordId={word.id} className="size-9" />
                ) : undefined
              }
              state={tileState("th", word.id)}
              disabled={locked || matched.includes(word.id)}
              onClick={(event) => handlePick(event, "th", word.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
