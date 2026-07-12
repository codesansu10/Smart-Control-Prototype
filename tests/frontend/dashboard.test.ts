import { beforeEach, describe, expect, it, vi } from "vitest";
import historyPayload from "../../public/data/dashboard-history.json";
import type { AnalysisResult, HistoryRecord, PlantMeasurement } from "../../src/types/smartcontrol";
import { apiUrl, getStaticHistory } from "../../src/services/api";
import { loadPersistedState, savePersistedState, STORAGE_KEY } from "../../src/services/storage";
import { deterministicRuleStatuses, isAiOnlyAnomaly } from "../../src/utils/anomaly";
import { aggregateDaily, getScenarioRecord, ruleBreakdown, selectPeriod } from "../../src/utils/history";
import { measurementFromHistory, validateMeasurement } from "../../src/utils/measurements";
import { generateHtmlReport } from "../../src/utils/report";
import { getUnifiedStatus } from "../../src/utils/status";

const records = historyPayload.records as HistoryRecord[];
const latest = records.find((record) => record.measurement_id === "M0600")!;
const anomaly = records.find((record) => record.measurement_id === "M0123")!;

function measurement(record: HistoryRecord): PlantMeasurement {
  return measurementFromHistory(record);
}

describe("dashboard status and history logic", () => {
  it("maps unified status according to rule-first contract", () => {
    expect(getUnifiedStatus({ overall_rule_status: "Critical", anomaly_flag: "Anomaly" })).toBe("Critical");
    expect(getUnifiedStatus({ overall_rule_status: "Warning", anomaly_flag: "Normal" })).toBe("Warning");
    expect(getUnifiedStatus({ overall_rule_status: "Normal", anomaly_flag: "Anomaly" })).toBe("Warning");
    expect(getUnifiedStatus({ overall_rule_status: "Normal", anomaly_flag: "Normal" })).toBe("Normal");
  });

  it("selects last seven available dataset dates rather than calendar-relative dates", () => {
    const period = selectPeriod(records, "7");

    expect(period).toHaveLength(35);
    expect(period[0].date).toBe("2026-04-24");
    expect(period.at(-1)?.date).toBe("2026-04-30");
  });

  it("aggregates executive trends by daily mean and range", () => {
    const aggregate = aggregateDaily(selectPeriod(records, "7"));

    expect(aggregate).toHaveLength(7);
    expect(aggregate[0].count).toBe(5);
    expect(aggregate[0].min.methane_percent).toBeLessThanOrEqual(aggregate[0].methane_percent);
    expect(aggregate[0].max.methane_percent).toBeGreaterThanOrEqual(aggregate[0].methane_percent);
  });

  it("selects verified demonstration scenarios", () => {
    expect(getScenarioRecord(records, "latest")?.measurement_id).toBe("M0600");
    expect(getScenarioRecord(records, "ai-anomaly")?.measurement_id).toBe("M0123");
    expect(getScenarioRecord(records, "critical-rule")?.measurement_id).toBe("M0128");
  });

  it("keeps M0123 as an unmistakable AI-only anomaly", () => {
    expect(anomaly.overall_rule_status).toBe("Normal");
    expect(anomaly.anomaly_flag).toBe("Anomaly");
    expect(anomaly.trigger_source).toBe("Isolation Forest");
    expect(anomaly.anomaly_score).toBeGreaterThan(0);
    expect(deterministicRuleStatuses(anomaly).every((status) => status === "Normal")).toBe(true);
    expect(isAiOnlyAnomaly(anomaly)).toBe(true);
    expect(ruleBreakdown(anomaly)).toEqual([
      { status: "Normal", count: 6 },
      { status: "Warning", count: 0 },
      { status: "Critical", count: 0 }
    ]);
  });
});

describe("api and fallback utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds same-origin API URLs by default", () => {
    expect(apiUrl("/api/analyze")).toBe("/api/analyze");
  });

  it("parses static fallback history", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => historyPayload
    })));

    const payload = await getStaticHistory();

    expect(payload.records).toHaveLength(600);
    expect(payload.records.at(-1)?.measurement_id).toBe("M0600");
  });
});

describe("input validation", () => {
  it("validates feedstock, CO2, finite numeric values, and maintenance status", () => {
    const valid = measurement(latest);
    expect(validateMeasurement(valid, ["none", "recent", "overdue"])).toEqual([]);

    const invalid = {
      ...valid,
      feedstock_input_tons: 0,
      co2_percent: 0,
      ph_value: Number.NaN,
      maintenance_status: "missing"
    };

    expect(validateMeasurement(invalid, ["none", "recent", "overdue"])).toEqual(
      expect.arrayContaining([
        "feedstock_input_tons must be greater than zero",
        "co2_percent must be greater than zero",
        "ph_value must be a finite number",
        "maintenance_status must be one of: none, recent, overdue"
      ])
    );
  });
});

describe("report generation", () => {
  const kpis = {
    averageMethane: 58,
    averageBiogasYield: 9.5,
    averageGasFlow: 520,
    aiAnomalyRate: 0.01,
    ruleEscalationRate: 0.05,
    expertReviewCount: 2,
    maintenanceOverdueCount: 1
  };

  it("includes the complete API appendix and does not render scores as percentages", () => {
    const html = generateHtmlReport({
      analysis: anomaly as AnalysisResult,
      history: records.slice(0, 10),
      kpis,
      scenario: "ai-anomaly",
      periodLabel: "30 available days",
      dataSource: "Current analysis",
      context: {
        measurementId: "M0123",
        measurementDate: anomaly.date,
        plantId: anomaly.plant_id,
        scenarioLabel: "AI anomaly example",
        sourceLabel: "Historical workbook measurement submitted to live API",
        submittedAt: "2026-07-12T00:00:00.000Z"
      },
      generatedAt: "2026-07-12T00:00:00.000Z",
      limitations: ["A detected anomaly is not a confirmed diagnosis."]
    });

    expect(html).toContain("Complete API Response Appendix");
    expect(html).toContain("Current Data Context");
    expect(html).toContain("AI-only anomaly");
    expect(html).toContain("No individual deterministic rule threshold was crossed");
    expect(html).toContain("Rule-Based Status");
    expect(html).toContain("AI Anomaly");
    expect(html).toContain("Isolation Forest");
    expect(html).toContain("Signed Isolation Forest decision score");
    expect(html).toContain("threshold");
    expect(html).not.toContain("47.6%");
    expect(html).not.toContain("940 ppm");
    expect(html).not.toContain("3 elevated values");
    expect(html).not.toContain("82%");
    expect(html).not.toContain("confidence");
  });
});

describe("versioned persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists only the expected dashboard preferences", () => {
    savePersistedState({
      mode: "Advanced",
      selectedPeriod: "7",
      selectedChartMetric: "anomaly_score",
      selectedScenario: "ai-anomaly",
      lastCustomMeasurement: measurement(latest)
    });

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.loading).toBeUndefined();
    expect(parsed.apiError).toBeUndefined();

    const state = loadPersistedState();
    expect(state.mode).toBe("Advanced");
    expect(state.selectedPeriod).toBe("7");
    expect(state.selectedChartMetric).toBe("anomaly_score");
    expect(state.selectedScenario).toBe("ai-anomaly");
  });
});
