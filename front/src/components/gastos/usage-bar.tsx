import { formatEur } from "@/lib/persona";

interface UsageBarSegment {
  id: string;
  value: number;
  color: string;
}

interface UsageBarProps {
  segments: UsageBarSegment[];
  total: number;
  topLeftLabel?: string;
}

export function UsageBar({ segments, total, topLeftLabel }: UsageBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{topLeftLabel}</span>
        <span>{formatEur(total)}</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-background">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.id}
              style={{
                flex: s.value,
                backgroundColor: s.color,
                minWidth: s.value > 0 ? 4 : 0,
              }}
              title={`${s.id}: ${formatEur(s.value)}`}
            />
          ))}
      </div>
    </div>
  );
}
