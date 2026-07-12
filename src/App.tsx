import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import type {
  AnalysisContext,
  AnalysisResult,
  ApiMetadata,
  HistoryRecord,
  MessageThread,
  MonthlyReport,
  PlantMeasurement,
  WorkflowCase
} from "./types/smartcontrol";
import { analyzeMeasurement, getHealth, getHistory, getMetadata, getStaticHistory } from "./services/api";
import { useWorkflowState } from "./hooks/useWorkflowState";
import { fallbackMetadata } from "./utils/defaults";
import { aggregateDaily, calculatePeriodKpis, getScenarioRecord, selectPeriod } from "./utils/history";
import { measurementFromHistory, validateMeasurement } from "./utils/measurements";
import { generateHtmlReport } from "./utils/report";
import { Sidebar } from "./components/Sidebar";
import { DashboardView, DataSourceIndicator } from "./components/DashboardView";
import { AnomalyDetectionView } from "./components/AnomalyDetectionView";
import { MonthlyReportView } from "./components/MonthlyReportView";
import { MessagesView } from "./components/MessagesView";
import { ReviewQueueView } from "./components/ReviewQueueView";
import { MeasurementDrawer } from "./components/MeasurementDrawer";
import { PlantColleague } from "./components/PlantColleague";
import {
  appendMessage,
  availableMonths,
  createAnomalyThread,
  createReportThread,
  createTextMessage,
  findCaseForMeasurement,
  identities,
  isoNow,
  labelForMonth,
  markThreadRead,
  upsertThread
} from "./utils/workflow";

const scenarioLabels = {
  latest: "Current measurement",
  "ai-anomaly": "AI anomaly example",
  "critical-rule": "Critical rule record",
  custom: "Custom measurement"
} as const;

const buildInfo = {
  appVersion: __APP_VERSION__,
  commitSha: __GIT_COMMIT_SHA__,
  commitRef: __GIT_COMMIT_REF__,
  vercelEnv: __VERCEL_ENV__,
  buildDate: __BUILD_DATE__
};

function contextFromRecord(record: HistoryRecord, scenario: keyof typeof scenarioLabels, sourceLabel: string): AnalysisContext {
  return {
    measurementId: record.measurement_id,
    measurementDate: record.date,
    plantId: record.plant_id,
    scenarioLabel: scenarioLabels[scenario],
    sourceLabel,
    submittedAt: new Date().toISOString()
  };
}

function contextFromCustom(sourceLabel: string): AnalysisContext {
  return {
    measurementId: "Custom input",
    measurementDate: "Not from workbook history",
    plantId: "Plant_01",
    scenarioLabel: scenarioLabels.custom,
    sourceLabel,
    submittedAt: new Date().toISOString()
  };
}

function App() {
  const { state: workflow, patchState, switchRole } = useWorkflowState();
  const [metadata, setMetadata] = useState<ApiMetadata>(fallbackMetadata);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null);
  const [dataSource, setDataSource] = useState<"Live API connected" | "Static historical fallback" | "API unavailable" | "Current analysis">("API unavailable");
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isAnalyzeAvailable, setIsAnalyzeAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formState, setFormState] = useState<PlantMeasurement | null>(workflow.lastCustomMeasurement);
  const [announcement, setAnnouncement] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(workflow.messageThreads[0]?.id ?? null);
  const [expertReply, setExpertReply] = useState("");
  const [operatorMeasures, setOperatorMeasures] = useState("");
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const periodHistory = useMemo(() => selectPeriod(historyRecords, workflow.selectedPeriod), [historyRecords, workflow.selectedPeriod]);
  const dailyData = useMemo(() => aggregateDaily(periodHistory), [periodHistory]);
  const kpis = useMemo(() => calculatePeriodKpis(periodHistory), [periodHistory]);
  const months = useMemo(() => availableMonths(historyRecords), [historyRecords]);
  const selectedMonth = workflow.selectedReportMonth ?? months.at(-1) ?? "";
  const selectedCase = workflow.selectedMeasurementId ? findCaseForMeasurement(workflow.anomalyCases, workflow.selectedMeasurementId) : null;
  const selectedReport = selectedMonth ? workflow.monthlyReports[selectedMonth] ?? null : null;
  const effectiveMode = workflow.role === "expert" ? "Advanced" : workflow.mode;

  useEffect(() => {
    if (months.length && !workflow.selectedReportMonth) {
      patchState({ selectedReportMonth: months.at(-1) ?? null });
    }
  }, [months, patchState, workflow.selectedReportMonth]);

  useEffect(() => {
    setExpertReply(selectedCase?.expertReply ?? "");
    setOperatorMeasures(selectedCase?.operatorMeasures ?? "");
  }, [selectedCase?.expertReply, selectedCase?.operatorMeasures, workflow.selectedMeasurementId]);

  const reportHtml = useMemo(() => {
    if (!currentAnalysis) {
      return "";
    }

    const currentCase = workflow.selectedMeasurementId ? workflow.anomalyCases[workflow.selectedMeasurementId] : null;

    return generateHtmlReport({
      analysis: currentAnalysis,
      history: periodHistory,
      kpis,
      scenario: workflow.selectedScenario,
      periodLabel: workflow.selectedPeriod,
      dataSource,
      context: analysisContext,
      generatedAt: new Date().toISOString(),
      limitations: metadata.model_limitations,
      workflow: {
        caseStatus: currentCase?.status ?? "Open",
        expertDecision: currentCase?.expertDecision ?? "Pending",
        expertReply: currentCase?.expertReply ?? "",
        operatorMeasures: currentCase?.operatorMeasures ?? ""
      }
    });
  }, [analysisContext, currentAnalysis, dataSource, kpis, metadata.model_limitations, periodHistory, workflow.anomalyCases, workflow.selectedMeasurementId, workflow.selectedPeriod, workflow.selectedScenario]);
  const reportHref = reportHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(reportHtml)}` : "#";

  const runAnalysis = useCallback(async (measurement: PlantMeasurement, scenario: keyof typeof scenarioLabels, fallbackRecord?: HistoryRecord, context?: AnalysisContext) => {
    if (!isAnalyzeAvailable) {
      if (fallbackRecord) {
        setCurrentAnalysis(fallbackRecord);
        setDataSource("Static historical fallback");
        setAnalysisContext(contextFromRecord(fallbackRecord, scenario, "Static workbook result - model not re-executed"));
      } else if (context) {
        setAnalysisContext(context);
      }
      return;
    }

    setIsAnalyzing(true);
    setApiError(null);
    try {
      const result = await analyzeMeasurement(measurement);
      setCurrentAnalysis(result);
      setDataSource("Current analysis");
      setAnalysisContext(context ?? contextFromCustom("Custom measurement submitted to live API"));
      setAnnouncement(`${scenarioLabels[scenario]} analyzed through the live API.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      setApiError(message);
      setIsAnalyzeAvailable(false);
      if (fallbackRecord) {
        setCurrentAnalysis(fallbackRecord);
        setDataSource("Static historical fallback");
        setAnalysisContext(contextFromRecord(fallbackRecord, scenario, "Static workbook result - model not re-executed"));
      } else {
        setDataSource("API unavailable");
        setAnalysisContext(context ?? contextFromCustom("Custom measurement submitted to unavailable API"));
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzeAvailable]);

  const loadScenario = useCallback(async (scenario: keyof typeof scenarioLabels, records = historyRecords) => {
    patchState({ selectedScenario: scenario });

    if (scenario === "custom") {
      if (workflow.lastCustomMeasurement) {
        setFormState(workflow.lastCustomMeasurement);
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

    patchState({ selectedMeasurementId: record.measurement_id });
    const measurement = measurementFromHistory(record);
    setFormState(measurement);
    await runAnalysis(measurement, scenario, record, contextFromRecord(record, scenario, "Historical workbook record submitted to the live API"));
  }, [historyRecords, patchState, runAnalysis, workflow.lastCustomMeasurement]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsLoading(true);
      setApiError(null);

      try {
        await getHealth();
        if (cancelled) return;
        setIsApiConnected(true);
        setIsAnalyzeAvailable(true);
        setDataSource("Live API connected");

        const apiMetadata = await getMetadata();
        const fullHistory = await getHistory("all");
        if (cancelled) return;

        const records = fullHistory.records;
        setMetadata(apiMetadata);
        setHistoryRecords(records);

        const record = getScenarioRecord(records, "latest");
        if (record) {
          patchState({ selectedMeasurementId: record.measurement_id, selectedScenario: "latest" });
          const measurement = measurementFromHistory(record);
          setFormState(measurement);
          await runAnalysis(measurement, "latest", record, contextFromRecord(record, "latest", "Historical workbook record submitted to the live API"));
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
            if (cancelled) return;
            setHistoryRecords(staticPayload.records);
            const record = getScenarioRecord(staticPayload.records, "latest");
            if (record) {
              patchState({ selectedMeasurementId: record.measurement_id, selectedScenario: "latest" });
              setCurrentAnalysis(record);
              setAnalysisContext(contextFromRecord(record, "latest", "Static workbook result - model not re-executed"));
            }
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
    patchState({ lastCustomMeasurement: measurement, selectedScenario: "custom" });
    await runAnalysis(measurement, "custom", undefined, contextFromCustom("Custom measurement submitted to live API"));
    closeDrawer();
  }

  function printReport() {
    if (!currentAnalysis) return;
    const html = reportHtml;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    printWindow?.document.write(html);
    printWindow?.document.close();
    printWindow?.print();
  }

  async function selectMeasurement(measurementId: string) {
    const record = historyRecords.find((item) => item.measurement_id === measurementId);
    if (!record) return;
    patchState({ selectedMeasurementId: measurementId });
    const measurement = measurementFromHistory(record);
    await runAnalysis(measurement, workflow.selectedScenario === "custom" ? "latest" : workflow.selectedScenario, record, contextFromRecord(record, "latest", "Historical workbook record submitted to the live API"));
  }

  function updateThreads(thread: MessageThread) {
    const next = upsertThread(workflow.messageThreads, thread);
    patchState({ messageThreads: next });
  }

  function submitForReview(note: string) {
    if (!workflow.selectedMeasurementId) {
      return;
    }
    const measurementId = workflow.selectedMeasurementId;
    let thread = workflow.messageThreads.find((item) => item.measurementId === measurementId && item.type === "anomaly");
    if (!thread) {
      thread = createAnomalyThread({ measurementId, caseStatus: "Awaiting expert review", note });
    } else {
      const entry = createTextMessage({ sender: "julia", body: note || "Please review this error case.", kind: "analysis-card" });
      thread = appendMessage(thread, entry, "operator");
      thread = { ...thread, caseStatus: "Awaiting expert review" };
    }

    updateThreads(thread);
    patchState({
      activeModule: "messages",
      anomalyCases: {
        ...workflow.anomalyCases,
        [measurementId]: {
          measurementId,
          note,
          status: "Awaiting expert review",
          expertDecision: null,
          expertReply: "",
          operatorMeasures: "",
          conversationId: thread.id,
          updatedAt: isoNow()
        }
      }
    });
    setActiveThreadId(thread.id);
    setAnnouncement(`Error case ${measurementId} submitted for expert review.`);
  }

  function sendAnalysisToMessages() {
    if (!workflow.selectedMeasurementId || !currentAnalysis) {
      return;
    }
    const measurementId = workflow.selectedMeasurementId;
    let thread = workflow.messageThreads.find((item) => item.measurementId === measurementId && item.type === "anomaly");
    if (!thread) {
      thread = createAnomalyThread({ measurementId, caseStatus: selectedCase?.status ?? "Open", note: "Analysis shared with expert." });
    }
    const card = createTextMessage({
      sender: "julia",
      kind: "analysis-card",
      body: `Analysis card ${measurementId}: AI=${currentAnalysis.anomaly_flag}, rule=${currentAnalysis.overall_rule_status}, trigger=${currentAnalysis.trigger_source ?? "None"}.`
    });
    thread = appendMessage(thread, card, "operator");
    updateThreads(thread);
    setActiveThreadId(thread.id);
    patchState({ activeModule: "messages" });
  }

  function sendMessage(threadId: string, body: string) {
    const value = body.trim();
    if (!value) return;
    const sender = workflow.role === "expert" ? "bernd" : "julia";
    const found = workflow.messageThreads.find((thread) => thread.id === threadId);
    if (!found) return;
    const updated = appendMessage(found, createTextMessage({ sender, body: value }), workflow.role);
    updateThreads(updated);
  }

  function createGeneralThread(subject: string) {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      return;
    }

    const initial = createTextMessage({ sender: workflow.role === "expert" ? "bernd" : "julia", body: "New conversation started." });
    const thread: MessageThread = {
      id: `thread-${Math.random().toString(36).slice(2, 10)}`,
      subject: trimmedSubject,
      type: "general",
      messages: [initial],
      unreadByOperator: workflow.role === "expert" ? 1 : 0,
      unreadByExpert: workflow.role === "operator" ? 1 : 0,
      lastActivityAt: initial.timestamp
    };
    updateThreads(thread);
    setActiveThreadId(thread.id);
  }

  function selectThread(id: string) {
    setActiveThreadId(id);
    const found = workflow.messageThreads.find((thread) => thread.id === id);
    if (!found) return;
    updateThreads(markThreadRead(found, workflow.role));
  }

  function updateCaseFromExpert(status: WorkflowCase["status"], decision: WorkflowCase["expertDecision"]) {
    if (!workflow.selectedMeasurementId) return;
    const measurementId = workflow.selectedMeasurementId;
    const caseItem = workflow.anomalyCases[measurementId] ?? {
      measurementId,
      note: "",
      status: "Open",
      expertDecision: null,
      expertReply: "",
      operatorMeasures: "",
      conversationId: null,
      updatedAt: isoNow()
    };

    const nextCase: WorkflowCase = {
      ...caseItem,
      status,
      expertDecision: decision,
      expertReply,
      operatorMeasures,
      updatedAt: isoNow()
    };

    let thread = caseItem.conversationId ? workflow.messageThreads.find((item) => item.id === caseItem.conversationId) : undefined;
    if (!thread) {
      thread = createAnomalyThread({ measurementId, caseStatus: status, note: caseItem.note || "Review started by expert." });
    }
    const statusMessage = createTextMessage({ sender: "system", kind: "status", body: `Case ${measurementId}: ${status}. Expert decision: ${decision ?? "Pending"}.` });
    thread = appendMessage(thread, statusMessage, "expert");
    thread = { ...thread, caseStatus: status };
    updateThreads(thread);

    patchState({ anomalyCases: { ...workflow.anomalyCases, [measurementId]: { ...nextCase, conversationId: thread.id } } });
  }

  function upsertMonthlyReport(patch: Partial<MonthlyReport>) {
    if (!selectedMonth) return;
    const current = workflow.monthlyReports[selectedMonth] ?? {
      month: selectedMonth,
      status: "Draft",
      operatorNote: "",
      expertComment: "",
      conversationId: null,
      updatedAt: isoNow()
    };
    patchState({ monthlyReports: { ...workflow.monthlyReports, [selectedMonth]: { ...current, ...patch, updatedAt: isoNow() } } });
  }

  function sendReportForReview() {
    if (!selectedMonth) return;
    let report = workflow.monthlyReports[selectedMonth];
    if (!report) {
      report = {
        month: selectedMonth,
        status: "Draft",
        operatorNote: "",
        expertComment: "",
        conversationId: null,
        updatedAt: isoNow()
      };
    }

    let thread = report.conversationId ? workflow.messageThreads.find((item) => item.id === report.conversationId) : undefined;
    if (!thread) {
      thread = createReportThread({ month: selectedMonth, reportStatus: "Awaiting expert review", note: report.operatorNote || "Monthly report sent for review." });
    } else {
      thread = appendMessage(thread, createTextMessage({ sender: "julia", kind: "report-card", body: `Monthly report ${labelForMonth(selectedMonth)} sent for review.` }), "operator");
      thread = { ...thread, reportStatus: "Awaiting expert review" };
    }

    updateThreads(thread);
    patchState({
      monthlyReports: {
        ...workflow.monthlyReports,
        [selectedMonth]: { ...report, status: "Awaiting expert review", conversationId: thread.id, updatedAt: isoNow() }
      },
      activeModule: "messages"
    });
    setActiveThreadId(thread.id);
  }

  function approveReport() {
    if (!selectedMonth) return;
    upsertMonthlyReport({ status: "Approved" });
  }

  function requestReportChanges() {
    if (!selectedMonth) return;
    upsertMonthlyReport({ status: "Awaiting expert review" });
  }

  function handleSignOut() {
    window.alert("Sign out is demonstration-only in this PoC. Authentication is not connected.");
  }

  if (isLoading || !currentAnalysis) {
    return (
      <div className="app-shell">
        <Sidebar
          role={workflow.role}
          mode={workflow.mode}
          activeModule={workflow.activeModule}
          onModeChange={(mode) => patchState({ mode })}
          onModuleChange={(activeModule) => patchState({ activeModule })}
          onRoleChange={switchRole}
          onSignOut={handleSignOut}
        />
        <main className="main">
          <div className="empty-state">
            <Loader2 aria-hidden="true" /> Loading plant history
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        role={workflow.role}
        mode={workflow.mode}
        activeModule={workflow.activeModule}
        onModeChange={(mode) => patchState({ mode })}
        onModuleChange={(activeModule) => patchState({ activeModule })}
        onRoleChange={switchRole}
        onSignOut={handleSignOut}
      />

      <main className="main">
        <div className="topbar">
          <div className="title-block">
            <span className="eyebrow">SMARTCONTROL 2.0 | Plant_01</span>
            <h1>Model-backed monitoring dashboard</h1>
            <p className="muted">
              Active user: {workflow.role === "expert" ? `${identities.bernd.name} (${identities.bernd.subtitle})` : `${identities.julia.name} (${identities.julia.subtitle})`}
            </p>
          </div>

          <div className="top-actions">
            <DataSourceIndicator dataSource={dataSource} isApiConnected={isApiConnected} isAnalyzeAvailable={isAnalyzeAvailable} />
            {workflow.role === "operator" && (
              <button className="secondary-button" type="button" onClick={() => setDrawerOpen(true)}>
                <SlidersHorizontal size={17} aria-hidden="true" /> Analyze Measurement
              </button>
            )}
          </div>
        </div>

        {apiError && <div className="error-box" role="alert">{apiError}</div>}
        <div className="sr-only" aria-live="polite">{announcement}</div>

        {workflow.activeModule === "dashboard" && (
          <DashboardView
            mode={effectiveMode}
            analysis={currentAnalysis}
            metadata={metadata}
            dataSource={dataSource}
            dailyData={dailyData}
            periodHistory={periodHistory}
            kpis={kpis}
            selectedMetric={workflow.selectedChartMetric}
            setSelectedMetric={(selectedChartMetric) => patchState({ selectedChartMetric })}
            reportHref={reportHref}
            printReport={printReport}
            caseItem={selectedCase}
            selectedPeriod={workflow.selectedPeriod}
            onPeriodChange={(selectedPeriod) => patchState({ selectedPeriod })}
          />
        )}

        {workflow.activeModule === "anomaly-detection" && (
          <>
            <AnomalyDetectionView
              role={workflow.role}
              mode={effectiveMode}
              records={periodHistory}
              selectedPeriod={workflow.selectedPeriod}
              onPeriodChange={(selectedPeriod) => patchState({ selectedPeriod })}
              selectedMeasurementId={workflow.selectedMeasurementId}
              currentAnalysis={currentAnalysis}
              anomalyCases={workflow.anomalyCases}
              onSelectMeasurement={(measurementId) => void selectMeasurement(measurementId)}
              onSubmitForReview={submitForReview}
              onSendToMessages={sendAnalysisToMessages}
            />
            {workflow.role === "expert" && (
              <section className="panel" style={{ marginTop: 12 }}>
                <div className="panel-header">
                  <div>
                    <h2>Expert review controls</h2>
                    <p className="muted">Decision controls for the selected measurement only.</p>
                  </div>
                </div>
                <div className="diagnostic-list" style={{ marginBottom: 12 }}>
                  <div className="diagnostic-row"><strong>Measurement ID</strong><span>{workflow.selectedMeasurementId ?? "None selected"}</span></div>
                  <div className="diagnostic-row"><strong>Measurement date</strong><span>{analysisContext?.measurementDate ?? "Unknown"}</span></div>
                  <div className="diagnostic-row"><strong>Rule-based status</strong><span>{currentAnalysis.overall_rule_status}</span></div>
                  <div className="diagnostic-row"><strong>AI anomaly status</strong><span>{currentAnalysis.anomaly_flag}</span></div>
                  <div className="diagnostic-row"><strong>Julia note</strong><span>{selectedCase?.note || "No operator note yet"}</span></div>
                  <div className="diagnostic-row"><strong>Current case status</strong><span>{selectedCase?.status ?? "Open"}</span></div>
                  <div className="diagnostic-row"><strong>Existing expert decision</strong><span>{selectedCase?.expertDecision ?? "Pending"}</span></div>
                </div>
                <label className="field">
                  <span>Reply to Julia</span>
                  <textarea className="message-input" rows={3} value={expertReply} onChange={(event) => setExpertReply(event.target.value)} />
                </label>
                <label className="field">
                  <span>Operator measures</span>
                  <textarea className="message-input" rows={3} value={operatorMeasures} onChange={(event) => setOperatorMeasures(event.target.value)} />
                </label>
                <div className="drawer-actions">
                  <button className="secondary-button" type="button" onClick={() => updateCaseFromExpert("Anomaly confirmed", "Anomaly confirmed")}>Confirm anomaly</button>
                  <button className="secondary-button" type="button" onClick={() => updateCaseFromExpert("False alarm", "False alarm")}>Mark false alarm</button>
                  <button className="secondary-button" type="button" onClick={() => updateCaseFromExpert("More data requested", "Request more data")}>Request more data</button>
                  <button className="secondary-button" type="button" onClick={() => updateCaseFromExpert(selectedCase?.status ?? "Open", selectedCase?.expertDecision ?? null)}>Save operator measures</button>
                  <button className="primary-button" type="button" onClick={() => updateCaseFromExpert("Closed", selectedCase?.expertDecision ?? null)}>Close case</button>
                </div>
              </section>
            )}
          </>
        )}

        {(workflow.activeModule === "monthly-report" || workflow.activeModule === "monthly-report-review") && (
          <MonthlyReportView
            role={workflow.role}
            records={historyRecords}
            availableMonths={months}
            selectedMonth={selectedMonth}
            report={selectedReport}
            onSelectMonth={(selectedReportMonth) => patchState({ selectedReportMonth })}
            onGenerate={() => upsertMonthlyReport({ status: "Draft" })}
            onSaveReport={(patch) => upsertMonthlyReport(patch)}
            onSendForReview={sendReportForReview}
            onApprove={approveReport}
            onRequestChanges={requestReportChanges}
          />
        )}

        {workflow.activeModule === "review-queue" && (
          <ReviewQueueView
            cases={Object.values(workflow.anomalyCases)
              .filter((item) => item.status === "Awaiting expert review")
              .map((item) => ({ caseItem: item, record: historyRecords.find((record) => record.measurement_id === item.measurementId) }))}
            onOpenCase={(measurementId) => {
              patchState({ activeModule: "anomaly-detection", selectedMeasurementId: measurementId });
              void selectMeasurement(measurementId);
            }}
          />
        )}

        {workflow.activeModule === "messages" && (
          <MessagesView
            role={workflow.role}
            threads={workflow.messageThreads}
            activeThreadId={activeThreadId}
            onSelectThread={selectThread}
            onSendMessage={sendMessage}
            onCreateThread={createGeneralThread}
          />
        )}

        <BuildInfoFooter />
        <PlantColleague
          role={workflow.role}
          activeModule={workflow.activeModule}
          currentAnalysis={currentAnalysis}
          selectedMeasurementId={workflow.selectedMeasurementId}
          historyRecords={historyRecords}
          periodHistory={periodHistory}
          kpis={kpis}
          anomalyCases={workflow.anomalyCases}
          monthlyReports={workflow.monthlyReports}
          selectedMonth={selectedMonth}
          messageThreads={workflow.messageThreads}
          dataSource={dataSource}
          isApiConnected={isApiConnected}
          isAnalyzeAvailable={isAnalyzeAvailable}
        />
      </main>

      {drawerOpen && formState && (
        <MeasurementDrawer
          initialMeasurement={formState}
          metadata={metadata}
          onClose={closeDrawer}
          onSubmit={submitMeasurement}
          isAnalyzing={isAnalyzing}
          loadScenario={(scenario) => loadScenario(scenario)}
        />
      )}
    </div>
  );
}

function BuildInfoFooter() {
  return (
    <footer className="build-footer" aria-label="Build and legacy links">
      <div>
        <strong>Model-backed React dashboard</strong>
        <span>Version {buildInfo.appVersion}</span>
        <span>Commit {buildInfo.commitSha === "local" ? "local" : buildInfo.commitSha.slice(0, 12)}</span>
        <span>Branch {buildInfo.commitRef}</span>
        <span>Environment {buildInfo.vercelEnv}</span>
        <span>Built {new Date(buildInfo.buildDate).toLocaleString()}</span>
      </div>
      <a href="/legacy/" className="muted">Legacy static workflow prototype</a>
    </footer>
  );
}

export default App;
