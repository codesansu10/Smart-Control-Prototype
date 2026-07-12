import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import historyPayload from "../../public/data/dashboard-history.json";
import legacyHtml from "../../public/legacy/index.html?raw";
import appSource from "../../src/App.tsx?raw";
import type { AnalysisResult, HistoryRecord, PlantMeasurement } from "../../src/types/smartcontrol";
import { apiUrl, getStaticHistory } from "../../src/services/api";
import { getDefaultPersistedState, loadPersistedState, resetWorkflowState, savePersistedState, STORAGE_KEY } from "../../src/services/storage";
import { deterministicRuleStatuses, isAiOnlyAnomaly } from "../../src/utils/anomaly";
import { aggregateDaily, getScenarioRecord, ruleBreakdown, selectPeriod } from "../../src/utils/history";
import { measurementFromHistory, validateMeasurement } from "../../src/utils/measurements";
import { generateHtmlReport } from "../../src/utils/report";
import { getUnifiedStatus } from "../../src/utils/status";
import { Sidebar } from "../../src/components/Sidebar";
import { appendMessage, availableMonths, createAnomalyThread, createReportThread, createTextMessage, markThreadRead, monthlyStats } from "../../src/utils/workflow";

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
    expect(anomaly.ph_alert).toBe("Normal");
    expect(anomaly.temperature_alert).toBe("Normal");
    expect(anomaly.oxygen_alert).toBe("Normal");
    expect(anomaly.methane_alert).toBe("Normal");
    expect(anomaly.h2s_alert).toBe("Normal");
    expect(anomaly.maintenance_alert).toBe("Normal");
    expect(anomaly.anomaly_flag).toBe("Anomaly");
    expect(anomaly.trigger_source).toBe("Isolation Forest");
    expect(anomaly.expert_review_required).toBe("Yes");
    expect(getUnifiedStatus(anomaly)).toBe("Warning");
    expect(deterministicRuleStatuses(anomaly).every((status) => status === "Normal")).toBe(true);
    expect(isAiOnlyAnomaly(anomaly)).toBe(true);
    expect(ruleBreakdown(anomaly)).toEqual([
      { status: "Normal", count: 6 },
      { status: "Warning", count: 0 },
      { status: "Critical", count: 0 }
    ]);
  });
});

describe("role navigation and detail mode", () => {
  it("shows role-specific navigation", () => {
    const noop = vi.fn();
    const { rerender } = render(
      <Sidebar
        role="operator"
        mode="Basic"
        selectedPeriod="30"
        selectedScenario="latest"
        activeModule="dashboard"
        isAnalyzing={false}
        onModeChange={noop}
        onPeriodChange={noop}
        onScenarioChange={noop}
        onModuleChange={noop}
        onRoleChange={noop}
        onResetData={noop}
        onSignOut={noop}
      />
    );

    expect(screen.getByText("Dashboard")).not.toBeNull();
    expect(screen.queryByText("Review Queue")).toBeNull();

    rerender(
      <Sidebar
        role="expert"
        mode="Advanced"
        selectedPeriod="30"
        selectedScenario="latest"
        activeModule="review-queue"
        isAnalyzing={false}
        onModeChange={noop}
        onPeriodChange={noop}
        onScenarioChange={noop}
        onModuleChange={noop}
        onRoleChange={noop}
        onResetData={noop}
        onSignOut={noop}
      />
    );

    expect(screen.getByText("Review Queue")).not.toBeNull();
    expect(screen.queryByText("Dashboard")).toBeNull();
  });
});

describe("message and workflow utilities", () => {
  it("creates anomaly submission thread and updates status thread", () => {
    const thread = createAnomalyThread({ measurementId: "M0123", caseStatus: "Awaiting expert review", note: "Please validate" });
    expect(thread.type).toBe("anomaly");
    expect(thread.measurementId).toBe("M0123");
    expect(thread.caseStatus).toBe("Awaiting expert review");

    const status = createTextMessage({ sender: "system", body: "Case closed", kind: "status" });
    const updated = appendMessage(thread, status, "expert");
    expect(updated.messages.at(-1)?.kind).toBe("status");
    expect(updated.unreadByOperator).toBeGreaterThan(0);

    const read = markThreadRead(updated, "operator");
    expect(read.unreadByOperator).toBe(0);
  });

  it("creates report thread and month statistics", () => {
    const months = availableMonths(records);
    expect(months).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);

    const reportThread = createReportThread({ month: months.at(-1)!, reportStatus: "Awaiting expert review", note: "Please review" });
    expect(reportThread.type).toBe("monthly-report");
    expect(reportThread.reportingMonth).toBe("2026-04");

    const stats = monthlyStats(records, "2026-04");
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.averageMethane).toBeGreaterThan(0);
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

  it("includes workflow decisions and does not render anomaly scores as percentages", () => {
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
      limitations: ["A detected anomaly is not a confirmed diagnosis."],
      workflow: {
        caseStatus: "Closed",
        expertDecision: "False alarm",
        expertReply: "No anomaly confirmed",
        operatorMeasures: "Continue monitoring"
      }
    });

    expect(html).toContain("Workflow decision");
    expect(html).toContain("case_status");
    expect(html).toContain("expert_decision");
    expect(html).toContain("Signed Isolation Forest decision score");
    expect(html).not.toContain("47.6%");
    expect(html).not.toContain("940 ppm");
    expect(html).not.toContain("3 elevated values");
    expect(html).not.toContain("anomaly_score_percent");
  });
});

describe("versioned workflow persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists expected workflow preferences and resets state", () => {
    savePersistedState({
      ...getDefaultPersistedState(),
      role: "expert",
      mode: "Advanced",
      activeModule: "messages",
      selectedPeriod: "7",
      selectedChartMetric: "anomaly_score",
      selectedScenario: "ai-anomaly",
      lastCustomMeasurement: measurement(latest),
      selectedMeasurementId: "M0123"
    });

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.loading).toBeUndefined();
    expect(parsed.apiError).toBeUndefined();

    const state = loadPersistedState();
    expect(state.role).toBe("expert");
    expect(state.mode).toBe("Advanced");
    expect(state.activeModule).toBe("messages");

    const reset = resetWorkflowState();
    expect(reset.role).toBe("operator");
    expect(loadPersistedState().activeModule).toBe("dashboard");
  });
});

describe("legacy archival paths", () => {
  it("keeps root app model-backed and legacy archive available", () => {
    expect(appSource).not.toContain("47.6%");
    expect(appSource).not.toContain("940 ppm");
    expect(legacyHtml).toContain("Archived static workflow prototype");
    expect(legacyHtml).toContain("Open current model-backed dashboard");
  });
});
