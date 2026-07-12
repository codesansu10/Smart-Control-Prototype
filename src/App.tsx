import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileText,
  Gauge,
  History,
  Loader2,
  Printer,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  X
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
  AnalysisResult,
  ApiMetadata,
  ChartMetric,
  DashboardMode,
  DataSourceState,
  HistoryRecord,
  PeriodKey,
  PlantMeasurement,
  ScenarioKey,
  Severity
} from "./types/smartcontrol";
import {
  analyzeMeasurement,
  getHealth,
  getHistory,
  getMetadata,
  getStaticHistory
} from "./services/api";
import {
  loadPersistedState,
  savePersistedState
} from "./services/storage";
import { useEscapeKey } from "./hooks/useEscapeKey";
import { fallbackMetadata } from "./utils/defaults";
import { compactNumber, numberFormat, percent } from "./utils/format";
import {
  aggregateDaily,
  calculatePeriodKpis,
  chartMetrics,
  getScenarioRecord,
  ruleBreakdown,
  selectPeriod
} from "./utils/history";
import {
  measurementFields,
  measurementFromHistory,
  validateMeasurement
} from "./utils/measurements";
import { generateHtmlReport } from "./utils/report";
import {
  displayTriggerSource,
  getUnifiedStatus,
  severityClass
} from "./utils/status";

const scenarioLabels: Record<ScenarioKey, string> = {
  latest: "Latest measurement",
  "ai-anomaly": "AI anomaly example",
  "critical-rule": "Critical rule example",
  custom: "Custom measurement"
};

const periodLabels: Record<PeriodKey, string> = {
  "7": "7 available days",
  "30": "30 available days",
  all: "All data"
};

const ruleRows = [
  { key: "ph", alert: "ph_alert", label: "pH", value: "ph_value", unit: "pH" },
  { key: "temperature", alert: "temperature_alert", label: "Temperature", value: "temperature_c", unit: "deg C" },
  { key: "oxygen", alert: "oxygen_alert", label: "Oxygen", value: "oxygen_percent", unit: "%" },
  { key: "methane", alert: "methane_alert", label: "Methane", value: "methane_percent", unit: "%" },
  { key: "h2s", alert: "h2s_alert", label: "H2S", value: "h2s_ppm", unit: "ppm" },
  { key: "maintenance", alert: "maintenance_alert", label: "Maintenance", value: "maintenance_status", unit: "" }
] as const;

function App() {
  const persisted = useMemo(() => loadPersistedState(), []);
  const [mode, setMode] = useState<DashboardMode>(persisted.mode);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>(persisted.selectedPeriod);
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>(persisted.selectedChartMetric);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>(persisted.selectedScenario);
  const [lastCustomMeasurement, setLastCustomMeasurement] = useState<PlantMeasurement | null>(persisted.lastCustomMeasurement);
  const [metadata, setMetadata] = useState<ApiMetadata>(fallbackMetadata);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceState>("API unavailable");
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isAnalyzeAvailable, setIsAnalyzeAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formState, setFormState] = useState<PlantMeasurement | null>(lastCustomMeasurement);
  const [announcement, setAnnouncement] = useState("");
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const periodHistory = useMemo(
    () => selectPeriod(historyRecords, selectedPeriod),
    [historyRecords, selectedPeriod]
  );

  const dailyData = useMemo(() => aggregateDaily(periodHistory), [periodHistory]);
  const kpis = useMemo(() => calculatePeriodKpis(periodHistory), [periodHistory]);
  const selectedMetricInfo = chartMetrics.find((metric) => metric.key === selectedChartMetric) ?? chartMetrics[0];
  const unifiedStatus = currentAnalysis ? getUnifiedStatus(currentAnalysis) : "Normal";
  const reportHtml = useMemo(() => {
    if (!currentAnalysis) {
      return "";
    }

    return generateHtmlReport({
      analysis: currentAnalysis,
      history: periodHistory,
      kpis,
      scenario: selectedScenario,
      periodLabel: periodLabels[selectedPeriod],
      dataSource,
      generatedAt: new Date().toISOString(),
      limitations: metadata.model_limitations
    });
  }, [currentAnalysis, dataSource, kpis, metadata.model_limitations, periodHistory, selectedPeriod, selectedScenario]);
  const reportHref = reportHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(reportHtml)}` : "#";

  const applyStaticScenario = useCallback((records: HistoryRecord[], scenario: ScenarioKey) => {
    if (scenario === "custom") {
      return;
    }

    const record = getScenarioRecord(records, scenario);
    if (!record) {
      return;
    }

    setCurrentAnalysis(record);
    setFormState(measurementFromHistory(record));
    setAnnouncement(`${scenarioLabels[scenario]} loaded from historical workbook data.`);
  }, []);

  const runAnalysis = useCallback(async (
    measurement: PlantMeasurement,
    scenario: ScenarioKey,
    fallbackRecord?: HistoryRecord
  ) => {
    if (!isAnalyzeAvailable) {
      if (fallbackRecord) {
        setCurrentAnalysis(fallbackRecord);
        setDataSource("Static historical fallback");
      }
      return;
    }

    setIsAnalyzing(true);
    setApiError(null);
    try {
      const result = await analyzeMeasurement(measurement);
      setCurrentAnalysis(result);
      setDataSource("Current analysis");
      setAnnouncement(`${scenarioLabels[scenario]} analyzed through the live API.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      setApiError(message);
      setIsAnalyzeAvailable(false);
      if (fallbackRecord) {
        setCurrentAnalysis(fallbackRecord);
        setDataSource("Static historical fallback");
      } else {
        setDataSource("API unavailable");
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzeAvailable]);

  const loadScenario = useCallback(async (scenario: ScenarioKey, records = historyRecords) => {
    setSelectedScenario(scenario);

    if (scenario === "custom") {
      if (lastCustomMeasurement) {
        setFormState(lastCustomMeasurement);
      }
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setDrawerOpen(true);
      return;
    }

    const record = getScenarioRecord(records, scenario);
    if (!record) {
      setApiError(`Scenario record for ${scenarioLabels[scenario]} was not found.`);
      return;
    }

    const measurement = measurementFromHistory(record);
    setFormState(measurement);
    await runAnalysis(measurement, scenario, record);
  }, [historyRecords, lastCustomMeasurement, runAnalysis]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsLoading(true);
      setApiError(null);

      try {
        await getHealth();
        if (cancelled) {
          return;
        }
        setIsApiConnected(true);
        setIsAnalyzeAvailable(true);
        setDataSource("Live API connected");

        const apiMetadata = await getMetadata();
        const recentHistory = await getHistory(30);
        const fullHistory = await getHistory("all");

        if (cancelled) {
          return;
        }

        const records = fullHistory.records.length ? fullHistory.records : recentHistory.records;
        setMetadata(apiMetadata);
        setHistoryRecords(records);

        const scenario = selectedScenario === "custom" ? "latest" : selectedScenario;
        const record = getScenarioRecord(records, scenario);
        if (record) {
          const measurement = measurementFromHistory(record);
          setFormState(measurement);
          try {
            const result = await analyzeMeasurement(measurement);
            if (!cancelled) {
              setCurrentAnalysis(result);
              setDataSource("Current analysis");
              setAnnouncement(`${scenarioLabels[scenario]} analyzed through the live API.`);
            }
          } catch (analysisError) {
            if (!cancelled) {
              setApiError(analysisError instanceof Error ? analysisError.message : "Initial analysis failed");
              setIsAnalyzeAvailable(false);
              setCurrentAnalysis(record);
              setDataSource("Static historical fallback");
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "API startup failed";
        if (!cancelled) {
          setApiError(message);
          setIsApiConnected(false);
          setIsAnalyzeAvailable(false);
          setDataSource("Static historical fallback");
          try {
            const staticPayload = await getStaticHistory();
            if (cancelled) {
              return;
            }
            setHistoryRecords(staticPayload.records);
            applyStaticScenario(staticPayload.records, selectedScenario === "custom" ? "latest" : selectedScenario);
          } catch (staticError) {
            setDataSource("API unavailable");
            setApiError(staticError instanceof Error ? staticError.message : "Static fallback failed");
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    savePersistedState({
      mode,
      selectedPeriod,
      selectedChartMetric,
      lastCustomMeasurement,
      selectedScenario
    });
  }, [lastCustomMeasurement, mode, selectedChartMetric, selectedPeriod, selectedScenario]);

  function closeDrawer() {
    setDrawerOpen(false);
    restoreFocusRef.current?.focus();
  }

  async function submitMeasurement(measurement: PlantMeasurement) {
    const errors = validateMeasurement(measurement, metadata.supported_maintenance_status_values);
    if (errors.length) {
      setApiError(errors.join("; "));
      return;
    }

    setFormState(measurement);
    setLastCustomMeasurement(measurement);
    setSelectedScenario("custom");
    await runAnalysis(measurement, "custom");
    closeDrawer();
  }

  function openDrawer() {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    if (!formState && historyRecords.length) {
      const latest = getScenarioRecord(historyRecords, "latest");
      if (latest) {
        setFormState(measurementFromHistory(latest));
      }
    }
    setDrawerOpen(true);
  }

  function resetToLatest() {
    void loadScenario("latest");
  }

  function printReport() {
    if (!currentAnalysis) {
      return;
    }

    const html = reportHtml;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    printWindow?.document.write(html);
    printWindow?.document.close();
    printWindow?.print();
  }

  if (isLoading || !currentAnalysis) {
    return (
      <div className="app-shell">
        <Sidebar
          mode={mode}
          setMode={setMode}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          selectedScenario={selectedScenario}
          loadScenario={loadScenario}
          isAnalyzing={isAnalyzing}
        />
        <main className="main">
          <div className="empty-state">
            <Loader2 aria-hidden="true" /> Loading SMARTCONTROL 2.0 dashboard data.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        mode={mode}
        setMode={setMode}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        selectedScenario={selectedScenario}
        loadScenario={loadScenario}
        isAnalyzing={isAnalyzing}
      />

      <main className="main">
        <div className="topbar">
          <div className="title-block">
            <span className="eyebrow">SMARTCONTROL 2.0 | Plant_01</span>
            <h1>Model-backed monitoring dashboard</h1>
            <p className="muted">
              Historical workbook period {metadata.dataset_date_range.start} through {metadata.dataset_date_range.end}; current analysis is a submitted measurement.
            </p>
          </div>

          <div className="top-actions">
            <DataSourceIndicator
              dataSource={dataSource}
              isApiConnected={isApiConnected}
              isAnalyzeAvailable={isAnalyzeAvailable}
            />
            <button className="secondary-button" type="button" onClick={openDrawer}>
              <SlidersHorizontal size={17} aria-hidden="true" /> Analyze
            </button>
            <button className="icon-button" type="button" onClick={resetToLatest} aria-label="Reset to latest measurement">
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        {apiError && <div className="error-box" role="alert">{apiError}</div>}
        <div className="sr-only" aria-live="polite">{announcement}</div>

        <StatusStrip analysis={currentAnalysis} dataSource={dataSource} unifiedStatus={unifiedStatus} />

        {mode === "Normal" ? (
          <NormalMode
            analysis={currentAnalysis}
            dailyData={dailyData}
            periodHistory={periodHistory}
            kpis={kpis}
            metadata={metadata}
            selectedMetric={selectedChartMetric}
            setSelectedMetric={setSelectedChartMetric}
            metricInfo={selectedMetricInfo}
          />
        ) : (
          <AdvancedMode
            analysis={currentAnalysis}
            periodHistory={periodHistory}
            dailyData={dailyData}
            metadata={metadata}
            selectedMetric={selectedChartMetric}
            setSelectedMetric={setSelectedChartMetric}
            metricInfo={selectedMetricInfo}
          />
        )}

        <section className="panel" style={{ marginTop: 14 }}>
          <div className="panel-header">
            <div>
              <h2>Report</h2>
              <p className="muted">Self-contained HTML generated from current API and selected-period history.</p>
            </div>
            <div className="report-actions">
              <a
                className="secondary-button"
                href={reportHref}
                download={`smartcontrol-report-${selectedScenario}.html`}
              >
                <Download size={17} aria-hidden="true" /> Download HTML
              </a>
              <button className="secondary-button" type="button" onClick={printReport}>
                <Printer size={17} aria-hidden="true" /> Print
              </button>
            </div>
          </div>
        </section>

        <p style={{ marginTop: 14 }}>
          <a href="/legacy/index.html" className="muted">Legacy workflow prototype</a>
        </p>
      </main>

      {drawerOpen && formState && (
        <MeasurementDrawer
          initialMeasurement={formState}
          metadata={metadata}
          onClose={closeDrawer}
          onSubmit={submitMeasurement}
          isAnalyzing={isAnalyzing}
          loadScenario={loadScenario}
          latestMeasurement={getScenarioRecord(historyRecords, "latest")}
        />
      )}
    </div>
  );
}

function Sidebar(props: {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  selectedPeriod: PeriodKey;
  setSelectedPeriod: (period: PeriodKey) => void;
  selectedScenario: ScenarioKey;
  loadScenario: (scenario: ScenarioKey) => Promise<void>;
  isAnalyzing: boolean;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/assets/logo-oekobit.png" alt="OEKOBIT" />
      </div>
      <span className="scope-chip">Plant_01 model scope</span>

      <div className="sidebar-section">
        <span className="sidebar-label">Mode</span>
        <div className="segmented" role="group" aria-label="Dashboard mode">
          {(["Normal", "Advanced"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={props.mode === item ? "active" : ""}
              onClick={() => props.setMode(item)}
            >
              {item === "Normal" ? <Gauge size={16} aria-hidden="true" /> : <Settings2 size={16} aria-hidden="true" />}
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">Period</span>
        <div className="period-controls" role="group" aria-label="History period">
          {(["7", "30", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={props.selectedPeriod === item ? "active" : ""}
              onClick={() => props.setSelectedPeriod(item)}
            >
              <History size={16} aria-hidden="true" />
              {periodLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">Scenario</span>
        <div className="scenario-controls">
          {(["latest", "ai-anomaly", "critical-rule", "custom"] as const).map((scenario) => (
            <button
              key={scenario}
              type="button"
              className={props.selectedScenario === scenario ? "active" : ""}
              onClick={() => void props.loadScenario(scenario)}
              disabled={props.isAnalyzing}
            >
              {scenario === "latest" && <CheckCircle2 size={16} aria-hidden="true" />}
              {scenario === "ai-anomaly" && <BrainCircuit size={16} aria-hidden="true" />}
              {scenario === "critical-rule" && <AlertTriangle size={16} aria-hidden="true" />}
              {scenario === "custom" && <ClipboardList size={16} aria-hidden="true" />}
              {scenarioLabels[scenario]}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DataSourceIndicator(props: {
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

function StatusStrip(props: {
  analysis: AnalysisResult;
  unifiedStatus: Severity;
  dataSource: string;
}) {
  const analysisTime = new Date().toLocaleString();

  return (
    <section className="status-grid" aria-label="Current status summary">
      <div className="status-panel primary-status">
        <span className="sidebar-label">Unified status</span>
        <div className="status-value">
          <span className={`status-pill ${severityClass(props.unifiedStatus)}`}>{props.unifiedStatus}</span>
        </div>
        <p className="muted">Critical rule wins; otherwise warning includes rule warnings or AI anomaly.</p>
      </div>
      <StatusSmall label="Rule-based status" value={props.analysis.overall_rule_status} severity={props.analysis.overall_rule_status} />
      <StatusSmall label="AI anomaly status" value={props.analysis.anomaly_flag} severity={props.analysis.anomaly_flag === "Anomaly" ? "Warning" : "Normal"} />
      <StatusSmall label="Expert review" value={props.analysis.expert_review_required} severity={props.analysis.expert_review_required === "Yes" ? "Warning" : "Normal"} />
      <div className="status-panel">
        <span className="sidebar-label">Context</span>
        <strong>{displayTriggerSource(props.analysis.trigger_source)}</strong>
        <p className="muted">{props.dataSource}</p>
        <p className="muted">{analysisTime}</p>
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

function NormalMode(props: {
  analysis: AnalysisResult;
  dailyData: ReturnType<typeof aggregateDaily>;
  periodHistory: HistoryRecord[];
  kpis: ReturnType<typeof calculatePeriodKpis>;
  metadata: ApiMetadata;
  selectedMetric: ChartMetric;
  setSelectedMetric: (metric: ChartMetric) => void;
  metricInfo: { key: ChartMetric; label: string; unit: string };
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
      trendKey: "ph_value" as ChartMetric
    },
    {
      label: "Temperature",
      value: props.analysis.temperature_c,
      unit: "deg C",
      status: props.analysis.temperature_alert,
      reference: props.metadata.rule_thresholds.temperature.normal,
      explanation: "Digester temperature is monitored for mesophilic operating stability.",
      trendKey: "temperature_c" as ChartMetric
    },
    {
      label: "Methane",
      value: props.analysis.methane_percent,
      unit: "%",
      status: props.analysis.methane_alert,
      reference: props.metadata.rule_thresholds.methane.normal,
      explanation: "Methane concentration supports gas quality review.",
      trendKey: "methane_percent" as ChartMetric
    },
    {
      label: "Biogas yield",
      value: props.analysis.biogas_yield_m3_per_ton,
      unit: "m3/t",
      status: !props.analysis.diagnostics || props.analysis.diagnostics.robust_metrics.biogas_yield_m3_per_ton.deviation === "Normal" ? "Normal" : "Warning",
      reference: "Compared with interpretation-reference baseline",
      explanation: "Yield is interpreted through robust historical deviation, not a deterministic rule.",
      trendKey: "biogas_yield_m3_per_ton" as ChartMetric
    },
    {
      label: "H2S",
      value: props.analysis.h2s_ppm,
      unit: "ppm",
      status: props.analysis.h2s_alert,
      reference: props.metadata.rule_thresholds.h2s.normal,
      explanation: "H2S is tracked for gas-treatment and equipment-protection risk.",
      trendKey: "h2s_ppm" as ChartMetric
    },
    {
      label: "Maintenance",
      value: props.analysis.maintenance_status,
      unit: "",
      status: props.analysis.maintenance_alert,
      reference: props.metadata.rule_thresholds.maintenance.normal,
      explanation: "Maintenance combines status, vibration, and pressure checks.",
      trendKey: "compressor_vibration_mm_s" as ChartMetric
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
        />
      </div>

      <div className="advanced-section">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Executive summary</h2>
              <p className="muted">Plain-language interpretation from the pipeline.</p>
            </div>
            <FileText size={20} aria-hidden="true" />
          </div>
          <div className="diagnostic-list">
            <DiagnosticLine label="Issue category" value={props.analysis.possible_issue_category ?? "None" } />
            <DiagnosticLine label="Explanation" value={props.analysis.short_explanation} />
            <DiagnosticLine label="Recommended action" value={props.analysis.recommended_action} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Period KPIs</h2>
              <p className="muted">Derived only from the selected history period.</p>
            </div>
          </div>
          <div className="kpi-grid">
            <Kpi label="Average methane" value={`${numberFormat(props.kpis.averageMethane, 1)}%`} />
            <Kpi label="Average biogas yield" value={`${numberFormat(props.kpis.averageBiogasYield, 2)} m3/t`} />
            <Kpi label="Average gas flow" value={`${numberFormat(props.kpis.averageGasFlow, 1)} m3/h`} />
            <Kpi label="AI anomaly rate" value={percent(props.kpis.aiAnomalyRate)} />
            <Kpi label="Warning/critical rule rate" value={percent(props.kpis.ruleEscalationRate)} />
            <Kpi label="Expert-review count" value={String(props.kpis.expertReviewCount)} />
            <Kpi label="Maintenance overdue" value={String(props.kpis.maintenanceOverdueCount)} />
            <Kpi label="Raw observations" value={String(props.periodHistory.length)} />
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
  dailyData: ReturnType<typeof aggregateDaily>;
}) {
  const trend = props.dailyData.slice(-14).map((item) => item[props.trendKey]);

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
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-label="Daily mean trend">
      <polyline points={points} fill="none" stroke="#008eca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendPanel(props: {
  dailyData: ReturnType<typeof aggregateDaily>;
  selectedMetric: ChartMetric;
  setSelectedMetric: (metric: ChartMetric) => void;
  metricInfo: { key: ChartMetric; label: string; unit: string };
}) {
  const chartData = props.dailyData.map((item) => ({
    date: item.date,
    mean: item[props.selectedMetric],
    min: item.min[props.selectedMetric],
    max: item.max[props.selectedMetric]
  }));

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Executive trend</h2>
          <p className="muted">Daily mean with daily min/max range from raw workbook observations.</p>
        </div>
        <select
          aria-label="Trend metric"
          value={props.selectedMetric}
          onChange={(event) => props.setSelectedMetric(event.target.value as ChartMetric)}
        >
          {chartMetrics.map((metric) => (
            <option key={metric.key} value={metric.key}>{metric.label}</option>
          ))}
        </select>
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

function AdvancedMode(props: {
  analysis: AnalysisResult;
  periodHistory: HistoryRecord[];
  dailyData: ReturnType<typeof aggregateDaily>;
  metadata: ApiMetadata;
  selectedMetric: ChartMetric;
  setSelectedMetric: (metric: ChartMetric) => void;
  metricInfo: { key: ChartMetric; label: string; unit: string };
}) {
  const diagnostics = props.analysis.diagnostics;
  const rawChartData = props.periodHistory.map((record) => ({
    measurement_id: record.measurement_id,
    value: record[props.selectedMetric],
    date: record.date
  }));
  const anomalyData = props.periodHistory.map((record) => ({
    measurement_id: record.measurement_id,
    anomaly_score: record.anomaly_score,
    current: undefined as number | undefined
  }));
  anomalyData.push({
    measurement_id: "Current",
    anomaly_score: props.analysis.anomaly_score,
    current: props.analysis.anomaly_score
  });
  const positiveScoreCount = props.periodHistory.filter((record) => record.anomaly_score > 0).length;
  const radarData = diagnostics ? [
    ["Gas-flow residual", diagnostics.robust_metrics.gas_flow_residual.robust_z_score],
    ["Biogas yield", diagnostics.robust_metrics.biogas_yield_m3_per_ton.robust_z_score],
    ["Methane/CO2", diagnostics.robust_metrics.methane_to_co2_ratio.robust_z_score],
    ["H2S", diagnostics.robust_metrics.h2s_ppm.robust_z_score],
    ["Vibration", diagnostics.robust_metrics.compressor_vibration_mm_s.robust_z_score],
    ["Pressure", diagnostics.robust_metrics.pressure_bar.robust_z_score]
  ].map(([metric, value]) => ({
    metric,
    magnitude: Math.min(Math.abs(Number(value ?? 0)), 4),
    actual: Number(value ?? 0)
  })) : [];

  return (
    <div className="advanced-section">
      <div className="advanced-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Rule-Based Monitoring</h2>
              <p className="muted">Exact backend rule outputs and thresholds.</p>
            </div>
          </div>
          <div className="rule-list">
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
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Isolation Forest</h2>
              <p className="muted">Signed Isolation Forest decision score. Values above zero are classified as anomalous.</p>
            </div>
          </div>
          <div className="diagnostic-list">
            <DiagnosticLine label="Raw anomaly score" value={numberFormat(props.analysis.anomaly_score, 5)} />
            <DiagnosticLine label="Threshold" value="0" />
            <DiagnosticLine label="Distance from threshold" value={numberFormat(props.analysis.anomaly_score - props.metadata.anomaly_threshold, 5)} />
            <DiagnosticLine label="Anomaly flag" value={props.analysis.anomaly_flag} />
            <DiagnosticLine label="Contamination" value={numberFormat(props.metadata.isolation_forest_contamination, 3)} />
            <DiagnosticLine label="Trigger source" value={displayTriggerSource(props.analysis.trigger_source)} />
            <DiagnosticLine label="Expert review" value={props.analysis.expert_review_required} />
          </div>
          <p className="muted" style={{ marginTop: 12 }}>This score is not a probability or percentage and is not restricted to 0-1.</p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Interpretation Reference</h2>
              <p className="muted">Robust z-score threshold {props.metadata.robust_z_score_threshold}.</p>
            </div>
          </div>
          {diagnostics ? (
            <div className="diagnostic-list">
              <DiagnosticLine label="Expected gas flow" value={`${numberFormat(diagnostics.expected_gas_flow_m3_h, 2)} m3/h`} />
              <DiagnosticLine label="Actual gas flow" value={`${numberFormat(diagnostics.actual_gas_flow_m3_h, 2)} m3/h`} />
              <DiagnosticLine label="Gas-flow residual" value={`${numberFormat(diagnostics.gas_flow_residual_m3_h, 2)} m3/h`} />
              {Object.entries(diagnostics.robust_metrics).map(([key, metric]) => (
                <DiagnosticLine
                  key={key}
                  label={key}
                  value={`value ${numberFormat(metric.value, 3)} | median ${numberFormat(metric.median, 3)} | MAD ${numberFormat(metric.mad, 3)} | z ${numberFormat(metric.robust_z_score, 3)} | ${metric.deviation}`}
                />
              ))}
            </div>
          ) : (
            <p className="muted">Diagnostics are available when live API analysis succeeds.</p>
          )}
        </section>
      </div>

      <div className="advanced-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Raw observation chart</h2>
              <p className="muted">Raw measurements ordered by date and measurement ID; no intraday timestamps are invented.</p>
            </div>
            <select
              aria-label="Raw chart metric"
              value={props.selectedMetric}
              onChange={(event) => props.setSelectedMetric(event.target.value as ChartMetric)}
            >
              {chartMetrics.map((metric) => (
                <option key={metric.key} value={metric.key}>{metric.label}</option>
              ))}
            </select>
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
              <h2>Anomaly-score chart</h2>
              <p className="muted">{positiveScoreCount} positive historical scores in selected period.</p>
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
                <Line type="monotone" dataKey="anomaly_score" name="Historical score" stroke="#4d6570" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="current" name="Current score" stroke="#d98c23" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Rule breakdown and robust z</h2>
              <p className="muted">Six current rules plus absolute robust z-score magnitude.</p>
            </div>
          </div>
          <div className="chart-box" style={{ height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={ruleBreakdown(props.analysis)} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e9" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Bar dataKey="count" fill="#008eca" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-box" style={{ height: 230 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(_value, _name, item) => numberFormat(item.payload.actual, 3)} />
                <Radar name="|Robust z| clipped at 4; threshold 2.5" dataKey="magnitude" stroke="#008eca" fill="#008eca" fillOpacity={0.22} />
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

function MeasurementDrawer(props: {
  initialMeasurement: PlantMeasurement;
  metadata: ApiMetadata;
  onClose: () => void;
  onSubmit: (measurement: PlantMeasurement) => Promise<void>;
  isAnalyzing: boolean;
  loadScenario: (scenario: ScenarioKey) => Promise<void>;
  latestMeasurement?: HistoryRecord;
}) {
  const [measurement, setMeasurement] = useState<PlantMeasurement>(props.initialMeasurement);
  const [errors, setErrors] = useState<string[]>([]);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEscapeKey(true, props.onClose);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  function setField(key: keyof PlantMeasurement, value: string) {
    setMeasurement((current) => ({
      ...current,
      [key]: key === "maintenance_status" ? value : Number(value)
    }));
  }

  async function submit() {
    const nextErrors = validateMeasurement(measurement, props.metadata.supported_maintenance_status_values);
    setErrors(nextErrors);
    if (nextErrors.length) {
      return;
    }

    await props.onSubmit(measurement);
  }

  function resetToLatest() {
    if (props.latestMeasurement) {
      setMeasurement(measurementFromHistory(props.latestMeasurement));
      setErrors([]);
    }
  }

  const grouped = measurementFields.reduce<Record<string, typeof measurementFields>>((groups, field) => {
    groups[field.group] = groups[field.group] ?? [];
    groups[field.group].push(field);
    return groups;
  }, {});

  return (
    <div className="drawer-backdrop">
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="measurement-drawer-title">
        <div className="drawer-header">
          <div>
            <h2 id="measurement-drawer-title">Analyze current measurement</h2>
            <p className="muted">Submit the exact 19-field API contract to the SMARTCONTROL pipeline.</p>
          </div>
          <button className="icon-button" type="button" onClick={props.onClose} aria-label="Close analysis drawer">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {errors.length > 0 && (
          <div className="error-box" role="alert">
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        )}

        <div className="drawer-actions" style={{ marginBottom: 12 }}>
          <button className="secondary-button" type="button" onClick={() => void props.loadScenario("latest")}>Latest-record initialization</button>
          <button className="secondary-button" type="button" onClick={() => void props.loadScenario("ai-anomaly")}>AI anomaly example</button>
          <button className="secondary-button" type="button" onClick={() => void props.loadScenario("critical-rule")}>Critical rule example</button>
          <button className="secondary-button" type="button" onClick={resetToLatest}>Reset</button>
        </div>

        {Object.entries(grouped).map(([group, fields]) => (
          <fieldset className="form-section" key={group}>
            <legend><strong>{group}</strong></legend>
            <div className="form-grid">
              {fields.map((field, index) => (
                <label className="field" key={field.key}>
                  <span>{field.key}</span>
                  {field.key === "maintenance_status" ? (
                    <select
                      value={String(measurement[field.key])}
                      onChange={(event) => setField(field.key, event.target.value)}
                    >
                      {props.metadata.supported_maintenance_status_values.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      ref={index === 0 && group === "Feedstock" ? firstInputRef : undefined}
                      type="number"
                      step="any"
                      value={String(measurement[field.key])}
                      onChange={(event) => setField(field.key, event.target.value)}
                    />
                  )}
                  <small>{field.label}{field.unit ? ` | ${field.unit}` : ""}</small>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="drawer-actions">
          <button className="primary-button" type="button" onClick={() => void submit()} disabled={props.isAnalyzing}>
            {props.isAnalyzing ? <Loader2 size={17} aria-hidden="true" /> : <Activity size={17} aria-hidden="true" />}
            Analyze measurement
          </button>
          <button className="secondary-button" type="button" onClick={props.onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

export default App;
