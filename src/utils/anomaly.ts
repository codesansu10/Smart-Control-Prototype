import type { AnalysisResult } from "../types/smartcontrol";

export const deterministicRuleAlertKeys = [
  "ph_alert",
  "temperature_alert",
  "oxygen_alert",
  "methane_alert",
  "h2s_alert",
  "maintenance_alert"
] as const;

type DeterministicRuleResult = Pick<
  AnalysisResult,
  "overall_rule_status" | "anomaly_flag" | typeof deterministicRuleAlertKeys[number]
>;

export function deterministicRuleStatuses(result: DeterministicRuleResult): string[] {
  return deterministicRuleAlertKeys.map((key) => result[key]);
}

export function allDeterministicRulesNormal(result: DeterministicRuleResult): boolean {
  return result.overall_rule_status === "Normal" && deterministicRuleStatuses(result).every((status) => status === "Normal");
}

export function isAiOnlyAnomaly(result: DeterministicRuleResult): boolean {
  return allDeterministicRulesNormal(result) && result.anomaly_flag === "Anomaly";
}
