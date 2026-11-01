import { cn } from "@/lib/utils";

type ProgressBarProps = {
  /** ค่าปัจจุบัน */
  value: number;
  /** ค่าสูงสุด */
  max?: number;
  label?: string;
  tone?: "primary" | "accent" | "success";
  className?: string;
};

const toneClass = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
} as const;

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "primary",
  className,
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 1 : max;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="text-kid-sm text-ink-muted mb-1 flex justify-between font-bold">
          <span>{label}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      ) : null}
      <div
        className="bg-surface-2 border-border h-4 w-full overflow-hidden rounded-full border-2"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? "ความคืบหน้า"}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            toneClass[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
