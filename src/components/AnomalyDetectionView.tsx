import { Send, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnalysisResult, HistoryRecord, WorkflowCase } from "../types/smartcontrol";
import { numberFormat } from "../utils/format";
import { ruleBreakdown } from "../utils/history";
import { displayTriggerSource, getUnifiedStatus, severityClass } from "../utils/status";

type FilterKey = "all" | "rule" | "iforest" | "normal" | "warning" | "critical" | "review";

export function AnomalyDetectionView(props: {
  records: HistoryRecord[];
  selectedMeasurementId: string | null;
  currentAnalysis: AnalysisResult;
  caseItem: WorkflowCase | null;
  onSelectMeasurement: (measurementId: string) => void;
  onSubmitForReview: (note: string) => void;
  onSendToMessages: () => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    return props.records.filter((record) => {
      if (filter === "all") return true;
      if (filter === "rule") return record.trigger_source === "Rule-Based";
      if (filter === "iforest") return record.trigger_source === "Isolation Forest";
      if (filter === "normal") return getUnifiedStatus(record) === "Normal";
      if (filter === "warning") return getUnifiedStatus(record) === "Warning";
      if (filter === "critical") return getUnifiedStatus(record) === "Critical";
      if (filter === "review") return record.expert_review_required === "Yes";
      return true;
    });
  }, [filter, props.records]);

  const breakdown = ruleBreakdown(props.currentAnalysis);

  return (
    <div className="workflow-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Anomaly overview</h2>
            <p className="muted">Historical anomalies and rule alerts with full detail drilldown.</p>
          </div>
          <div className="segmented">
            {[
              ["all", "All results"],
              ["rule", "Rule-Based"],
              ["iforest", "Isolation Forest"],
              ["normal", "Normal"],
              ["warning", "Warning"],
              ["critical", "Critical"],
              ["review", "Expert review required"]
            ].map(([key, label]) => (
              <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key as FilterKey)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Measurement ID</th>
                <th>Date</th>
                <th>Rule status</th>
                <th>AI status</th>
                <th>Trigger source</th>
                <th>Possible issue category</th>
                <th>Expert-review status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.measurement_id} className={props.selectedMeasurementId === record.measurement_id ? "row-active" : ""}>
                  <td>
                    <button type="button" className="table-link" onClick={() => props.onSelectMeasurement(record.measurement_id)}>
                      {record.measurement_id}
                    </button>
                  </td>
                  <td>{record.date}</td>
                  <td><span className={`status-pill ${severityClass(record.overall_rule_status)}`}>{record.overall_rule_status}</span></td>
                  <td><span className={`status-pill ${record.anomaly_flag === "Anomaly" ? "severity-warning" : "severity-normal"}`}>{record.anomaly_flag}</span></td>
                  <td>{displayTriggerSource(record.trigger_source)}</td>
                  <td>{record.possible_issue_category ?? "None"}</td>
                  <td>{props.caseItem?.status ?? "Open"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Current selected anomaly details</h2>
            <p className="muted">Model diagnostics, engineered features, and expert-review state.</p>
          </div>
        </div>

        <div className="diagnostic-list">
          <div className="diagnostic-row"><strong>Unified status</strong><span>{getUnifiedStatus(props.currentAnalysis)}</span></div>
          <div className="diagnostic-row"><strong>Rule-based status</strong><span>{props.currentAnalysis.overall_rule_status}</span></div>
          <div className="diagnostic-row"><strong>AI anomaly status</strong><span>{props.currentAnalysis.anomaly_flag}</span></div>
          <div className="diagnostic-row"><strong>Trigger source</strong><span>{displayTriggerSource(props.currentAnalysis.trigger_source)}</span></div>
          <div className="diagnostic-row"><strong>Possible issue category</strong><span>{props.currentAnalysis.possible_issue_category ?? "None"}</span></div>
          <div className="diagnostic-row"><strong>Expert review state</strong><span>{props.caseItem?.status ?? "Open"}</span></div>
          <div className="diagnostic-row"><strong>Isolation Forest score</strong><span>{numberFormat(props.currentAnalysis.anomaly_score, 5)}</span></div>
          <div className="diagnostic-row"><strong>Engineered features</strong><span>Yield {numberFormat(props.currentAnalysis.biogas_yield_m3_per_ton, 2)} | CH4/CO2 {numberFormat(props.currentAnalysis.methane_to_co2_ratio, 3)}</span></div>
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
