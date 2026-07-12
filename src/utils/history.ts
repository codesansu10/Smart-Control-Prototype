import type {
  ChartMetric,
  DailyAggregate,
  HistoryRecord,
  PeriodKey,
  PeriodKpis,
  ScenarioKey
} from "../types/smartcontrol";

export const chartMetrics: Array<{ key: ChartMetric; label: string; unit: string }> = [
  { key: "ph_value", label: "pH", unit: "pH" },
  { key: "temperature_c", label: "Temperature", unit: "deg C" },
  { key: "oxygen_percent", label: "Oxygen", unit: "%" },
  { key: "methane_percent", label: "Methane", unit: "%" },
  { key: "h2s_ppm", label: "H2S", unit: "ppm" },
  { key: "gas_flow_m3_h", label: "Gas flow", unit: "m3/h" },
  { key: "biogas_yield_m3_per_ton", label: "Biogas yield", unit: "m3/t" },
  { key: "pressure_bar", label: "Pressure", unit: "bar" },
  { key: "compressor_vibration_mm_s", label: "Vibration", unit: "mm/s" },
  { key: "anomaly_score", label: "Anomaly score", unit: "score" }
];

export function availableDates(records: HistoryRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.date))).sort();
}

export function selectPeriod(records: HistoryRecord[], period: PeriodKey): HistoryRecord[] {
  if (period === "all") {
    return [...records].sort(compareRecords);
  }

  const count = Number(period);
  const selectedDates = new Set(availableDates(records).slice(-count));
  return records
    .filter((record) => selectedDates.has(record.date))
    .sort(compareRecords);
}

export function compareRecords(a: HistoryRecord, b: HistoryRecord): number {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return a.measurement_id.localeCompare(b.measurement_id);
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculatePeriodKpis(records: HistoryRecord[]): PeriodKpis {
  const warningOrCriticalCount = records.filter(
    (record) => record.overall_rule_status !== "Normal"
  ).length;
  const anomalyCount = records.filter((record) => record.anomaly_flag === "Anomaly").length;

  return {
    averageMethane: average(records.map((record) => record.methane_percent)),
    averageBiogasYield: average(records.map((record) => record.biogas_yield_m3_per_ton)),
    averageGasFlow: average(records.map((record) => record.gas_flow_m3_h)),
    aiAnomalyRate: records.length ? anomalyCount / records.length : 0,
    ruleEscalationRate: records.length ? warningOrCriticalCount / records.length : 0,
    expertReviewCount: records.filter((record) => record.expert_review_required === "Yes").length,
    maintenanceOverdueCount: records.filter((record) => record.maintenance_status === "overdue").length
  };
}

export function aggregateDaily(records: HistoryRecord[]): DailyAggregate[] {
  const groups = new Map<string, HistoryRecord[]>();

  for (const record of records) {
    const group = groups.get(record.date) ?? [];
    group.push(record);
    groups.set(record.date, group);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, group]) => {
      const aggregate: DailyAggregate = {
        date,
        count: group.length,
        ph_value: average(group.map((record) => record.ph_value)),
        temperature_c: average(group.map((record) => record.temperature_c)),
        oxygen_percent: average(group.map((record) => record.oxygen_percent)),
        methane_percent: average(group.map((record) => record.methane_percent)),
        h2s_ppm: average(group.map((record) => record.h2s_ppm)),
        gas_flow_m3_h: average(group.map((record) => record.gas_flow_m3_h)),
        biogas_yield_m3_per_ton: average(group.map((record) => record.biogas_yield_m3_per_ton)),
        pressure_bar: average(group.map((record) => record.pressure_bar)),
        compressor_vibration_mm_s: average(group.map((record) => record.compressor_vibration_mm_s)),
        anomaly_score: average(group.map((record) => record.anomaly_score)),
        min: {},
        max: {}
      };

      for (const metric of chartMetrics) {
        const values = group.map((record) => record[metric.key]);
        aggregate.min[metric.key] = Math.min(...values);
        aggregate.max[metric.key] = Math.max(...values);
      }

      return aggregate;
    });
}

export function ruleBreakdown(result: {
  ph_alert: string;
  temperature_alert: string;
  oxygen_alert: string;
  methane_alert: string;
  h2s_alert: string;
  maintenance_alert: string;
}): Array<{ status: string; count: number }> {
  const counts = {
    Normal: 0,
    Warning: 0,
    Critical: 0
  };

  for (const value of [
    result.ph_alert,
    result.temperature_alert,
    result.oxygen_alert,
    result.methane_alert,
    result.h2s_alert,
    result.maintenance_alert
  ]) {
    counts[value as keyof typeof counts] += 1;
  }

  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

export function getScenarioRecord(records: HistoryRecord[], key: string): HistoryRecord | undefined {
  const scenarioIds: Partial<Record<ScenarioKey, string>> = {
    latest: "M0600",
    "ai-anomaly": "M0123",
    "rule-warning": "M0039",
    "normal-operation": "M0001",
    "critical-rule": "M0128"
  };

  const measurementId = scenarioIds[key as ScenarioKey];
  if (!measurementId) {
    return undefined;
  }

  return records.find((record) => record.measurement_id === measurementId);
}
