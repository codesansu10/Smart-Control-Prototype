import type {
  AnalysisResult,
  HistoryRecord,
  MessageEntry,
  MessageThread,
  ReportStatus,
  UserRole,
  WorkflowCase
} from "../types/smartcontrol";

export const identities = {
  julia: {
    id: "julia" as const,
    initials: "JU",
    name: "Julia User",
    subtitle: "Operator · Scheer Energy"
  },
  bernd: {
    id: "bernd" as const,
    initials: "BB",
    name: "Bernd Biogas",
    subtitle: "Process Expert · OEKOBIT"
  }
};

export function actorForRole(role: UserRole) {
  return role === "expert" ? identities.bernd : identities.julia;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function toMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function availableMonths(records: HistoryRecord[]): string[] {
  return Array.from(new Set(records.map((record) => toMonthKey(record.date)))).sort();
}

export function labelForMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return month;
  }
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTextMessage(args: {
  sender: "julia" | "bernd" | "system";
  body: string;
  kind?: MessageEntry["kind"];
}): MessageEntry {
  const senderLabel = args.sender === "bernd" ? identities.bernd.name : args.sender === "julia" ? identities.julia.name : "System";
  const senderSubLabel = args.sender === "bernd" ? identities.bernd.subtitle : args.sender === "julia" ? identities.julia.subtitle : "Workflow status";
  return {
    id: id("msg"),
    sender: args.sender,
    senderLabel,
    senderSubLabel,
    body: args.body,
    timestamp: isoNow(),
    kind: args.kind ?? "text"
  };
}

export function upsertThread(threads: MessageThread[], thread: MessageThread): MessageThread[] {
  const existingIndex = threads.findIndex((item) => item.id === thread.id);
  if (existingIndex === -1) {
    return [thread, ...threads].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }
  const next = [...threads];
  next[existingIndex] = thread;
  return next.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export function createAnomalyThread(args: {
  measurementId: string;
  caseStatus: WorkflowCase["status"];
  note: string;
}): MessageThread {
  const first = createTextMessage({ sender: "julia", body: args.note || "Please review this anomaly case.", kind: "analysis-card" });
  return {
    id: id("thread"),
    subject: `Anomaly review ${args.measurementId}`,
    type: "anomaly",
    measurementId: args.measurementId,
    messages: [first],
    unreadByOperator: 0,
    unreadByExpert: 1,
    caseStatus: args.caseStatus,
    lastActivityAt: first.timestamp
  };
}

export function createReportThread(args: {
  month: string;
  reportStatus: ReportStatus;
  note: string;
}): MessageThread {
  const first = createTextMessage({ sender: "julia", body: args.note || `Monthly report ${labelForMonth(args.month)} submitted.`, kind: "report-card" });
  return {
    id: id("thread"),
    subject: `Monthly report ${labelForMonth(args.month)}`,
    type: "monthly-report",
    reportingMonth: args.month,
    messages: [first],
    unreadByOperator: 0,
    unreadByExpert: 1,
    reportStatus: args.reportStatus,
    lastActivityAt: first.timestamp
  };
}

export function appendMessage(thread: MessageThread, message: MessageEntry, byRole: UserRole): MessageThread {
  return {
    ...thread,
    messages: [...thread.messages, message],
    unreadByOperator: byRole === "expert" ? thread.unreadByOperator + 1 : thread.unreadByOperator,
    unreadByExpert: byRole === "operator" ? thread.unreadByExpert + 1 : thread.unreadByExpert,
    lastActivityAt: message.timestamp
  };
}

export function markThreadRead(thread: MessageThread, role: UserRole): MessageThread {
  return {
    ...thread,
    unreadByOperator: role === "operator" ? 0 : thread.unreadByOperator,
    unreadByExpert: role === "expert" ? 0 : thread.unreadByExpert
  };
}

export function monthlyStats(records: HistoryRecord[], month: string) {
  const scoped = records.filter((record) => toMonthKey(record.date) === month);
  const total = scoped.length;
  const anomalies = scoped.filter((record) => record.anomaly_flag === "Anomaly").length;
  const warnings = scoped.filter((record) => record.overall_rule_status === "Warning").length;
  const critical = scoped.filter((record) => record.overall_rule_status === "Critical").length;
  const expertReview = scoped.filter((record) => record.expert_review_required === "Yes").length;
  const maintenanceOverdue = scoped.filter((record) => record.maintenance_status === "overdue").length;
  const avg = (key: keyof HistoryRecord) => (total ? scoped.reduce((sum, row) => sum + Number(row[key]), 0) / total : 0);
  const countBy = (values: Array<string | null | undefined>) => Object.entries(values.reduce<Record<string, number>>((acc, value) => {
    const key = value && value.trim() ? value : "None";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {})).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);

  const issueBreakdown = countBy(scoped.map((record) => record.possible_issue_category));
  const triggerBreakdown = countBy(scoped.map((record) => record.trigger_source));
  const importantRecords = scoped
    .filter((record) => record.overall_rule_status !== "Normal" || record.anomaly_flag === "Anomaly" || record.expert_review_required === "Yes")
    .sort((a, b) => {
      const priority = (record: HistoryRecord) => {
        if (record.overall_rule_status === "Critical") return 4;
        if (record.overall_rule_status === "Warning") return 3;
        if (record.anomaly_flag === "Anomaly") return 2;
        if (record.expert_review_required === "Yes") return 1;
        return 0;
      };
      const delta = priority(b) - priority(a);
      if (delta !== 0) return delta;
      return b.date.localeCompare(a.date);
    })
    .slice(0, 10);

  const methaneTrend =
    scoped.length > 1 ? scoped.at(-1)!.methane_percent - scoped[0].methane_percent : 0;
  const keyTrend =
    methaneTrend > 0.5
      ? "Methane improved through the month"
      : methaneTrend < -0.5
        ? "Methane declined through the month"
        : "Methane remained stable through the month";

  return {
    records: scoped,
    total,
    averageMethane: avg("methane_percent"),
    averageBiogasYield: avg("biogas_yield_m3_per_ton"),
    averageGasFlow: avg("gas_flow_m3_h"),
    anomalyCount: anomalies,
    anomalyRate: total ? anomalies / total : 0,
    warningCount: warnings,
    criticalCount: critical,
    expertReviewCount: expertReview,
    maintenanceOverdueCount: maintenanceOverdue,
    issueBreakdown,
    triggerBreakdown,
    importantRecords,
    keyTrend
  };
}

export function findCaseForMeasurement(cases: Record<string, WorkflowCase>, measurementId: string): WorkflowCase | null {
  return cases[measurementId] ?? null;
}

export function describeCase(caseItem: WorkflowCase | null, analysis: AnalysisResult): string {
  if (!caseItem) {
    return `Model result: ${analysis.anomaly_flag} | Expert decision: Pending | Case status: Open`;
  }
  return `Model result: ${analysis.anomaly_flag} | Expert decision: ${caseItem.expertDecision ?? "Pending"} | Case status: ${caseItem.status}`;
}
