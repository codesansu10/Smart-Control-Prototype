import type {
  AnalysisResult,
  HistoryRecord,
  MessageThread,
  MonthlyReport,
  PeriodKpis,
  UserRole,
  WorkflowCase,
  WorkflowModule
} from "../types/smartcontrol";
import { numberFormat } from "./format";
import { getUnifiedStatus } from "./status";
import { labelForMonth, monthlyStats } from "./workflow";

export interface PlantColleagueContext {
  role: UserRole;
  activeModule: WorkflowModule;
  currentAnalysis: AnalysisResult;
  selectedMeasurementId: string | null;
  historyRecords: HistoryRecord[];
  periodHistory: HistoryRecord[];
  kpis: PeriodKpis;
  anomalyCases: Record<string, WorkflowCase>;
  monthlyReports: Record<string, MonthlyReport>;
  selectedMonth: string;
  messageThreads: MessageThread[];
  dataSource: string;
  isApiConnected: boolean;
  isAnalyzeAvailable: boolean;
}

const moduleLabels: Record<WorkflowModule, string> = {
  dashboard: "Dashboard",
  "anomaly-detection": "Error Detection",
  "monthly-report": "Monthly Report",
  messages: "Messages",
  "review-queue": "Review Queue",
  "monthly-report-review": "Monthly Report Review"
};

function openCaseCount(cases: Record<string, WorkflowCase>): number {
  return Object.values(cases).filter((item) => item.status !== "Closed" && item.status !== "False alarm").length;
}

function awaitingReviewCases(cases: Record<string, WorkflowCase>): WorkflowCase[] {
  return Object.values(cases).filter((item) => item.status === "Awaiting expert review");
}

function needsAttention(record: HistoryRecord): boolean {
  return record.anomaly_flag === "Anomaly" || record.overall_rule_status !== "Normal" || record.expert_review_required === "Yes";
}

function priority(record: HistoryRecord): number {
  if (record.overall_rule_status === "Critical") return 5;
  if (record.overall_rule_status === "Warning") return 4;
  if (record.anomaly_flag === "Anomaly") return 3;
  if (record.expert_review_required === "Yes") return 2;
  return 0;
}

function selectedCase(context: PlantColleagueContext): WorkflowCase | null {
  return context.selectedMeasurementId ? context.anomalyCases[context.selectedMeasurementId] ?? null : null;
}

function selectedRecord(context: PlantColleagueContext): HistoryRecord | null {
  return context.selectedMeasurementId
    ? context.historyRecords.find((record) => record.measurement_id === context.selectedMeasurementId) ?? null
    : null;
}

function allRulesNormal(analysis: AnalysisResult): boolean {
  return [
    analysis.ph_alert,
    analysis.temperature_alert,
    analysis.oxygen_alert,
    analysis.methane_alert,
    analysis.h2s_alert,
    analysis.maintenance_alert
  ].every((status) => status === "Normal");
}

function selectedOutcomeLabel(analysis: AnalysisResult): string {
  if (analysis.anomaly_flag === "Anomaly" && allRulesNormal(analysis)) {
    return "AI-only anomaly";
  }
  if (analysis.overall_rule_status !== "Normal") {
    return "rule-based warning";
  }
  if (analysis.anomaly_flag === "Normal" && allRulesNormal(analysis)) {
    return "normal operation";
  }
  return "mixed monitoring result";
}

function topAttentionRecord(context: PlantColleagueContext): HistoryRecord | null {
  return [...context.periodHistory]
    .filter(needsAttention)
    .sort((a, b) => {
      const delta = priority(b) - priority(a);
      if (delta !== 0) return delta;
      return b.date.localeCompare(a.date) || b.measurement_id.localeCompare(a.measurement_id);
    })[0] ?? null;
}

function currentIssueSummary(context: PlantColleagueContext): string {
  const analysis = context.currentAnalysis;
  const measurementId = context.selectedMeasurementId ?? "the selected measurement";
  return `Selected measurement ${measurementId} is ${getUnifiedStatus(analysis)}. Rule-based status is ${analysis.overall_rule_status}, AI anomaly status is ${analysis.anomaly_flag}, and the trigger source is ${analysis.trigger_source ?? "None"}. ${analysis.short_explanation} Recommended action: ${analysis.recommended_action}`;
}

function selectedResultSummary(context: PlantColleagueContext): string {
  const analysis = context.currentAnalysis;
  const measurementId = context.selectedMeasurementId ?? "the selected measurement";
  const outcome = selectedOutcomeLabel(analysis);
  return `Selected measurement ${measurementId} is a ${outcome}. Rule-based status is ${analysis.overall_rule_status}, AI anomaly status is ${analysis.anomaly_flag}, trigger source is ${analysis.trigger_source ?? "None"}, and expert review is ${analysis.expert_review_required === "Yes" ? "required" : "not required"}. ${analysis.short_explanation} Recommended action: ${analysis.recommended_action}`;
}

export function answerPlantColleague(question: string, context: PlantColleagueContext): string {
  const text = question.trim().toLowerCase();
  const analysis = context.currentAnalysis;
  const caseItem = selectedCase(context);
  const record = selectedRecord(context);
  const attention = context.periodHistory.filter(needsAttention);
  const awaiting = awaitingReviewCases(context.anomalyCases);
  const openCases = openCaseCount(context.anomalyCases);

  if (!text) {
    return fallbackResponse();
  }

  if (text.includes("ai-only") || text.includes("ai only")) {
    return `An AI-only anomaly means all monitored rules are Normal, but the Isolation Forest detects an unusual multivariable relationship across the measurements. It is a model flag, not a percentage or confidence score.`;
  }

  if (text.includes("rule-based warning") || text.includes("rule warning")) {
    return `A rule-based warning means a defined operating or maintenance threshold has crossed outside the Normal range, while the Isolation Forest may still classify the measurement as Normal.`;
  }

  if (text.includes("normal operation")) {
    return `Normal operation means the individual rules are Normal, the Isolation Forest score is at or below zero, no expert review is required, and routine monitoring can continue.`;
  }

  if (text.includes("difference") && (text.includes("ai anomaly") || text.includes("rule alert") || text.includes("rule-based"))) {
    return `A rule alert comes from deterministic thresholds such as pH, temperature, gas quality or maintenance state. An AI anomaly comes from the Isolation Forest detecting an unusual relationship across multiple measurements. A record can be rule-based, AI-only, both, or Normal.`;
  }

  if (text.includes("selected result") || text.includes("current result")) {
    return selectedResultSummary(context);
  }

  if (text.includes("api") || text.includes("connected") || text.includes("data source")) {
    return context.isApiConnected
      ? `The model API is connected. Health, metadata, history and analysis are available, and the current data source is ${context.dataSource}. Live analysis is ${context.isAnalyzeAvailable ? "enabled" : "disabled"}.`
      : `The model API is not connected right now. The dashboard can still use the static workbook fallback, but live analysis is disabled until the API is healthy.`;
  }

  if (text.includes("anomaly score") || text.includes("score mean")) {
    return `The anomaly score is a signed Isolation Forest decision score. Scores above zero are anomalous, and scores at or below zero are normal. It is not a probability, confidence percentage or 0-100 score. The current score is ${numberFormat(analysis.anomaly_score, 5)}.`;
  }

  if (text.includes("current plant status") || text.includes("plant status") || text.includes("current status")) {
    return `Current plant status is ${getUnifiedStatus(analysis)}. Rule-based status is ${analysis.overall_rule_status}, AI anomaly status is ${analysis.anomaly_flag}, expert review is ${analysis.expert_review_required === "Yes" ? "needed" : "not required"}, and you are viewing ${moduleLabels[context.activeModule]}.`;
  }

  if (text.includes("which measurement") || text.includes("needs attention") || text.includes("most critical")) {
    const top = topAttentionRecord(context);
    if (!top) {
      return `No measurement in the selected period currently needs attention. The selected measurement is ${context.selectedMeasurementId ?? "not set"}.`;
    }
    return `Measurement ${top.measurement_id} on ${top.date} needs attention first: rule status ${top.overall_rule_status}, AI anomaly ${top.anomaly_flag}, issue ${top.possible_issue_category ?? "None"}. ${top.short_explanation}`;
  }

  if (text.includes("how many alerts") || text.includes("open alerts") || text.includes("open cases")) {
    return `In the selected period, ${attention.length} measurements need attention. The local workflow has ${openCases} open case${openCases === 1 ? "" : "s"}, including ${awaiting.length} awaiting expert review.`;
  }

  if (text.includes("explain") || text.includes("why") || text.includes("flagged") || text.includes("current error")) {
    return currentIssueSummary(context);
  }

  if (text.includes("recommended") || text.includes("next action") || text.includes("operator action")) {
    if (caseItem?.operatorMeasures) {
      return `The expert-defined operator measures for selected measurement ${caseItem.measurementId} are: ${caseItem.operatorMeasures}`;
    }
    return `Recommended action for the current analysis: ${analysis.recommended_action}`;
  }

  if (text.includes("monthly") || text.includes("summary") || text.includes("report")) {
    const stats = monthlyStats(context.historyRecords, context.selectedMonth);
    const report = context.monthlyReports[context.selectedMonth];
    return `${labelForMonth(context.selectedMonth)} summary: ${stats.total} measurements, average methane ${numberFormat(stats.averageMethane, 1)}%, average gas flow ${numberFormat(stats.averageGasFlow, 1)} m3/h, AI anomaly count ${stats.anomalyCount}, warning count ${stats.warningCount}, critical count ${stats.criticalCount}, expert-review count ${stats.expertReviewCount}. Report status is ${report?.status ?? "Draft"}.`;
  }

  if (context.role === "operator" && (text.includes("send to the expert") || text.includes("send to expert"))) {
    return `Send selected measurement ${context.selectedMeasurementId ?? "the current analysis"} when you need Bernd to validate the issue. Include the short explanation, recommended action, and your operator note.`;
  }

  if (context.role === "operator" && text.includes("expert replied")) {
    if (caseItem?.expertReply) {
      return `Yes. Bernd replied on selected measurement ${caseItem.measurementId}: ${caseItem.expertReply}`;
    }
    const linkedThread = context.messageThreads.find((thread) => thread.measurementId === context.selectedMeasurementId);
    const hasBerndReply = linkedThread?.messages.some((message) => message.sender === "bernd");
    return hasBerndReply ? `Yes. Bernd has replied in the linked message thread.` : `No expert reply is recorded for the selected measurement yet.`;
  }

  if (context.role === "operator" && text.includes("waiting for review")) {
    return `${awaiting.length} case${awaiting.length === 1 ? " is" : "s are"} waiting for expert review. ${awaiting.slice(0, 3).map((item) => item.measurementId).join(", ") || "No pending case IDs."}`;
  }

  if (context.role === "expert" && (text.includes("awaiting review") || text.includes("cases awaiting"))) {
    return `${awaiting.length} case${awaiting.length === 1 ? " is" : "s are"} awaiting review. ${awaiting.slice(0, 5).map((item) => item.measurementId).join(", ") || "No pending case IDs."}`;
  }

  if (context.role === "expert" && (text.includes("selected review case") || text.includes("julia report") || text.includes("what did julia"))) {
    if (!caseItem) {
      return `No workflow case is selected. Open a case from Review Queue to inspect Julia's note and the exact historical measurement.`;
    }
    return `Julia reported measurement ${caseItem.measurementId}. Note: ${caseItem.note || "No operator note"}. Current case status is ${caseItem.status}. ${record ? record.short_explanation : "The record is not loaded."}`;
  }

  if (context.role === "expert" && text.includes("decision")) {
    if (!caseItem) {
      return `No decision is pending because no case is selected. Open a Review Queue case first.`;
    }
    return `Decision pending for ${caseItem.measurementId}: current status ${caseItem.status}, expert decision ${caseItem.expertDecision ?? "Pending"}. Use Confirm anomaly, Mark false alarm, Request more data or Close case.`;
  }

  return fallbackResponse();
}

export function fallbackResponse(): string {
  return `I can help with current status, errors, alerts, review cases, reports, messages and recommended actions. Try asking "Explain the current error" or "How many cases are awaiting review?"`;
}

export function plantColleaguePrompts(role: UserRole): string[] {
  return role === "expert"
    ? [
        "How many cases are awaiting review?",
        "Explain the selected result.",
        "Explain the selected review case.",
        "What decision is pending?"
      ]
      : [
        "What is the current plant status?",
        "Explain the selected result.",
        "Which measurement needs attention?",
        "What should I send to the expert?"
      ];
}
