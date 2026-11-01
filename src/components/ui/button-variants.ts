import { cva } from "class-variance-authority";

/**
 * แยก cva ออกมาไว้ในไฟล์ที่ "ไม่มี" use client โดยตั้งใจ
 *
 * เพราะอะไร: `button.tsx` เป็น client component ถ้า export ตัวนี้จากที่นั่น
 * Server Component จะเรียกใช้ไม่ได้เลย (React จะมองว่าเป็น client function)
 * แต่เราจำเป็นต้องใช้คลาสของปุ่มกับ <Link> ที่อยู่ในหน้า server ด้วย
 *
 * ปุ่มสไตล์ "กดได้จริง" — มีขอบล่างหนาแล้วยุบลงเวลากด
 * เด็กเล็กต้องเห็นว่าปุ่มตอบสนอง ไม่ใช่แค่สีเปลี่ยนจาง ๆ
 * ขนาดเล็กสุด (sm) สูง 44px ตามเกณฑ์พื้นที่แตะขั้นต่ำของ WCAG
 * แต่ละ variant กำหนด --edge ไว้ให้ utility `pressable` ใช้วาดขอบล่าง
 */
export const buttonVariants = cva(
  "pressable active:pressable-sunk inline-flex shrink-0 items-center justify-center gap-2 font-extrabold whitespace-nowrap disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
  {
    variants: {
      variant: {
        primary: "[--edge:var(--primary-edge)] bg-primary text-primary-ink",
        accent: "[--edge:var(--accent-edge)] bg-accent text-accent-ink",
        success: "[--edge:var(--success-edge)] bg-success text-success-ink",
        danger: "[--edge:var(--danger-edge)] bg-danger text-danger-ink",
        neutral:
          "[--edge:var(--border)] bg-surface text-ink border-border border-2",
        ghost:
          "[--edge:transparent] text-ink hover:bg-surface-2 bg-transparent shadow-none",
      },
      size: {
        sm: "h-11 text-kid-sm",
        md: "h-13 text-kid",
        lg: "h-16 text-kid-lg",
        xl: "h-20 text-kid-xl",
      },
      shape: {
        pill: "rounded-pill",
        tile: "rounded-tile",
      },
      square: {
        true: "aspect-square p-0",
        false: "",
      },
    },
    compoundVariants: [
      { square: false, size: "sm", class: "px-4" },
      { square: false, size: "md", class: "px-6" },
      { square: false, size: "lg", class: "px-8" },
      { square: false, size: "xl", class: "px-10" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "pill",
      square: false,
    },
  },
);
