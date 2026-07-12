import { severityClass } from "../utils/status";
import type { Severity } from "../types/smartcontrol";

export function StatusBadge(props: { value: Severity | "Anomaly" | "Normal"; label?: string }) {
  const label = props.label ?? props.value;
  return <span className={`status-pill ${severityClass(props.value)}`}>{label}</span>;
}
