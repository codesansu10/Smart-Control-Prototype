import type { PeriodKey } from "../types/smartcontrol";

const periodLabels: Record<PeriodKey, string> = {
  "7": "Last 7 available days",
  "30": "Last 30 available days",
  all: "All history"
};

export function PeriodSelector(props: {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
  compact?: boolean;
}) {
  return (
    <div className={`segmented ${props.compact ? "segmented-compact" : ""}`} role="group" aria-label="History period">
      {(["7", "30", "all"] as const).map((period) => (
        <button key={period} type="button" className={props.value === period ? "active" : ""} onClick={() => props.onChange(period)}>
          {periodLabels[period]}
        </button>
      ))}
    </div>
  );
}
