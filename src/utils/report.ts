import type { AnalysisContext, AnalysisResult, HistoryRecord, PeriodKpis, ScenarioKey } from "../types/smartcontrol";
import { isAiOnlyAnomaly } from "./anomaly";
import { compactNumber, numberFormat, percent } from "./format";
import { getUnifiedStatus } from "./status";
import { measurementFields } from "./measurements";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowsFromObject(value: Record<string, unknown>): string {
  return Object.entries(value)
    .map(([key, item]) => `<tr><th>${escapeHtml(reportLabel(key))}</th><td>${escapeHtml(item)}</td></tr>`)
    .join("");
}

function reportLabel(key: string): string {
  const labels: Record<string, string> = {
    measurement_id: "Measurement ID",
    measurement_date: "Measurement date",
    plant_id: "Plant",
    scenario_label: "Scenario",
    submitted_at: "Submitted at",
    possible_issue_category: "Possible issue category",
    short_explanation: "Explanation",
    recommended_action: "Recommended action",
    expert_review_required: "Expert review required",
    trigger_source: "Trigger source",
    anomaly_flag: "AI anomaly status",
    case_status: "Case status",
    expert_decision: "Expert decision",
    expert_reply: "Expert reply",
    operator_measures: "Operator measures",
    average_methane_percent: "Average methane",
    average_biogas_yield_m3_per_ton: "Average biogas yield",
    average_gas_flow_m3_h: "Average gas flow",
    ai_anomaly_rate: "AI anomaly rate",
    warning_critical_rule_rate: "Warning or critical rule rate",
    expert_review_count: "Expert-review count",
    maintenance_overdue_count: "Maintenance overdue count",
    biogas_yield_m3_per_ton: "Biogas yield",
    methane_to_co2_ratio: "Methane to CO2 ratio",
    raw_anomaly_score: "Raw anomaly score",
    distance_above_threshold: "Distance above threshold",
    expected_gas_flow_m3_h: "Expected gas flow",
    actual_gas_flow_m3_h: "Actual gas flow",
    gas_flow_residual_m3_h: "Gas-flow residual",
    robust_z_threshold: "Robust z-score threshold"
  };

  if (labels[key]) {
    return labels[key];
  }

  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scenarioLabel(scenario: ScenarioKey): string {
  if (scenario === "latest") return "Current measurement";
  if (scenario === "critical-rule") return "Critical rule record";
  if (scenario === "ai-anomaly") return "AI anomaly example";
  return "Custom measurement";
}

export function generateHtmlReport(args: {
  analysis: AnalysisResult;
  history: HistoryRecord[];
  kpis: PeriodKpis;
  scenario: ScenarioKey;
  periodLabel: string;
  dataSource: string;
  context?: AnalysisContext | null;
  generatedAt: string;
  limitations: string[];
  workflow?: {
    caseStatus: string;
    expertDecision: string;
    expertReply: string;
    operatorMeasures: string;
  };
}): string {
  const { analysis, context, history, kpis, scenario, periodLabel, dataSource, generatedAt, limitations, workflow } = args;
  const unifiedStatus = getUnifiedStatus(analysis);
  const diagnostics = analysis.diagnostics;
  const anomalyThreshold = diagnostics?.anomaly_threshold ?? 0;
  const aiOnly = isAiOnlyAnomaly(analysis);
  const recentRows = history.slice(-15);

  const inputRows = measurementFields
    .map((field) => {
      const value = analysis[field.key];
      return `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(value)}</td><td>${escapeHtml(field.unit || "Context")}</td></tr>`;
    })
    .join("");

  const ruleRows = [
    ["pH", analysis.ph_alert],
    ["Temperature", analysis.temperature_alert],
    ["Oxygen", analysis.oxygen_alert],
    ["Methane", analysis.methane_alert],
    ["H2S", analysis.h2s_alert],
    ["Maintenance", analysis.maintenance_alert]
  ]
    .map(([name, status]) => `<tr><th>${escapeHtml(name)}</th><td>${escapeHtml(status)}</td></tr>`)
    .join("");

  const robustRows = diagnostics
    ? Object.entries(diagnostics.robust_metrics)
        .map(([name, metric]) => (
          `<tr><th>${escapeHtml(reportLabel(name))}</th><td>${numberFormat(metric.value, 3)}</td><td>${numberFormat(metric.median, 3)}</td><td>${numberFormat(metric.mad, 3)}</td><td>${numberFormat(metric.robust_z_score, 3)}</td><td>${escapeHtml(metric.deviation)}</td></tr>`
        ))
        .join("")
    : "";

  const historyRows = recentRows
    .map((record) => (
      `<tr><td>${escapeHtml(record.measurement_id)}</td><td>${escapeHtml(record.date)}</td><td>${escapeHtml(record.overall_rule_status)}</td><td>${escapeHtml(record.anomaly_flag)}</td><td>${numberFormat(record.anomaly_score, 4)}</td></tr>`
    ))
    .join("");

  const contextRows = context ? rowsFromObject({
    measurement_id: context.measurementId,
    measurement_date: context.measurementDate,
    plant_id: context.plantId,
    scenario_label: context.scenarioLabel,
    source: context.sourceLabel,
    submitted_at: context.submittedAt
  }) : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SMARTCONTROL 2.0 Report</title>
  <style>
    body{font-family:Mulish,Arial,sans-serif;margin:0;color:#20292d;background:#f6f8f9}
    main{max-width:1080px;margin:0 auto;padding:28px}
    header{border-bottom:4px solid #008eca;padding-bottom:18px;margin-bottom:22px}
    img{height:42px}
    h1,h2{margin:12px 0;color:#12323d}
    section{background:#fff;border:1px solid #dde4e6;border-radius:8px;padding:18px;margin:14px 0}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{border-bottom:1px solid #e7ecee;text-align:left;padding:8px;vertical-align:top}
    th{color:#4f5e63;width:30%}
    .status{display:inline-block;border-radius:99px;padding:4px 10px;font-weight:700}
    .Normal{background:#e4f7ed;color:#0f6b3b}.Warning{background:#fff4d7;color:#8a5a00}.Critical{background:#fde8e5;color:#9d1f16}
    .callout{background:#fff9e9;border-color:#eedaa8;color:#513a04}
    @media print{body{background:#fff}main{max-width:none;padding:0}section{break-inside:avoid}}
  </style>
</head>
<body>
  <main>
    <header>
      <img src="./assets/logo-oekobit.png" alt="OEKOBIT">
      <h1>SMARTCONTROL 2.0 Report</h1>
      <p>Plant ID: Plant_01 | Scenario: ${escapeHtml(scenarioLabel(scenario))} | Period: ${escapeHtml(periodLabel)} | Generated: ${escapeHtml(generatedAt)} | Data source: ${escapeHtml(dataSource)}</p>
    </header>
    <section>
      <h2>Executive Summary</h2>
      <p><span class="status ${unifiedStatus}">${unifiedStatus}</span></p>
      <table>${rowsFromObject({
        "Rule-Based Status": analysis.overall_rule_status,
        "AI Anomaly": analysis.anomaly_flag,
        possible_issue_category: analysis.possible_issue_category ?? "None",
        short_explanation: analysis.short_explanation,
        recommended_action: analysis.recommended_action,
        expert_review_required: analysis.expert_review_required,
        trigger_source: analysis.trigger_source ?? "None",
        case_status: workflow?.caseStatus ?? "Open",
        expert_decision: workflow?.expertDecision ?? "Pending"
      })}</table>
    </section>
    ${workflow ? `<section><h2>Workflow decision</h2><table>${rowsFromObject({
      case_status: workflow.caseStatus,
      expert_decision: workflow.expertDecision,
      expert_reply: workflow.expertReply || "None",
      operator_measures: workflow.operatorMeasures || "None"
    })}</table></section>` : ""}
    ${contextRows ? `<section><h2>Current Data Context</h2><table>${contextRows}</table></section>` : ""}
    ${aiOnly ? `<section class="callout"><h2>AI-only anomaly</h2><p>No individual deterministic rule threshold was crossed. The anomaly was raised by the multivariate Isolation Forest model.</p><table>${rowsFromObject({
      "Rule-Based Status": analysis.overall_rule_status,
      "AI Anomaly": analysis.anomaly_flag,
      "Trigger Source": analysis.trigger_source ?? "None",
      "Signed Score": numberFormat(analysis.anomaly_score, 5),
      Threshold: numberFormat(anomalyThreshold, 0),
      "Distance Above Threshold": numberFormat(analysis.anomaly_score - anomalyThreshold, 5)
    })}</table></section>` : ""}
    <section>
      <h2>Period KPIs</h2>
      <table>${rowsFromObject({
        average_methane_percent: numberFormat(kpis.averageMethane, 1),
        average_biogas_yield_m3_per_ton: numberFormat(kpis.averageBiogasYield, 2),
        average_gas_flow_m3_h: numberFormat(kpis.averageGasFlow, 1),
        ai_anomaly_rate: percent(kpis.aiAnomalyRate, 1),
        warning_critical_rule_rate: percent(kpis.ruleEscalationRate, 1),
        expert_review_count: kpis.expertReviewCount,
        maintenance_overdue_count: kpis.maintenanceOverdueCount
      })}</table>
    </section>
    <section>
      <h2>Inputs</h2>
      <table><thead><tr><th>Input</th><th>Value</th><th>Unit</th></tr></thead><tbody>${inputRows}</tbody></table>
    </section>
    <section>
      <h2>Engineered Features</h2>
      <table>${rowsFromObject({
        biogas_yield_m3_per_ton: compactNumber(analysis.biogas_yield_m3_per_ton),
        methane_to_co2_ratio: compactNumber(analysis.methane_to_co2_ratio)
      })}</table>
    </section>
    <section>
      <h2>Rule Outputs</h2>
      <table><tbody>${ruleRows}</tbody></table>
      <p>Overall rule status: <strong>${escapeHtml(analysis.overall_rule_status)}</strong></p>
    </section>
    <section>
      <h2>Isolation Forest</h2>
      <table>${rowsFromObject({
        raw_anomaly_score: numberFormat(analysis.anomaly_score, 4),
        threshold: anomalyThreshold,
        distance_above_threshold: numberFormat(analysis.anomaly_score - anomalyThreshold, 4),
        anomaly_flag: analysis.anomaly_flag,
        trigger_source: analysis.trigger_source ?? "None",
        expert_review_required: analysis.expert_review_required
      })}</table>
      <p>Signed Isolation Forest decision score. Values above zero are classified as anomalous. The score is not a probability or percentage and is not restricted to 0-1.</p>
    </section>
    <section>
      <h2>Interpretation Reference</h2>
      <table>${rowsFromObject({
        expected_gas_flow_m3_h: diagnostics ? numberFormat(diagnostics.expected_gas_flow_m3_h, 2) : "n/a",
        actual_gas_flow_m3_h: diagnostics ? numberFormat(diagnostics.actual_gas_flow_m3_h, 2) : "n/a",
        gas_flow_residual_m3_h: diagnostics ? numberFormat(diagnostics.gas_flow_residual_m3_h, 2) : "n/a",
        robust_z_threshold: diagnostics?.robust_z_threshold ?? 2.5
      })}</table>
      <table><thead><tr><th>Metric</th><th>Value</th><th>Median</th><th>MAD</th><th>Robust z</th><th>Deviation</th></tr></thead><tbody>${robustRows}</tbody></table>
    </section>
    <section>
      <h2>Recent Historical Table</h2>
      <table><thead><tr><th>ID</th><th>Date</th><th>Rule status</th><th>AI status</th><th>Score</th></tr></thead><tbody>${historyRows}</tbody></table>
    </section>
    <section>
      <h2>Model Limitations</h2>
      <ul>${limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  </main>
</body>
</html>`;
}
