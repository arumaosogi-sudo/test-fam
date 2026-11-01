"use client";

import { useEffect } from "react";
import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  applyLessonResult,
  applyReviewResult,
  createInitialProgress,
  type LessonSummary,
  type ProgressSnapshot,
  type ReviewSummary,
} from "@/lib/progress/session";
import {
  lessonResultSchema,
  masterySchema,
  profileSchema,
  srsCardSchema,
  type Attempt,
  type AttemptDraft,
} from "@/lib/types";

/**
 * ความคืบหน้าของเด็กหนึ่งคน เก็บไว้ในเครื่อง (localStorage)
 *
 * เฟสเดโมยังไม่มีฐานข้อมูลตามข้อตัดสินใจ D3 — เมื่อถึงภารกิจ E6 จะย้ายไป
 * Supabase โดยเปลี่ยนแค่ชั้นนี้ ส่วนตรรกะการให้คะแนนอยู่ใน lib/progress
 * ซึ่งเป็นฟังก์ชันบริสุทธิ์ ไม่ต้องแก้เลย
 */

const snapshotSchema = z.object({
  profile: profileSchema,
  cards: z.record(z.string(), srsCardSchema),
  mastery: z.record(z.string(), masterySchema),
  wordDifficulty: z.record(z.string(), z.number()),
  results: z.record(z.string(), lessonResultSchema),
});

type ProgressStore = ProgressSnapshot & {
  /** อ่านค่าจาก localStorage เสร็จแล้วหรือยัง */
  hydrated: boolean;
  finishLesson: (lessonId: string, attempts: AttemptDraft[]) => LessonSummary;
  finishReview: (attempts: AttemptDraft[], dueCleared: number) => ReviewSummary;
  reset: () => void;
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...createInitialProgress(),
      hydrated: false,

      finishLesson(lessonId, drafts) {
        // ประทับเวลาที่ชั้นนี้ เพราะ component ของเกมไม่ควรไปอ่านนาฬิกาเอง
        const now = new Date();
        const attempts: Attempt[] = drafts.map((draft) => ({
          ...draft,
          at: now.toISOString(),
        }));

        const { profile, cards, mastery, wordDifficulty, results } = get();
        const { snapshot, summary } = applyLessonResult(
          { profile, cards, mastery, wordDifficulty, results },
          lessonId,
          attempts,
          now,
        );

        set(snapshot);
        return summary;
      },

      finishReview(drafts, dueCleared) {
        const now = new Date();
        const attempts: Attempt[] = drafts.map((draft) => ({
          ...draft,
          at: now.toISOString(),
        }));

        const { profile, cards, mastery, wordDifficulty, results } = get();
        const { snapshot, summary } = applyReviewResult(
          { profile, cards, mastery, wordDifficulty, results },
          attempts,
          dueCleared,
          now,
        );

        set(snapshot);
        return summary;
      },

      reset() {
        set(createInitialProgress());
      },
    }),
    {
      name: "linguakids-progress",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      /**
       * ไม่ให้ zustand อ่าน localStorage เองตอนสร้าง store
       *
       * เหตุผล: ตอนนั้นหน้าเว็บยัง render ฝั่งเซิร์ฟเวอร์อยู่ (ไม่มี localStorage)
       * และตัวแปร useProgressStore ยังประกาศไม่เสร็จ เราจึงสั่งอ่านเองใน
       * useHydrateProgress() ซึ่งทำงานบนเบราว์เซอร์หลัง mount แน่นอน
       */
      skipHydration: true,
      // เก็บเฉพาะข้อมูล ไม่เก็บฟังก์ชันหรือสถานะชั่วคราว
      partialize: (state) => ({
        profile: state.profile,
        cards: state.cards,
        mastery: state.mastery,
        wordDifficulty: state.wordDifficulty,
        results: state.results,
      }),
      /**
       * ข้อมูลใน localStorage แก้ด้วยมือได้ และอาจเป็นของเวอร์ชันเก่า
       * ถ้าโครงสร้างไม่ตรง เราเริ่มใหม่ดีกว่าปล่อยให้แอปพังตอนเด็กกำลังเล่น
       */
      merge: (persisted, current) => {
        const parsed = snapshotSchema.safeParse(persisted);
        if (!parsed.success) {
          return { ...current, ...createInitialProgress() };
        }
        return { ...current, ...parsed.data };
      },
      // ยิงทั้งกรณีที่มีข้อมูลเดิมและกรณีที่ยังไม่เคยเล่น
      onRehydrateStorage: () => () => {
        useProgressStore.setState({ hydrated: true });
      },
    },
  ),
);

/**
 * เรียกที่หน้าไหนก็ตามที่อ่านความคืบหน้า — ปลอดภัยที่จะเรียกซ้ำหลายที่
 * เพราะ rehydrate() อ่านค่าเดิมมาทับด้วยค่าเดียวกัน
 */
export function useHydrateProgress() {
  useEffect(() => {
    void useProgressStore.persist.rehydrate();
  }, []);
}

/** ใช้ใน component เพื่อรอให้อ่านค่าจากเครื่องเสร็จก่อนค่อยวาดหน้าจอ */
export function useHydrated() {
  return useProgressStore((state) => state.hydrated);
}
