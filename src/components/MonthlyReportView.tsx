import { CheckCircle2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HistoryRecord, MonthlyReport, ReportStatus, UserRole } from "../types/smartcontrol";
import { numberFormat, percent } from "../utils/format";
import { labelForMonth, monthlyStats } from "../utils/workflow";
import { EmptyState } from "./EmptyState";

export function MonthlyReportView(props: {
  role: UserRole;
  records: HistoryRecord[];
  availableMonths: string[];
  selectedMonth: string;
  report: MonthlyReport | null;
  onSelectMonth: (month: string) => void;
  onGenerate: () => void;
  onSaveReport: (patch: Partial<MonthlyReport>) => void;
  onSendForReview: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  const [operatorNote, setOperatorNote] = useState(props.report?.operatorNote ?? "");
  const [expertComment, setExpertComment] = useState(props.report?.expertComment ?? "");

  useEffect(() => {
    setOperatorNote(props.report?.operatorNote ?? "");
    setExpertComment(props.report?.expertComment ?? "");
  }, [props.report]);

  const stats = useMemo(() => monthlyStats(props.records, props.selectedMonth), [props.records, props.selectedMonth]);
  const status: ReportStatus = props.report?.status ?? "Draft";

  if (!props.availableMonths.length || !props.selectedMonth) {
    return <EmptyState message="No monthly report generated" />;
  }

  return (
    <div className="workflow-grid">
      <section className="panel">
        <div className="panel-header panel-header-wrap">
          <div>
            <h2>Monthly report</h2>
            <p className="muted">Aggregated monthly operational summary.</p>
          </div>
          <select value={props.selectedMonth} onChange={(event) => props.onSelectMonth(event.target.value)} aria-label="Selected month">
            {props.availableMonths.map((month) => (
              <option key={month} value={month}>{labelForMonth(month)}</option>
            ))}
          </select>
        </div>

        <div className="kpi-grid kpi-grid-3">
          <Kpi label="Total measurements" value={String(stats.total)} />
          <Kpi label="Average methane" value={`${numberFormat(stats.averageMethane, 1)}%`} />
          <Kpi label="Average gas flow" value={`${numberFormat(stats.averageGasFlow, 1)} m3/h`} />
          <Kpi label="Average biogas yield" value={`${numberFormat(stats.averageBiogasYield, 2)} m3/t`} />
          <Kpi label="AI anomaly count" value={String(stats.anomalyCount)} />
          <Kpi label="Rule warning count" value={String(stats.warningCount)} />
          <Kpi label="Critical count" value={String(stats.criticalCount)} />
          <Kpi label="Expert-review count" value={String(stats.expertReviewCount)} />
          <Kpi label="Maintenance overdue" value={String(stats.maintenanceOverdueCount)} />
          <Kpi label="Anomaly rate" value={percent(stats.anomalyRate, 1)} />
          <Kpi label="Report status" value={status} />
          <Kpi label="Trend note" value={stats.keyTrend} />
        </div>

        <div className="advanced-grid" style={{ marginTop: 12 }}>
          <section className="panel section-panel">
            <h3>Issue-category breakdown</h3>
            <div className="diagnostic-list">
              {stats.issueBreakdown.map((item) => (
                <div className="diagnostic-row" key={item.key}><strong>{item.key}</strong><span>{item.count}</span></div>
              ))}
              {!stats.issueBreakdown.length && <p className="muted">No issue-category data for this month.</p>}
            </div>
          </section>
          <section className="panel section-panel">
            <h3>Trigger-source breakdown</h3>
            <div className="diagnostic-list">
              {stats.triggerBreakdown.map((item) => (
                <div className="diagnostic-row" key={item.key}><strong>{item.key}</strong><span>{item.count}</span></div>
              ))}
              {!stats.triggerBreakdown.length && <p className="muted">No trigger-source data for this month.</p>}
            </div>
          </section>
          <section className="panel section-panel">
            <h3>Important anomaly list</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Measurement ID</th>
                    <th>Status</th>
                    <th>Issue category</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.importantRecords.map((record) => (
                    <tr key={record.measurement_id}>
                      <td>{record.date}</td>
                      <td>{record.measurement_id}</td>
                      <td>{record.overall_rule_status === "Critical" ? "Critical Rule" : record.overall_rule_status === "Warning" ? "Rule Warning" : record.anomaly_flag === "Anomaly" ? "AI Anomaly" : "Needs review"}</td>
                      <td>{record.possible_issue_category ?? "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!stats.importantRecords.length && <p className="muted">No important anomalies in this month.</p>}
          </section>
        </div>

        <details className="details-panel" style={{ marginTop: 12 }}>
          <summary>View detailed measurement history</summary>
          <div className="table-scroll" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Measurement ID</th>
                  <th>Date</th>
                  <th>Rule</th>
                  <th>AI</th>
                  <th>Trigger</th>
                  <th>Issue category</th>
                </tr>
              </thead>
              <tbody>
                {stats.records.map((record) => (
                  <tr key={record.measurement_id}>
                    <td>{record.measurement_id}</td>
                    <td>{record.date}</td>
                    <td>{record.overall_rule_status}</td>
                    <td>{record.anomaly_flag}</td>
                    <td>{record.trigger_source ?? "None"}</td>
                    <td>{record.possible_issue_category ?? "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{props.role === "expert" ? "Monthly report review" : "Report workflow actions"}</h2>
            <p className="muted">Draft, review, approve, and message workflow updates.</p>
          </div>
        </div>

        {props.role === "operator" ? (
          <>
            <label className="field">
              <span>Operator note</span>
              <textarea className="message-input" rows={4} value={operatorNote} onChange={(event) => setOperatorNote(event.target.value)} />
            </label>
            <div className="drawer-actions">
              <button className="primary-button" type="button" onClick={props.onGenerate}>Generate report</button>
              <button className="secondary-button" type="button" onClick={() => props.onSaveReport({ operatorNote })}>Save note</button>
              <button className="secondary-button" type="button" onClick={props.onSendForReview}>
                <Send size={16} aria-hidden="true" /> Send report for expert review
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="field">
              <span>Expert comment</span>
              <textarea className="message-input" rows={4} value={expertComment} onChange={(event) => setExpertComment(event.target.value)} />
            </label>
            <div className="drawer-actions">
              <button className="secondary-button" type="button" onClick={() => props.onSaveReport({ expertComment })}>Save comment</button>
              <button className="secondary-button" type="button" onClick={props.onRequestChanges}>Request changes</button>
              <button className="primary-button" type="button" onClick={props.onApprove}>
                <CheckCircle2 size={16} aria-hidden="true" /> Approve report
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Kpi(props: { label: string; value: string }) {
  return (
    <div className="kpi">
      <span className="muted">{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
