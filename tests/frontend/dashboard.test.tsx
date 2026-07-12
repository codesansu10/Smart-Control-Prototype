import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import historyPayload from "../../public/data/dashboard-history.json";
import legacyHtml from "../../public/legacy/index.html?raw";
import appSource from "../../src/App.tsx?raw";
import dashboardSource from "../../src/components/DashboardView.tsx?raw";
import type { AnalysisResult, HistoryRecord, PlantMeasurement } from "../../src/types/smartcontrol";
import { apiUrl, getStaticHistory } from "../../src/services/api";
import { getDefaultPersistedState, loadPersistedState, resetWorkflowState, savePersistedState, STORAGE_KEY } from "../../src/services/storage";
import { fallbackMetadata } from "../../src/utils/defaults";
import { deterministicRuleStatuses, isAiOnlyAnomaly } from "../../src/utils/anomaly";
import { aggregateDaily, getScenarioRecord, ruleBreakdown, selectPeriod } from "../../src/utils/history";
import { measurementFromHistory, validateMeasurement } from "../../src/utils/measurements";
import { generateHtmlReport } from "../../src/utils/report";
import { getUnifiedStatus } from "../../src/utils/status";
import { Sidebar } from "../../src/components/Sidebar";
import { appendMessage, availableMonths, createAnomalyThread, createReportThread, createTextMessage, markThreadRead, monthlyStats } from "../../src/utils/workflow";
import { MeasurementDrawer } from "../../src/components/MeasurementDrawer";
import { AnomalyDetectionView } from "../../src/components/AnomalyDetectionView";
import { MessagesView } from "../../src/components/MessagesView";
import { MonthlyReportView } from "../../src/components/MonthlyReportView";
import { DashboardView, DataSourceIndicator } from "../../src/components/DashboardView";
import { PlantColleague } from "../../src/components/PlantColleague";
import { ReviewQueueView } from "../../src/components/ReviewQueueView";
import { answerPlantColleague, type PlantColleagueContext } from "../../src/utils/plantColleagueResponses";

const records = historyPayload.records as HistoryRecord[];
const latest = records.find((record) => record.measurement_id === "M0600")!;
const anomaly = records.find((record) => record.measurement_id === "M0123")!;
const ruleWarning = records.find((record) => record.measurement_id === "M0039")!;
const normalOperation = records.find((record) => record.measurement_id === "M0001")!;
const critical = records.find((record) => record.measurement_id === "M0128")!;
const normal = normalOperation;

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
    expect(getScenarioRecord(records, "rule-warning")?.measurement_id).toBe("M0039");
    expect(getScenarioRecord(records, "normal-operation")?.measurement_id).toBe("M0001");
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

describe("sidebar and user menu", () => {
  it("guards Analyze Measurement and expert detail mode by role in App", () => {
    expect(appSource).toContain('const effectiveMode = workflow.role === "expert" ? "Advanced" : workflow.mode');
    expect(appSource).toContain('workflow.role === "operator"');
    expect(appSource).toContain("Analyze Measurement");
  });

  it("keeps M0039 as a rule-based warning and M0001 as normal operation", () => {
    expect(ruleWarning.overall_rule_status).toBe("Warning");
    expect(ruleWarning.anomaly_flag).toBe("Normal");
    expect(ruleWarning.trigger_source).toBe("Rule-Based");
    expect(ruleWarning.maintenance_status).toBe("overdue");
    expect(ruleWarning.maintenance_alert).toBe("Warning");
    expect(ruleWarning.expert_review_required).toBe("Yes");
    expect(ruleWarning.possible_issue_category).toBe("Equipment");
    expect(ruleWarning.anomaly_score).toBeLessThanOrEqual(0);
    expect(ruleWarning.short_explanation).toBe("Equipment condition requires maintenance review");

    expect(normalOperation.overall_rule_status).toBe("Normal");
    expect(normalOperation.anomaly_flag).toBe("Normal");
    expect(normalOperation.trigger_source).toBeNull();
    expect(normalOperation.expert_review_required).toBe("No");
    expect(normalOperation.possible_issue_category).toBeNull();
    expect(deterministicRuleStatuses(normalOperation).every((status) => status === "Normal")).toBe(true);
    expect(normalOperation.short_explanation).toBe("No alert or unusual process pattern detected");
    expect(normalOperation.recommended_action).toBe("Continue routine monitoring");
  });

  it("shows role-specific navigation only and hides period/scenario controls", () => {
    const noop = vi.fn();
    render(
      <Sidebar
        role="operator"
        mode="Basic"
        activeModule="dashboard"
        onModeChange={noop}
        onModuleChange={noop}
        onRoleChange={noop}
        onSignOut={noop}
      />
    );

    expect(screen.getByText("Dashboard")).not.toBeNull();
    expect(screen.getByText("Error Detection")).not.toBeNull();
    expect(screen.queryByText("Anomaly Detection")).toBeNull();
    expect(screen.queryByText("Period")).toBeNull();
    expect(screen.queryByText("Scenario")).toBeNull();
    expect(screen.queryByText("Detail level")).toBeNull();
  });

  it("keeps Basic and Advanced in the user menu", () => {
    const noop = vi.fn();
    render(
      <Sidebar
        role="operator"
        mode="Basic"
        activeModule="dashboard"
        onModeChange={noop}
        onModuleChange={noop}
        onRoleChange={noop}
        onSignOut={noop}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Julia User/i }));
    expect(screen.getByText("Switch user")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Basic/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Advanced/i })).not.toBeNull();
    expect(screen.queryByText("Reset prototype data")).toBeNull();
  });

  it("hides Basic and Advanced from Bernd's user menu", () => {
    const noop = vi.fn();
    render(
      <Sidebar
        role="expert"
        mode="Basic"
        activeModule="review-queue"
        onModeChange={noop}
        onModuleChange={noop}
        onRoleChange={noop}
        onSignOut={noop}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Bernd Biogas/i }));
    expect(screen.queryByText("Detail level")).toBeNull();
    expect(screen.queryByRole("button", { name: "Basic" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Advanced" })).toBeNull();
    expect(screen.queryByText("Reset prototype data")).toBeNull();
  });
});

describe("dashboard presentation", () => {
  const period = selectPeriod(records, "7");
  const dailyData = aggregateDaily(period);
  const kpis = {
    averageMethane: 58,
    averageBiogasYield: 9.5,
    averageGasFlow: 520,
    aiAnomalyRate: 0.01,
    ruleEscalationRate: 0.05,
    expertReviewCount: 2,
    maintenanceOverdueCount: 1
  };

  function renderDashboard(mode: "Basic" | "Advanced") {
    return render(
      <DashboardView
        mode={mode}
        analysis={anomaly}
        metadata={fallbackMetadata}
        dataSource="Current analysis"
        dailyData={dailyData}
        periodHistory={period}
        kpis={kpis}
        selectedMetric="methane_percent"
        setSelectedMetric={vi.fn()}
        reportHref="#"
        printReport={vi.fn()}
        caseItem={null}
        selectedPeriod="7"
        onPeriodChange={vi.fn()}
      />
    );
  }

  it("omits Current Data Context from Julia dashboard and renders Historical Trends before Operational Guidance once", () => {
    const { container } = renderDashboard("Basic");

    expect(screen.queryByText("Current Data Context")).toBeNull();
    expect(screen.queryByText("Current data context")).toBeNull();
    expect(screen.getAllByText("Historical Trends")).toHaveLength(1);
    expect(container.textContent!.indexOf("Historical Trends")).toBeLessThan(container.textContent!.indexOf("Operational Guidance"));
  });

  it("keeps Julia Basic simple and Julia Advanced technical", () => {
    const basic = renderDashboard("Basic");
    expect(screen.queryByText("Interpretation-reference diagnostics")).toBeNull();
    expect(screen.queryByText("Raw trend chart")).toBeNull();
    expect(screen.getByText("Operational Cards")).not.toBeNull();

    basic.unmount();
    renderDashboard("Advanced");
    expect(screen.getByText("Interpretation-reference diagnostics")).not.toBeNull();
    expect(screen.getByText("Isolation Forest output")).not.toBeNull();
    expect(screen.getAllByText("Historical Trends")).toHaveLength(1);
  });

  it("shows the live API connected indicator when the API is healthy", () => {
    render(<DataSourceIndicator dataSource="Live API connected" isApiConnected={true} isAnalyzeAvailable={true} />);

    expect(screen.getAllByText("Live API connected")).toHaveLength(2);
    expect(screen.queryByText("Live analysis disabled")).toBeNull();
  });
});

describe("analyze drawer and anomaly list", () => {
  it("shows exactly three verified examples and the custom form in analyze drawer", () => {
    const loadScenario = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <MeasurementDrawer
        initialMeasurement={measurement(latest)}
        metadata={{
          model_feature_names: [],
          engineered_feature_names: [],
          model_feature_names_engineered: [],
          rule_alert_names: [],
          rule_thresholds: {} as never,
          anomaly_threshold: 0,
          robust_z_score_threshold: 2.5,
          isolation_forest_contamination: 0.01,
          supported_maintenance_status_values: ["none", "recent", "overdue"],
          model_scope: "Plant_01",
          model_limitations: [],
          dataset_date_range: { start: "2026-01-01", end: "2026-04-30" },
          historical_row_count: 600
        }}
        onClose={vi.fn()}
        onSubmit={async () => {}}
        isAnalyzing={false}
        loadScenario={loadScenario}
      />
    );

    expect(container.querySelectorAll(".example-card")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "AI-only anomaly" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Rule-based warning" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Normal operation" })).not.toBeNull();
    expect(screen.getByText(/thresholds remain Normal but the Isolation Forest detects/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Latest measurement" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Critical rule example" })).toBeNull();
    expect(screen.getByText("Custom measurement")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Load AI-only anomaly" }));
    fireEvent.click(screen.getByRole("button", { name: "Load Rule-based warning" }));
    fireEvent.click(screen.getByRole("button", { name: "Load Normal operation" }));
    expect(loadScenario).toHaveBeenNthCalledWith(1, "ai-anomaly");
    expect(loadScenario).toHaveBeenNthCalledWith(2, "rule-warning");
    expect(loadScenario).toHaveBeenNthCalledWith(3, "normal-operation");
    expect(Object.keys(measurement(anomaly))).toHaveLength(19);
    expect(Object.keys(measurement(ruleWarning))).toHaveLength(19);
    expect(Object.keys(measurement(normalOperation))).toHaveLength(19);
  });

  it("defaults to needs-attention records and supports all measurements filter", () => {
    render(
      <AnomalyDetectionView
        role="operator"
        mode="Basic"
        records={[normal, anomaly, critical]}
        selectedPeriod="7"
        onPeriodChange={vi.fn()}
        selectedMeasurementId={anomaly.measurement_id}
        currentAnalysis={anomaly}
        anomalyCases={{}}
        onSelectMeasurement={vi.fn()}
        onSubmitForReview={vi.fn()}
        onSendToMessages={vi.fn()}
      />
    );

    expect(screen.queryByText(normal.measurement_id)).toBeNull();
    expect(screen.getByText(anomaly.measurement_id)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /All measurements/i }));
    expect(screen.getByText(normal.measurement_id)).not.toBeNull();
  });

  it("paginates to 10 rows and uses per-row case status", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      ...anomaly,
      measurement_id: `M9${String(index).padStart(3, "0")}`,
      date: "2026-04-30"
    }));
    const anomalyCases = {
      [items[0].measurement_id]: {
        measurementId: items[0].measurement_id,
        note: "",
        status: "Awaiting expert review" as const,
        expertDecision: null,
        expertReply: "",
        operatorMeasures: "",
        conversationId: null,
        updatedAt: new Date().toISOString()
      },
      [items[1].measurement_id]: {
        measurementId: items[1].measurement_id,
        note: "",
        status: "False alarm" as const,
        expertDecision: "False alarm" as const,
        expertReply: "",
        operatorMeasures: "",
        conversationId: null,
        updatedAt: new Date().toISOString()
      }
    };

    render(
      <AnomalyDetectionView
        role="operator"
        mode="Basic"
        records={items}
        selectedPeriod="7"
        onPeriodChange={vi.fn()}
        selectedMeasurementId={items[0].measurement_id}
        currentAnalysis={anomaly}
        anomalyCases={anomalyCases}
        onSelectMeasurement={vi.fn()}
        onSubmitForReview={vi.fn()}
        onSendToMessages={vi.fn()}
      />
    );

    expect(screen.getByText("Showing 1-10 of 12 attention records")).not.toBeNull();
    expect(screen.getByText("Page 1 of 2")).not.toBeNull();
    expect(screen.queryByText(items[10].measurement_id)).toBeNull();
    expect(screen.getAllByText("Awaiting expert review").length).toBeGreaterThan(0);
    expect(screen.getByText("False alarm")).not.toBeNull();
  });

  it("shows row-specific compact details in Basic and expert diagnostics for Bernd", () => {
    const basic = render(
      <AnomalyDetectionView
        role="operator"
        mode="Basic"
        records={[anomaly, ruleWarning]}
        selectedPeriod="7"
        onPeriodChange={vi.fn()}
        selectedMeasurementId={normalOperation.measurement_id}
        currentAnalysis={normalOperation}
        anomalyCases={{}}
        onSelectMeasurement={vi.fn()}
        onSubmitForReview={vi.fn()}
        onSendToMessages={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Details" })[1]);
    expect(screen.getAllByText(ruleWarning.short_explanation).length).toBeGreaterThan(0);
    expect(screen.getAllByText(ruleWarning.recommended_action).length).toBeGreaterThan(0);
    expect(screen.getByText(/Measurement ID:/)).not.toBeNull();
    expect(screen.getByText(/Date:/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Hide details" })).not.toBeNull();
    expect(screen.queryByText(/Raw signed anomaly score:/)).toBeNull();

    basic.unmount();
    render(
      <AnomalyDetectionView
        role="expert"
        mode="Advanced"
        records={[anomaly]}
        selectedPeriod="7"
        onPeriodChange={vi.fn()}
        selectedMeasurementId={anomaly.measurement_id}
        currentAnalysis={anomaly}
        anomalyCases={{}}
        onSelectMeasurement={vi.fn()}
        onSubmitForReview={vi.fn()}
        onSendToMessages={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByText(/Raw signed anomaly score:/)).not.toBeNull();
    expect(screen.getByText(/Biogas yield:/)).not.toBeNull();
    expect(screen.getByText(/Methane-to-CO2 ratio:/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Submit for expert review/i })).toBeNull();
  });

  it("keeps Details correct after pagination and filter changes", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      ...anomaly,
      measurement_id: `M8${String(index).padStart(3, "0")}`,
      date: "2026-04-30",
      short_explanation: `Pagination explanation ${index}`,
      recommended_action: `Pagination action ${index}`
    }));

    render(
      <AnomalyDetectionView
        role="operator"
        mode="Basic"
        records={items}
        selectedPeriod="7"
        onPeriodChange={vi.fn()}
        selectedMeasurementId={items[0].measurement_id}
        currentAnalysis={items[0]}
        anomalyCases={{}}
        onSelectMeasurement={vi.fn()}
        onSubmitForReview={vi.fn()}
        onSendToMessages={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Details" })[0]);
    expect(screen.getAllByText("Pagination explanation 0").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Details" })[0]);
    expect(screen.getByText("Pagination explanation 10")).not.toBeNull();
  });

  it("shows Details for rule-filtered rows without requiring Select", () => {
    render(
      <AnomalyDetectionView
        role="expert"
        mode="Advanced"
        records={[normalOperation, anomaly, ruleWarning]}
        selectedPeriod="7"
        onPeriodChange={vi.fn()}
        selectedMeasurementId={anomaly.measurement_id}
        currentAnalysis={anomaly}
        anomalyCases={{}}
        onSelectMeasurement={vi.fn()}
        onSubmitForReview={vi.fn()}
        onSendToMessages={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Rule alerts" }));
    expect(screen.getByText(ruleWarning.measurement_id)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByText(ruleWarning.short_explanation)).not.toBeNull();
    expect(screen.getByText(ruleWarning.recommended_action)).not.toBeNull();
  });
});

describe("messages and monthly report focus", () => {
  it("Review Queue Open uses the exact selected measurement", () => {
    const onOpenCase = vi.fn();
    render(
      <ReviewQueueView
        cases={[
          {
            caseItem: {
              measurementId: "M0123",
              note: "Please validate",
              status: "Awaiting expert review",
              expertDecision: null,
              expertReply: "",
              operatorMeasures: "",
              conversationId: null,
              updatedAt: "2026-07-12T00:00:00.000Z"
            },
            record: anomaly
          }
        ]}
        onOpenCase={onOpenCase}
      />
    );

    expect(screen.getByText(anomaly.date)).not.toBeNull();
    expect(screen.getByText(anomaly.anomaly_flag)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenCase).toHaveBeenCalledWith("M0123");
  });

  it("messages view does not show period/scenario controls", () => {
    render(
      <MessagesView
        role="operator"
        threads={[]}
        activeThreadId={null}
        onSelectThread={vi.fn()}
        onSendMessage={vi.fn()}
        onCreateThread={vi.fn()}
      />
    );

    expect(screen.getAllByText("No conversations yet").length).toBeGreaterThan(0);
    expect(screen.queryByText("Period")).toBeNull();
    expect(screen.queryByText("Scenario")).toBeNull();
  });

  it("rejects blank conversation subjects and blank messages", () => {
    const thread = createAnomalyThread({ measurementId: "M0123", caseStatus: "Awaiting expert review", note: "Please validate" });
    render(
      <MessagesView
        role="operator"
        threads={[thread]}
        activeThreadId={thread.id}
        onSelectThread={vi.fn()}
        onSendMessage={vi.fn()}
        onCreateThread={vi.fn()}
      />
    );

    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Send/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("monthly report shows aggregated monthly summary", () => {
    render(
      <MonthlyReportView
        role="operator"
        records={records}
        availableMonths={["2026-04"]}
        selectedMonth="2026-04"
        report={null}
        onSelectMonth={vi.fn()}
        onGenerate={vi.fn()}
        onSaveReport={vi.fn()}
        onSendForReview={vi.fn()}
        onApprove={vi.fn()}
        onRequestChanges={vi.fn()}
      />
    );

    expect(screen.getByText("Total measurements")).not.toBeNull();
    expect(screen.getByText("Issue-category breakdown")).not.toBeNull();
    expect(screen.getByText("Trigger-source breakdown")).not.toBeNull();
    expect(screen.getByText("Important anomaly list")).not.toBeNull();
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

  it("persists message threads through shared local workflow state", () => {
    window.localStorage.clear();
    const thread = appendMessage(
      createAnomalyThread({ measurementId: "M0123", caseStatus: "Awaiting expert review", note: "Julia note" }),
      createTextMessage({ sender: "bernd", body: "Please continue monitoring." }),
      "expert"
    );

    savePersistedState({
      ...getDefaultPersistedState(),
      messageThreads: [thread],
      activeModule: "messages"
    });

    const restored = loadPersistedState();
    expect(restored.messageThreads[0].messages.at(-1)?.sender).toBe("bernd");
    expect(restored.messageThreads[0].messages.at(-1)?.body).toBe("Please continue monitoring.");
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
    expect(stats.importantRecords.length).toBeLessThanOrEqual(10);
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

describe("Plant Colleague", () => {
  const kpis = {
    averageMethane: 58,
    averageBiogasYield: 9.5,
    averageGasFlow: 520,
    aiAnomalyRate: 0.01,
    ruleEscalationRate: 0.05,
    expertReviewCount: 2,
    maintenanceOverdueCount: 1
  };

  function assistantContext(analysis: HistoryRecord = anomaly, measurementId = analysis.measurement_id, role: "operator" | "expert" = "operator"): PlantColleagueContext {
    return {
      role,
      activeModule: role === "expert" ? "review-queue" : "dashboard",
      currentAnalysis: analysis,
      selectedMeasurementId: measurementId,
      historyRecords: records,
      periodHistory: selectPeriod(records, "30"),
      kpis,
      anomalyCases: {
        M0123: {
          measurementId: "M0123",
          note: "Please validate this unusual relationship.",
          status: "Awaiting expert review",
          expertDecision: null,
          expertReply: "",
          operatorMeasures: "",
          conversationId: null,
          updatedAt: "2026-07-12T00:00:00.000Z"
        }
      },
      monthlyReports: {},
      selectedMonth: "2026-04",
      messageThreads: [],
      dataSource: "Current analysis",
      isApiConnected: true,
      isAnalyzeAvailable: true
    };
  }

  function renderAssistant(role: "operator" | "expert" = "operator") {
    const context = assistantContext(anomaly, "M0123", role);
    return render(
      <PlantColleague
        role={context.role}
        activeModule={context.activeModule}
        currentAnalysis={context.currentAnalysis}
        selectedMeasurementId={context.selectedMeasurementId}
        historyRecords={context.historyRecords}
        periodHistory={context.periodHistory}
        kpis={context.kpis}
        anomalyCases={context.anomalyCases}
        monthlyReports={context.monthlyReports}
        selectedMonth={context.selectedMonth}
        messageThreads={context.messageThreads}
        dataSource={context.dataSource}
        isApiConnected={context.isApiConnected}
        isAnalyzeAvailable={context.isAnalyzeAvailable}
      />
    );
  }

  it("opens, answers from current state, and avoids external AI calls", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderAssistant("operator");

    fireEvent.click(screen.getByRole("button", { name: "Open Plant Colleague" }));
    expect(screen.getByRole("heading", { name: "Plant Colleague" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "What is the current plant status?" }));

    expect(screen.getByText(/Current plant status is Warning/)).not.toBeNull();
    expect(document.body.textContent).not.toContain("Latest measurement");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("changes prompts and answers for Bernd's review role", () => {
    renderAssistant("expert");

    fireEvent.click(screen.getByRole("button", { name: "Open Plant Colleague" }));
    fireEvent.click(screen.getByRole("button", { name: "How many cases are awaiting review?" }));

    expect(screen.getByText(/1 case is awaiting review/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "What should I send to the expert?" })).toBeNull();
  });

  it("explains AI-only, rule-based, normal, and selected outcomes locally", () => {
    expect(answerPlantColleague("What is an AI-only anomaly?", assistantContext())).toContain("all monitored rules are Normal");
    expect(answerPlantColleague("What is a rule-based warning?", assistantContext(ruleWarning))).toContain("defined operating or maintenance threshold");
    expect(answerPlantColleague("What does Normal operation mean?", assistantContext(normalOperation))).toContain("routine monitoring can continue");
    expect(answerPlantColleague("What is the difference between AI anomaly and rule alert?", assistantContext())).toContain("deterministic thresholds");
    expect(answerPlantColleague("Explain the selected result.", assistantContext(ruleWarning))).toContain("rule-based warning");
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
        scenarioLabel: "AI-only anomaly",
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
    expect(html).toContain("Case status");
    expect(html).toContain("Expert decision");
    expect(html).toContain("Executive Summary");
    expect(html).toContain("Model Limitations");
    expect(html).toContain("Signed Isolation Forest decision score");
    expect(html).not.toContain("Complete API Response Appendix");
    expect(html).not.toContain("<pre>");
    expect(html).not.toContain("JSON.stringify");
    expect(html).not.toContain("47.6%");
    expect(html).not.toContain("940 ppm");
    expect(html).not.toContain("3 elevated values");
    expect(html).not.toContain("anomaly_score_percent");
    expect(html).not.toContain("Latest measurement");
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
    expect(state.selectedPeriod).toBe("7");

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
    expect(dashboardSource).not.toContain("<table>");
  });
});
