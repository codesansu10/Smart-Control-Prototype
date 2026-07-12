import type { AnalysisResult, Severity } from "../types/smartcontrol";

export function getUnifiedStatus(result: Pick<AnalysisResult, "overall_rule_status" | "anomaly_flag">): Severity {
  if (result.overall_rule_status === "Critical") {
    return "Critical";
  }

  if (
    result.overall_rule_status === "Warning" ||
    result.anomaly_flag === "Anomaly"
  ) {
    return "Warning";
  }

  return "Normal";
}

export function severityClass(status: Severity | "Anomaly" | "No"): string {
  if (status === "Critical" || status === "Anomaly") {
    return "severity-critical";
  }

  if (status === "Warning") {
    return "severity-warning";
  }

  return "severity-normal";
}

export function displayTriggerSource(value: string | null | undefined): string {
  return value && value.trim() ? value : "None";
}
