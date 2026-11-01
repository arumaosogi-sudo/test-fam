"use client";

import { motion, type TargetAndTransition, type Transition } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Milo — มาสคอตของแอป
 *
 * มีอยู่ 4 สถานะเท่าที่เกมต้องใช้จริง:
 *   idle      รออยู่เฉย ๆ (หน้าแรก, ระหว่างอ่านโจทย์)
 *   happy     เด็กตอบถูก
 *   oops      เด็กตอบผิด — ต้องดู "เป็นห่วง" ไม่ใช่ "ผิดหวัง/ดุ"
 *              เพราะกฎข้อ 2 ของโปรเจกต์คือห้ามทำให้เด็กรู้สึกถูกลงโทษ
 *   listening กำลังฟังเด็กพูด (โหมดแชทและโหมดออกเสียง)
 *
 * วาดด้วย SVG ล้วนและใช้สีจาก design token จึงเปลี่ยนตามธีมสว่าง/มืดเอง
 */
export type MiloState = "idle" | "happy" | "oops" | "listening";

type MiloProps = {
  state?: MiloState;
  /** ความกว้างเป็น px */
  size?: number;
  className?: string;
};

const MOUTH_BY_STATE: Record<MiloState, string> = {
  // ยิ้มบาง ๆ
  idle: "M 84 132 Q 100 144 116 132",
  // อมยิ้มกว้าง ปากเปิด
  happy: "M 80 128 Q 100 152 120 128 Q 100 138 80 128",
  // ปากเล็กเบ้ ๆ
  oops: "M 88 136 Q 100 130 112 136",
  // ปากกลมเล็กแบบกำลังตั้งใจฟัง
  listening: "M 94 132 Q 100 142 106 132 Q 100 138 94 132",
};

const BODY_ANIMATION: Record<MiloState, TargetAndTransition> = {
  idle: { y: [0, -6, 0], rotate: [0, 0, 0] },
  happy: { y: [0, -16, 0], rotate: [0, -4, 4, 0] },
  oops: { y: [0, 3, 0], rotate: [0, -3, 3, 0] },
  listening: { y: [0, -3, 0], rotate: [0, 2, -2, 0] },
};

const BODY_TRANSITION: Record<MiloState, Transition> = {
  idle: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
  happy: { duration: 0.6, repeat: 1, ease: "easeOut" },
  oops: { duration: 0.5, repeat: 0, ease: "easeInOut" },
  listening: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
};

const LABEL_BY_STATE: Record<MiloState, string> = {
  idle: "Milo กำลังรออยู่",
  happy: "Milo ดีใจที่ตอบถูก",
  oops: "Milo ชวนให้ลองอีกครั้ง",
  listening: "Milo กำลังฟังคุณพูด",
};

export function Milo({ state = "idle", size = 160, className }: MiloProps) {
  const happy = state === "happy";
  const oops = state === "oops";
  const listening = state === "listening";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible", className)}
      role="img"
      aria-label={LABEL_BY_STATE[state]}
    >
      <motion.g
        animate={BODY_ANIMATION[state]}
        transition={BODY_TRANSITION[state]}
        style={{ transformOrigin: "100px 130px" }}
      >
        {/* หู */}
        <circle cx="56" cy="64" r="26" fill="var(--primary-edge)" />
        <circle cx="144" cy="64" r="26" fill="var(--primary-edge)" />
        {/* ใช้ accent แบบโปร่งแสง ไม่ใช่ accent-soft เพราะในธีมมืด
            accent-soft เป็นสีเข้มจนหูในกลืนไปกับหูนอก */}
        <circle cx="56" cy="64" r="13" fill="var(--accent)" opacity="0.6" />
        <circle cx="144" cy="64" r="13" fill="var(--accent)" opacity="0.6" />

        {/* ลำตัว */}
        <ellipse cx="100" cy="118" rx="64" ry="60" fill="var(--primary)" />

        {/* ท้องสีอ่อน ช่วยให้ตัวละครไม่ทึบเป็นก้อนเดียว */}
        <ellipse cx="100" cy="134" rx="42" ry="38" fill="var(--primary-soft)" />

        {/* ตา */}
        {oops ? (
          <>
            {/* ตาเบ้มองลง */}
            <path
              d="M 68 104 Q 78 112 88 104"
              stroke="var(--ink)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 112 104 Q 122 112 132 104"
              stroke="var(--ink)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : happy ? (
          <>
            {/* ตาหยีเป็นรูปโค้งแบบยิ้ม */}
            <path
              d="M 68 108 Q 78 96 88 108"
              stroke="var(--ink)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 112 108 Q 122 96 132 108"
              stroke="var(--ink)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <motion.g
              // กะพริบตาเป็นจังหวะ ทำให้ดูมีชีวิตโดยไม่ต้องใช้ Lottie
              animate={{ scaleY: [1, 1, 0.1, 1] }}
              transition={{
                duration: 4,
                times: [0, 0.86, 0.92, 1],
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ transformOrigin: "100px 106px" }}
            >
              <circle
                cx="78"
                cy="106"
                r={listening ? 13 : 11}
                fill="var(--ink)"
              />
              <circle
                cx="122"
                cy="106"
                r={listening ? 13 : 11}
                fill="var(--ink)"
              />
              <circle cx="82" cy="102" r="4" fill="var(--surface)" />
              <circle cx="126" cy="102" r="4" fill="var(--surface)" />
            </motion.g>
          </>
        )}

        {/* แก้มแดงเฉพาะตอนดีใจ */}
        {happy ? (
          <>
            <circle cx="62" cy="124" r="9" fill="var(--accent)" opacity="0.55" />
            <circle
              cx="138"
              cy="124"
              r="9"
              fill="var(--accent)"
              opacity="0.55"
            />
          </>
        ) : null}

        {/* ปาก */}
        <path
          d={MOUTH_BY_STATE[state]}
          stroke="var(--ink)"
          strokeWidth="5"
          strokeLinecap="round"
          fill={happy || listening ? "var(--ink)" : "none"}
        />
      </motion.g>

      {/* คลื่นเสียงตอนกำลังฟัง */}
      {listening ? (
        <g
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        >
          {[0, 1, 2].map((index) => (
            <motion.path
              key={index}
              d={`M ${172 + index * 9} ${92 - index * 6} Q ${180 + index * 9} 106 ${
                172 + index * 9
              } ${120 + index * 6}`}
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
