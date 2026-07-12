import { Send, UserCheck } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { AnalysisResult, DashboardMode, HistoryRecord, PeriodKey, WorkflowCase } from "../types/smartcontrol";
import { numberFormat } from "../utils/format";
import { ruleBreakdown } from "../utils/history";
import { displayTriggerSource, getUnifiedStatus } from "../utils/status";
import { AttentionSummary } from "./AttentionSummary";
import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";
import { PeriodSelector } from "./PeriodSelector";
import { StatusBadge } from "./StatusBadge";

type FilterKey = "needs-attention" | "ai-anomalies" | "rule-alerts" | "critical" | "awaiting-review" | "all-measurements";

function statusLabel(record: HistoryRecord): "Critical Rule" | "Rule Warning" | "AI Anomaly" | "Normal" {
  if (record.overall_rule_status === "Critical") return "Critical Rule";
  if (record.overall_rule_status === "Warning") return "Rule Warning";
  if (record.anomaly_flag === "Anomaly") return "AI Anomaly";
  return "Normal";
}

function reviewState(record: HistoryRecord, caseItem: WorkflowCase | undefined): string {
  if (caseItem) {
    return caseItem.status;
  }
  return record.expert_review_required === "Yes" ? "Awaiting expert review" : "Not submitted";
}

export function AnomalyDetectionView(props: {
  mode: DashboardMode;
  records: HistoryRecord[];
  selectedPeriod: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  selectedMeasurementId: string | null;
  currentAnalysis: AnalysisResult;
  anomalyCases: Record<string, WorkflowCase>;
  onSelectMeasurement: (measurementId: string) => void;
  onSubmitForReview: (note: string) => void;
  onSendToMessages: () => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("needs-attention");
  const [note, setNote] = useState("");
  const [expandedMeasurementId, setExpandedMeasurementId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [filter, props.selectedPeriod]);

  const summary = useMemo(() => ({
    aiAnomalies: props.records.filter((record) => record.anomaly_flag === "Anomaly").length,
    ruleWarnings: props.records.filter((record) => record.overall_rule_status === "Warning").length,
    criticalRuleAlerts: props.records.filter((record) => record.overall_rule_status === "Critical").length,
    awaitingReview: props.records.filter((record) => {
      const caseItem = props.anomalyCases[record.measurement_id];
      return caseItem?.status === "Awaiting expert review" || (!caseItem && record.expert_review_required === "Yes");
    }).length
  }), [props.anomalyCases, props.records]);

  const filtered = useMemo(() => {
    return props.records.filter((record) => {
      const caseItem = props.anomalyCases[record.measurement_id];
      const attention = record.anomaly_flag === "Anomaly" || record.overall_rule_status !== "Normal" || record.expert_review_required === "Yes";
      if (filter === "needs-attention") return attention;
      if (filter === "ai-anomalies") return record.anomaly_flag === "Anomaly";
      if (filter === "rule-alerts") return record.overall_rule_status !== "Normal";
      if (filter === "critical") return record.overall_rule_status === "Critical";
      if (filter === "awaiting-review") return caseItem?.status === "Awaiting expert review" || (!caseItem && record.expert_review_required === "Yes");
      return true;
    });
  }, [filter, props.anomalyCases, props.records]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  const breakdown = ruleBreakdown(props.currentAnalysis);

  return (
    <div className="workflow-grid">
      <AttentionSummary {...summary} />

      <section className="panel">
        <div className="panel-header panel-header-wrap">
          <div>
            <h2>Attention list</h2>
            <p className="muted">Only records requiring attention are shown by default.</p>
          </div>
          <PeriodSelector value={props.selectedPeriod} onChange={props.onPeriodChange} compact />
        </div>

        <div className="segmented segmented-compact" role="group" aria-label="Anomaly filters">
          {[
            ["needs-attention", "Needs attention"],
            ["ai-anomalies", "AI anomalies"],
            ["rule-alerts", "Rule alerts"],
            ["critical", "Critical"],
            ["awaiting-review", "Awaiting review"],
            ["all-measurements", "All measurements (technical history)"]
          ].map(([key, label]) => (
            <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key as FilterKey)}>{label}</button>
          ))}
        </div>

        {!filtered.length ? (
          <EmptyState message="No anomalies need attention" />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Measurement ID</th>
                    <th>Status</th>
                    <th>Trigger</th>
                    <th>Issue category</th>
                    <th>Review state</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((record) => {
                    const caseItem = props.anomalyCases[record.measurement_id];
                    const rowReviewState = reviewState(record, caseItem);
                    const rowStatus = statusLabel(record);
                    const expanded = expandedMeasurementId === record.measurement_id;
                    return (
                      <Fragment key={record.measurement_id}>
                        <tr className={props.selectedMeasurementId === record.measurement_id ? "row-active" : ""}>
                          <td>{record.date}</td>
                          <td>{record.measurement_id}</td>
                          <td><StatusBadge value={record.overall_rule_status === "Critical" ? "Critical" : rowStatus.includes("Warning") ? "Warning" : rowStatus.includes("Anomaly") ? "Anomaly" : "Normal"} label={rowStatus} /></td>
                          <td>{displayTriggerSource(record.trigger_source)}</td>
                          <td>{record.possible_issue_category ?? "None"}</td>
                          <td>{rowReviewState}</td>
                          <td>
                            <div className="table-actions">
                              <button type="button" className="table-link" onClick={() => props.onSelectMeasurement(record.measurement_id)}>View</button>
                              {props.mode === "Advanced" && (
                                <button type="button" className="table-link" onClick={() => setExpandedMeasurementId(expanded ? null : record.measurement_id)}>{expanded ? "Hide" : "Details"}</button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {props.mode === "Advanced" && expanded && (
                          <tr>
                            <td colSpan={7}>
                              <div className="advanced-row-details">
                                <div><strong>Rule status:</strong> {record.overall_rule_status}</div>
                                <div><strong>AI status:</strong> {record.anomaly_flag}</div>
                                <div><strong>Raw anomaly score:</strong> {numberFormat(record.anomaly_score, 5)}</div>
                                <div><strong>Trigger source:</strong> {displayTriggerSource(record.trigger_source)}</div>
                                <div><strong>All six alerts:</strong> pH {record.ph_alert}, Temp {record.temperature_alert}, Oxygen {record.oxygen_alert}, Methane {record.methane_alert}, H2S {record.h2s_alert}, Maintenance {record.maintenance_alert}</div>
                                <div><strong>Engineered features:</strong> Yield {numberFormat(record.biogas_yield_m3_per_ton, 2)} | CH4/CO2 {numberFormat(record.methane_to_co2_ratio, 3)}</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Selected measurement detail</h2>
            <p className="muted">Operational and diagnostic details for the selected record.</p>
          </div>
        </div>

        <div className="diagnostic-list">
          <div className="diagnostic-row"><strong>Unified status</strong><span>{getUnifiedStatus(props.currentAnalysis)}</span></div>
          <div className="diagnostic-row"><strong>Rule-based status</strong><span>{props.currentAnalysis.overall_rule_status}</span></div>
          <div className="diagnostic-row"><strong>AI anomaly status</strong><span>{props.currentAnalysis.anomaly_flag}</span></div>
          <div className="diagnostic-row"><strong>Trigger source</strong><span>{displayTriggerSource(props.currentAnalysis.trigger_source)}</span></div>
          <div className="diagnostic-row"><strong>Possible issue category</strong><span>{props.currentAnalysis.possible_issue_category ?? "None"}</span></div>
          <div className="diagnostic-row"><strong>Isolation Forest score</strong><span>{numberFormat(props.currentAnalysis.anomaly_score, 5)}</span></div>
          <div className="diagnostic-row"><strong>Recommended action</strong><span>{props.currentAnalysis.recommended_action}</span></div>
        </div>

        <div className="kpi-grid" style={{ marginTop: 12 }}>
          {breakdown.map((row) => (
            <div className="kpi" key={row.status}>
              <span className="muted">{row.status}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>

        <div className="drawer-actions" style={{ marginTop: 12 }}>
          <textarea aria-label="Operator note" placeholder="Add a note for expert review" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="message-input" />
          <button className="primary-button" type="button" onClick={() => props.onSubmitForReview(note)}>
            <UserCheck size={16} aria-hidden="true" /> Submit for expert review
          </button>
          <button className="secondary-button" type="button" onClick={props.onSendToMessages}>
            <Send size={16} aria-hidden="true" /> Send current analysis to Messages
          </button>
        </div>
      </section>
    </div>
  );
}
