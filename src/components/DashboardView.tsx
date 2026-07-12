import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Database,
  Download,
  FileText,
  Printer,
  Settings2
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  AnalysisContext,
  AnalysisResult,
  ApiMetadata,
  ChartMetric,
  DashboardMode,
  DataSourceState,
  DailyAggregate,
  HistoryRecord,
  PeriodKey,
  PeriodKpis,
  Severity,
  WorkflowCase
} from "../types/smartcontrol";
import { isAiOnlyAnomaly } from "../utils/anomaly";
import { compactNumber, numberFormat, percent } from "../utils/format";
import { chartMetrics, ruleBreakdown } from "../utils/history";
import { displayTriggerSource, getUnifiedStatus, severityClass } from "../utils/status";
import { describeCase } from "../utils/workflow";
import { PeriodSelector } from "./PeriodSelector";

const ruleRows = [
  { key: "ph", alert: "ph_alert", label: "pH", value: "ph_value", unit: "pH" },
  { key: "temperature", alert: "temperature_alert", label: "Temperature", value: "temperature_c", unit: "deg C" },
  { key: "oxygen", alert: "oxygen_alert", label: "Oxygen", value: "oxygen_percent", unit: "%" },
  { key: "methane", alert: "methane_alert", label: "Methane", value: "methane_percent", unit: "%" },
  { key: "h2s", alert: "h2s_alert", label: "H2S", value: "h2s_ppm", unit: "ppm" },
  { key: "maintenance", alert: "maintenance_alert", label: "Maintenance", value: "maintenance_status", unit: "" }
] as const;

export function DashboardView(props: {
  mode: DashboardMode;
  analysis: AnalysisResult;
  context: AnalysisContext | null;
  metadata: ApiMetadata;
  dataSource: DataSourceState;
  dailyData: DailyAggregate[];
  periodHistory: HistoryRecord[];
  kpis: PeriodKpis;
  selectedMetric: ChartMetric;
  setSelectedMetric: (metric: ChartMetric) => void;
  reportHref: string;
  printReport: () => void;
  caseItem: WorkflowCase | null;
  selectedPeriod: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
}) {
  const selectedMetricInfo = chartMetrics.find((metric) => metric.key === props.selectedMetric) ?? chartMetrics[0];
  const unifiedStatus = getUnifiedStatus(props.analysis);

  return (
    <>
      <StatusStrip analysis={props.analysis} dataSource={props.dataSource} unifiedStatus={unifiedStatus} caseItem={props.caseItem} />
      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-header">
          <div>
            <h2>Operational guidance</h2>
            <p className="muted">What requires attention and what to do next.</p>
          </div>
          <FileText size={20} aria-hidden="true" />
        </div>
        <div className="diagnostic-list">
          <DiagnosticLine label="Case status" value={describeCase(props.caseItem, props.analysis)} />
          <DiagnosticLine label="Short explanation" value={props.analysis.short_explanation} />
          <DiagnosticLine label="Recommended action" value={props.analysis.recommended_action} />
        </div>
      </section>
      <DataContextPanel context={props.context} metadata={props.metadata} />
      {isAiOnlyAnomaly(props.analysis) && <AiOnlyAnomalyBanner analysis={props.analysis} metadata={props.metadata} />}
      {props.mode === "Basic" ? (
        <BasicView
          analysis={props.analysis}
          dailyData={props.dailyData}
          periodHistory={props.periodHistory}
          kpis={props.kpis}
          metadata={props.metadata}
          selectedMetric={props.selectedMetric}
          setSelectedMetric={props.setSelectedMetric}
          metricInfo={selectedMetricInfo}
          selectedPeriod={props.selectedPeriod}
          onPeriodChange={props.onPeriodChange}
        />
      ) : (
        <AdvancedView
          analysis={props.analysis}
          periodHistory={props.periodHistory}
          metadata={props.metadata}
          selectedMetric={props.selectedMetric}
          setSelectedMetric={props.setSelectedMetric}
          metricInfo={selectedMetricInfo}
          selectedPeriod={props.selectedPeriod}
          onPeriodChange={props.onPeriodChange}
          dailyData={props.dailyData}
          kpis={props.kpis}
        />
      )}

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-header">
          <div>
            <h2>Report</h2>
            <p className="muted">Download and print the current model-backed report.</p>
          </div>
          <div className="report-actions">
            <a className="secondary-button" href={props.reportHref} download="smartcontrol-report.html">
              <Download size={17} aria-hidden="true" /> Download HTML
            </a>
            <button className="secondary-button" type="button" onClick={props.printReport}>
              <Printer size={17} aria-hidden="true" /> Print/Save as PDF
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function DataSourceIndicator(props: {
  dataSource: DataSourceState;
  isApiConnected: boolean;
  isAnalyzeAvailable: boolean;
}) {
  return (
    <div className="data-source" aria-label="Data source status">
      <span className={`badge ${props.isApiConnected ? "connected" : "error"}`}>
        <Database size={14} aria-hidden="true" />
        {props.isApiConnected ? "Live API connected" : "API unavailable"}
      </span>
      <span className={`badge ${props.dataSource === "Static historical fallback" ? "fallback" : "connected"}`}>
        <Activity size={14} aria-hidden="true" />
        {props.dataSource}
      </span>
      {!props.isAnalyzeAvailable && <span className="badge error">Live analysis disabled</span>}
    </div>
  );
}

function DataContextPanel(props: {
  context: AnalysisContext | null;
  metadata: ApiMetadata;
}) {
  const context = props.context ?? {
    measurementId: "Unknown",
    measurementDate: "Unknown",
    plantId: "Plant_01",
    scenarioLabel: "Current measurement",
    sourceLabel: "Analysis context is being prepared",
    submittedAt: new Date().toISOString()
  };

  return (
    <section className="context-panel" aria-label="Current data context">
      <div>
        <span className="sidebar-label">Current data context</span>
        <h2>{context.scenarioLabel}</h2>
        <p className="muted">{context.sourceLabel}</p>
      </div>
      <div className="context-items">
        <ContextItem label="Measurement ID" value={context.measurementId} />
        <ContextItem label="Measurement date" value={context.measurementDate} />
        <ContextItem label="Plant" value={context.plantId} />
        <ContextItem label="Model scope" value={props.metadata.model_scope} />
        <ContextItem label="History rows" value={String(props.metadata.historical_row_count)} />
        <ContextItem label="Submitted" value={new Date(context.submittedAt).toLocaleString()} />
      </div>
    </section>
  );
}

function ContextItem(props: { label: string; value: string }) {
  return (
    <div className="context-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function AiOnlyAnomalyBanner(props: {
  analysis: AnalysisResult;
  metadata: ApiMetadata;
}) {
  return (
    <section className="ai-only-banner" aria-label="AI-only anomaly explanation">
      <div className="ai-only-heading">
        <div>
          <span className="sidebar-label">AI-only anomaly</span>
          <h2>No deterministic rule threshold was crossed</h2>
          <p>
            AI-only anomaly detected. All monitored parameters remain within individual rule-based limits.
            However, the Isolation Forest detected an unusual multivariable relationship and requires expert validation.
          </p>
        </div>
        <BrainCircuit size={30} aria-hidden="true" />
      </div>
      <div className="ai-only-facts">
        <ContextItem label="Rule-based status" value={props.analysis.overall_rule_status} />
        <ContextItem label="AI anomaly status" value={props.analysis.anomaly_flag} />
        <ContextItem label="Signed score" value={numberFormat(props.analysis.anomaly_score, 5)} />
        <ContextItem label="Threshold" value={numberFormat(props.metadata.anomaly_threshold, 0)} />
        <ContextItem label="Trigger source" value={displayTriggerSource(props.analysis.trigger_source)} />
        <ContextItem label="Expert review required" value={props.analysis.expert_review_required} />
      </div>
    </section>
  );
}

function StatusStrip(props: {
  analysis: AnalysisResult;
  unifiedStatus: Severity;
  dataSource: string;
  caseItem: WorkflowCase | null;
}) {
  return (
    <section className="status-grid" aria-label="Current status summary">
      <div className="status-panel primary-status">
        <span className="sidebar-label">Unified plant status</span>
        <div className="status-value">
          <span className={`status-pill ${severityClass(props.unifiedStatus)}`}>{props.unifiedStatus}</span>
        </div>
      </div>
      <StatusSmall label="Rule-based status" value={props.analysis.overall_rule_status} severity={props.analysis.overall_rule_status} />
      <StatusSmall label="AI anomaly status" value={props.analysis.anomaly_flag} severity={props.analysis.anomaly_flag === "Anomaly" ? "Warning" : "Normal"} />
      <StatusSmall label="Expert review status" value={props.caseItem?.status ?? (props.analysis.expert_review_required === "Yes" ? "Awaiting expert review" : "Not submitted")} severity={props.analysis.expert_review_required === "Yes" ? "Warning" : "Normal"} />
      <div className="status-panel">
        <span className="sidebar-label">Context</span>
        <strong>{displayTriggerSource(props.analysis.trigger_source)}</strong>
        <p className="muted">{props.dataSource}</p>
      </div>
    </section>
  );
}

function StatusSmall(props: { label: string; value: string; severity: Severity }) {
  return (
    <div className="status-panel">
      <span className="sidebar-label">{props.label}</span>
      <strong className={`status-pill ${severityClass(props.severity)}`}>{props.value}</strong>
    </div>
  );
}

function BasicView(props: {
  analysis: AnalysisResult;
  dailyData: DailyAggregate[];
  periodHistory: HistoryRecord[];
  kpis: PeriodKpis;
  metadata: ApiMetadata;
  selectedMetric: ChartMetric;
  setSelectedMetric: (metric: ChartMetric) => void;
  metricInfo: { key: ChartMetric; label: string; unit: string };
  selectedPeriod: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
}) {
  const metricCards: Array<{
    label: string;
    value: number | string;
    unit: string;
    status: Severity;
    reference: string;
    explanation: string;
    trendKey: ChartMetric;
  }> = [
    {
      label: "pH",
      value: props.analysis.ph_value,
      unit: "pH",
      status: props.analysis.ph_alert,
      reference: props.metadata.rule_thresholds.ph.normal,
      explanation: "Biological operating acidity is checked against backend pH rules.",
      trendKey: "ph_value"
    },
    {
      label: "Temperature",
      value: props.analysis.temperature_c,
      unit: "deg C",
      status: props.analysis.temperature_alert,
      reference: props.metadata.rule_thresholds.temperature.normal,
      explanation: "Digester temperature is monitored for mesophilic operating stability.",
      trendKey: "temperature_c"
    },
    {
      label: "Methane",
      value: props.analysis.methane_percent,
      unit: "%",
      status: props.analysis.methane_alert,
      reference: props.metadata.rule_thresholds.methane.normal,
      explanation: "Methane concentration supports gas quality review.",
      trendKey: "methane_percent"
    },
    {
      label: "Biogas yield",
      value: props.analysis.biogas_yield_m3_per_ton,
      unit: "m3/t",
      status: props.analysis.anomaly_flag === "Anomaly" ? "Warning" : "Normal",
      reference: "Model-derived engineered feature",
      explanation: "Daily conversion efficiency indicator from feedstock to biogas output.",
      trendKey: "biogas_yield_m3_per_ton"
    },
    {
      label: "H2S",
      value: props.analysis.h2s_ppm,
      unit: "ppm",
      status: props.analysis.h2s_alert,
      reference: props.metadata.rule_thresholds.h2s.normal,
      explanation: "H2S is tracked for gas-treatment and equipment-protection risk.",
      trendKey: "h2s_ppm"
    },
    {
      label: "Maintenance",
      value: props.analysis.maintenance_status,
      unit: "",
      status: props.analysis.maintenance_alert,
      reference: props.metadata.rule_thresholds.maintenance.normal,
      explanation: "Maintenance combines status, vibration, and pressure checks.",
      trendKey: "compressor_vibration_mm_s"
    }
  ];

  return (
    <div className="dashboard-grid">
      <div className="advanced-section">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Operational cards</h2>
              <p className="muted">Current submitted measurement with compact daily mean trends.</p>
            </div>
          </div>
          <div className="metric-grid">
            {metricCards.map((card) => (
              <MetricCard key={card.label} {...card} dailyData={props.dailyData} />
            ))}
          </div>
        </section>

        <TrendPanel
          dailyData={props.dailyData}
          selectedMetric={props.selectedMetric}
          setSelectedMetric={props.setSelectedMetric}
          metricInfo={props.metricInfo}
          selectedPeriod={props.selectedPeriod}
          onPeriodChange={props.onPeriodChange}
        />
      </div>

      <div className="advanced-section">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Historical KPI summary</h2>
              <p className="muted">Derived only from the selected history period.</p>
            </div>
          </div>
          <div className="kpi-grid">
            <Kpi label="Average methane" value={`${numberFormat(props.kpis.averageMethane, 1)}%`} />
            <Kpi label="Average biogas yield" value={`${numberFormat(props.kpis.averageBiogasYield, 2)} m3/t`} />
            <Kpi label="Average gas flow" value={`${numberFormat(props.kpis.averageGasFlow, 1)} m3/h`} />
            <Kpi label="AI anomaly rate" value={percent(props.kpis.aiAnomalyRate)} />
            <Kpi label="Rule escalation rate" value={percent(props.kpis.ruleEscalationRate)} />
            <Kpi label="Expert-review count" value={String(props.kpis.expertReviewCount)} />
            <Kpi label="Maintenance overdue" value={String(props.kpis.maintenanceOverdueCount)} />
            <Kpi label="Observations in period" value={String(props.periodHistory.length)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard(props: {
  label: string;
  value: number | string;
  unit: string;
  status: Severity;
  reference: string;
  explanation: string;
  trendKey: ChartMetric;
  dailyData: DailyAggregate[];
}) {
  const trend = props.dailyData.slice(-14).map((item) => Number(item[props.trendKey] ?? 0));

  return (
    <article className="metric-card">
      <div className="metric-top">
        <div>
          <h3>{props.label}</h3>
          <div className="metric-value">
            {typeof props.value === "number" ? compactNumber(props.value) : props.value}
            {props.unit && <span className="metric-unit"> {props.unit}</span>}
          </div>
        </div>
        <span className={`status-pill ${severityClass(props.status)}`}>{props.status}</span>
      </div>
      <SimpleSparkline values={trend} />
      <p className="muted">Reference: {props.reference}</p>
      <p>{props.explanation}</p>
    </article>
  );
}

function SimpleSparkline(props: { values: number[] }) {
  const width = 220;
  const height = 36;
  const values = props.values.filter((value) => Number.isFinite(value));
  if (values.length < 2) {
    return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-label="Daily mean trend">
      <polyline points={points} fill="none" stroke="#008eca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendPanel(props: {
  dailyData: DailyAggregate[];
  selectedMetric: ChartMetric;
  setSelectedMetric: (metric: ChartMetric) => void;
  metricInfo: { key: ChartMetric; label: string; unit: string };
  selectedPeriod: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
}) {
  const chartData = props.dailyData.map((item) => ({
    date: String(item.date),
    mean: Number(item[props.selectedMetric] ?? 0),
    min: Number((item.min as Record<string, number>)[props.selectedMetric] ?? 0),
    max: Number((item.max as Record<string, number>)[props.selectedMetric] ?? 0)
  }));

  return (
    <section className="panel">
      <div className="panel-header panel-header-wrap">
        <div>
          <h2>Historical trends</h2>
          <p className="muted">Daily mean with min/max range from selected period.</p>
        </div>
        <div className="trend-controls">
          <PeriodSelector value={props.selectedPeriod} onChange={props.onPeriodChange} compact />
          <select aria-label="Trend metric" value={props.selectedMetric} onChange={(event) => props.setSelectedMetric(event.target.value as ChartMetric)}>
            {chartMetrics.map((metric) => (
              <option key={metric.key} value={metric.key}>{metric.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="chart-box">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={22} />
            <YAxis tick={{ fontSize: 11 }} width={54} />
            <Tooltip formatter={(value) => numberFormat(Number(value), 3)} />
            <Legend />
            <Line type="monotone" dataKey="mean" name={`${props.metricInfo.label} daily mean`} stroke="#008eca" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="min" name="Daily min" stroke="#7fb743" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="max" name="Daily max" stroke="#d98c23" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function AdvancedView(props: {
  analysis: AnalysisResult;
  periodHistory: HistoryRecord[];
  metadata: ApiMetadata;
  selectedMetric: ChartMetric;
  setSelectedMetric: (metric: ChartMetric) => void;
  metricInfo: { key: ChartMetric; label: string; unit: string };
  selectedPeriod: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  dailyData: DailyAggregate[];
  kpis: PeriodKpis;
}) {
  const diagnostics = props.analysis.diagnostics;
  const currentRuleBreakdown = ruleBreakdown(props.analysis);
  const rawChartData = props.periodHistory.map((record) => ({ measurement_id: record.measurement_id, value: record[props.selectedMetric], date: record.date }));

  const anomalyData = props.periodHistory.map((record) => ({ measurement_id: record.measurement_id, anomaly_score: record.anomaly_score }));
  anomalyData.push({ measurement_id: "Current", anomaly_score: props.analysis.anomaly_score });

  const radarData = diagnostics
    ? [
        ["Gas-flow residual", diagnostics.robust_metrics.gas_flow_residual.robust_z_score],
        ["Biogas yield", diagnostics.robust_metrics.biogas_yield_m3_per_ton.robust_z_score],
        ["Methane/CO2", diagnostics.robust_metrics.methane_to_co2_ratio.robust_z_score],
        ["H2S", diagnostics.robust_metrics.h2s_ppm.robust_z_score],
        ["Vibration", diagnostics.robust_metrics.compressor_vibration_mm_s.robust_z_score],
        ["Pressure", diagnostics.robust_metrics.pressure_bar.robust_z_score]
      ].map(([metric, value]) => ({ metric, magnitude: Math.min(Math.abs(Number(value ?? 0)), 4), actual: Number(value ?? 0) }))
    : [];

  return (
    <div className="advanced-section">
      <TrendPanel
        dailyData={props.dailyData}
        selectedMetric={props.selectedMetric}
        setSelectedMetric={props.setSelectedMetric}
        metricInfo={props.metricInfo}
        selectedPeriod={props.selectedPeriod}
        onPeriodChange={props.onPeriodChange}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Advanced KPI summary</h2>
            <p className="muted">Technical summary for selected period.</p>
          </div>
        </div>
        <div className="kpi-grid">
          <Kpi label="Average methane" value={`${numberFormat(props.kpis.averageMethane, 1)}%`} />
          <Kpi label="Average biogas yield" value={`${numberFormat(props.kpis.averageBiogasYield, 2)} m3/t`} />
          <Kpi label="Average gas flow" value={`${numberFormat(props.kpis.averageGasFlow, 1)} m3/h`} />
          <Kpi label="AI anomaly rate" value={percent(props.kpis.aiAnomalyRate)} />
        </div>
      </section>

      <div className="advanced-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Rule details</h2>
              <p className="muted">Exact backend rule outputs and thresholds.</p>
            </div>
          </div>
          {ruleRows.map((rule) => {
            const status = props.analysis[rule.alert] as Severity;
            const value = props.analysis[rule.value];
            const threshold = props.metadata.rule_thresholds[rule.key];
            return (
              <div className="rule-row" key={rule.key}>
                <div>
                  <strong>{rule.label}</strong>
                  <p className="muted">
                    {String(value)} {rule.unit} | Normal {threshold.normal}; Warning {threshold.warning}; Critical {threshold.critical}
                  </p>
                </div>
                <span className={`status-pill ${severityClass(status)}`}>{status}</span>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Isolation Forest output</h2>
              <p className="muted">Signed decision score with threshold zero.</p>
            </div>
          </div>
          <div className="diagnostic-list">
            <DiagnosticLine label="Raw anomaly score" value={numberFormat(props.analysis.anomaly_score, 5)} />
            <DiagnosticLine label="Threshold" value="0" />
            <DiagnosticLine label="Anomaly flag" value={props.analysis.anomaly_flag} />
            <DiagnosticLine label="Trigger source" value={displayTriggerSource(props.analysis.trigger_source)} />
            <DiagnosticLine label="Expert review" value={props.analysis.expert_review_required} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Interpretation-reference diagnostics</h2>
              <p className="muted">Robust z-score threshold {props.metadata.robust_z_score_threshold}.</p>
            </div>
          </div>
          {diagnostics ? (
            <div className="diagnostic-list">
              <DiagnosticLine label="Expected gas flow" value={`${numberFormat(diagnostics.expected_gas_flow_m3_h, 2)} m3/h`} />
              <DiagnosticLine label="Actual gas flow" value={`${numberFormat(diagnostics.actual_gas_flow_m3_h, 2)} m3/h`} />
              <DiagnosticLine label="Gas-flow residual" value={`${numberFormat(diagnostics.gas_flow_residual_m3_h, 2)} m3/h`} />
            </div>
          ) : (
            <p className="muted">Diagnostics are available when live API analysis succeeds.</p>
          )}
        </section>
      </div>

      <div className="advanced-grid">
        <section className="panel">
          <div className="panel-header panel-header-wrap">
            <div>
              <h2>Raw trend chart</h2>
              <p className="muted">Measurement-level chart for technical inspection.</p>
            </div>
            <div className="trend-controls">
              <PeriodSelector value={props.selectedPeriod} onChange={props.onPeriodChange} compact />
              <select aria-label="Raw chart metric" value={props.selectedMetric} onChange={(event) => props.setSelectedMetric(event.target.value as ChartMetric)}>
                {chartMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>{metric.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer>
              <LineChart data={rawChartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e9" />
                <XAxis dataKey="measurement_id" tick={{ fontSize: 10 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={54} />
                <Tooltip formatter={(value) => numberFormat(Number(value), 3)} />
                <Line type="monotone" dataKey="value" name={`${props.metricInfo.label} raw`} stroke="#008eca" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Anomaly score chart</h2>
              <p className="muted">Historical scores and current score.</p>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer>
              <LineChart data={anomalyData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e9" />
                <XAxis dataKey="measurement_id" tick={{ fontSize: 10 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={54} />
                <Tooltip formatter={(value) => numberFormat(Number(value), 5)} />
                <ReferenceLine y={0} stroke="#9d1f16" label="Threshold 0" />
                <Line type="monotone" dataKey="anomaly_score" name="Score" stroke="#4d6570" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Rule breakdown</h2>
              <p className="muted">Six-rule summary with robust z-view.</p>
            </div>
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <div className="chart-box" style={{ height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={currentRuleBreakdown} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e9" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Bar dataKey="count" fill="#008eca" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-box" style={{ height: 220 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(_value, _name, item) => numberFormat(item.payload.actual, 3)} />
                <Radar name="|Robust z| clipped at 4" dataKey="magnitude" stroke="#008eca" fill="#008eca" fillOpacity={0.22} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function DiagnosticLine(props: { label: string; value: string }) {
  return (
    <div className="diagnostic-row">
      <strong>{props.label}</strong>
      <span>{props.value}</span>
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
