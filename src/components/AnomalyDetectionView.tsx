import { Send, UserCheck } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { AnalysisResult, DashboardMode, HistoryRecord, PeriodKey, UserRole, WorkflowCase } from "../types/smartcontrol";
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
  role: UserRole;
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
  const selectedCase = props.selectedMeasurementId ? props.anomalyCases[props.selectedMeasurementId] : undefined;
  const showExpertDetails = props.mode === "Advanced" || props.role === "expert";

  return (
    <div className="workflow-grid">
      <AttentionSummary {...summary} />

      <section className="panel">
        <div className="panel-header panel-header-wrap">
          <div>
            <h2>Error Detection</h2>
            <p className="muted">Needs attention is shown by default so normal technical history does not dominate the workflow.</p>
          </div>
          <PeriodSelector value={props.selectedPeriod} onChange={props.onPeriodChange} compact />
        </div>

        <div className="segmented segmented-compact" role="group" aria-label="Error Detection filters">
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
                              <button type="button" className="table-link" onClick={() => props.onSelectMeasurement(record.measurement_id)}>Select</button>
                              <button
                                type="button"
                                className="table-link"
                                aria-expanded={expanded}
                                onClick={() => setExpandedMeasurementId(expanded ? null : record.measurement_id)}
                              >
                                {expanded ? "Hide details" : "Details"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={7}>
                              <RecordDetails record={record} expert={showExpertDetails} />
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
          <div className="diagnostic-row"><strong>Short explanation</strong><span>{props.currentAnalysis.short_explanation}</span></div>
          <div className="diagnostic-row"><strong>Isolation Forest score</strong><span>{numberFormat(props.currentAnalysis.anomaly_score, 5)}</span></div>
          <div className="diagnostic-row"><strong>Recommended action</strong><span>{props.currentAnalysis.recommended_action}</span></div>
          <div className="diagnostic-row"><strong>Case status</strong><span>{selectedCase?.status ?? (props.currentAnalysis.expert_review_required === "Yes" ? "Awaiting expert review" : "Not submitted")}</span></div>
          {props.role === "expert" && (
            <>
              <div className="diagnostic-row"><strong>Julia note</strong><span>{selectedCase?.note || "No operator note yet"}</span></div>
              <div className="diagnostic-row"><strong>Existing expert reply</strong><span>{selectedCase?.expertReply || "No expert reply yet"}</span></div>
              <div className="diagnostic-row"><strong>Operator measures</strong><span>{selectedCase?.operatorMeasures || "No measures defined yet"}</span></div>
              <div className="diagnostic-row"><strong>Expert decision</strong><span>{selectedCase?.expertDecision ?? "Pending"}</span></div>
            </>
          )}
        </div>

        <div className="kpi-grid" style={{ marginTop: 12 }}>
          {breakdown.map((row) => (
            <div className="kpi" key={row.status}>
              <span className="muted">{row.status}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>

        {props.role === "operator" && (
          <div className="drawer-actions" style={{ marginTop: 12 }}>
            <textarea aria-label="Operator note" placeholder="Add a note for expert review" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="message-input" />
            <button className="primary-button" type="button" onClick={() => props.onSubmitForReview(note)}>
              <UserCheck size={16} aria-hidden="true" /> Submit for expert review
            </button>
            <button className="secondary-button" type="button" onClick={props.onSendToMessages}>
              <Send size={16} aria-hidden="true" /> Send current analysis to Messages
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function RecordDetails(props: { record: HistoryRecord; expert: boolean }) {
  const diagnostics = props.record.diagnostics;

  return (
    <div className="advanced-row-details">
      <div><strong>Measurement ID:</strong> {props.record.measurement_id}</div>
      <div><strong>Date:</strong> {props.record.date}</div>
      <div><strong>Possible issue category:</strong> {props.record.possible_issue_category ?? "None"}</div>
      <div><strong>Short explanation:</strong> {props.record.short_explanation}</div>
      <div><strong>Recommended action:</strong> {props.record.recommended_action}</div>
      <div><strong>Rule-based status:</strong> {props.record.overall_rule_status}</div>
      <div><strong>AI anomaly status:</strong> {props.record.anomaly_flag}</div>
      <div><strong>Trigger source:</strong> {displayTriggerSource(props.record.trigger_source)}</div>
      <div><strong>Expert review required:</strong> {props.record.expert_review_required}</div>
      {props.expert && (
        <>
          <div><strong>Raw signed anomaly score:</strong> {numberFormat(props.record.anomaly_score, 5)}</div>
          <div><strong>All six alerts:</strong> pH {props.record.ph_alert}, Temperature {props.record.temperature_alert}, Oxygen {props.record.oxygen_alert}, Methane {props.record.methane_alert}, H2S {props.record.h2s_alert}, Maintenance {props.record.maintenance_alert}</div>
          <div><strong>Biogas yield:</strong> {numberFormat(props.record.biogas_yield_m3_per_ton, 2)} m3/t</div>
          <div><strong>Methane-to-CO2 ratio:</strong> {numberFormat(props.record.methane_to_co2_ratio, 3)}</div>
          {diagnostics && (
            <>
              <div><strong>Expected gas flow:</strong> {numberFormat(diagnostics.expected_gas_flow_m3_h, 2)} m3/h</div>
              <div><strong>Actual gas flow:</strong> {numberFormat(diagnostics.actual_gas_flow_m3_h, 2)} m3/h</div>
              <div><strong>Gas-flow residual:</strong> {numberFormat(diagnostics.gas_flow_residual_m3_h, 2)} m3/h</div>
              <div><strong>Robust z threshold:</strong> {numberFormat(diagnostics.robust_z_threshold, 2)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
