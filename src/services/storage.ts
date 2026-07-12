import type {
  ChartMetric,
  DashboardMode,
  MessageThread,
  MonthlyReport,
  PeriodKey,
  PlantMeasurement,
  ScenarioKey,
  UserRole,
  WorkflowCase,
  WorkflowModule
} from "../types/smartcontrol";

export const STORAGE_KEY = "smartcontrol-workflow-v3";

export interface PersistedDashboardState {
  role: UserRole;
  mode: DashboardMode;
  activeModule: WorkflowModule;
  selectedPeriod: PeriodKey;
  selectedChartMetric: ChartMetric;
  lastCustomMeasurement: PlantMeasurement | null;
  selectedScenario: ScenarioKey;
  selectedMeasurementId: string | null;
  selectedReportMonth: string | null;
  messageThreads: MessageThread[];
  anomalyCases: Record<string, WorkflowCase>;
  monthlyReports: Record<string, MonthlyReport>;
}

const defaultState: PersistedDashboardState = {
  role: "operator",
  mode: "Basic",
  activeModule: "dashboard",
  selectedPeriod: "7",
  selectedChartMetric: "methane_percent",
  lastCustomMeasurement: null,
  selectedScenario: "latest",
  selectedMeasurementId: null,
  selectedReportMonth: null,
  messageThreads: [],
  anomalyCases: {},
  monthlyReports: {}
};

export function getDefaultPersistedState(): PersistedDashboardState {
  return JSON.parse(JSON.stringify(defaultState)) as PersistedDashboardState;
}

export function loadPersistedState(): PersistedDashboardState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultPersistedState();
    }

    return {
      ...getDefaultPersistedState(),
      ...JSON.parse(raw)
    };
  } catch {
    return getDefaultPersistedState();
  }
}

export function savePersistedState(state: PersistedDashboardState): void {
  const payload: PersistedDashboardState = {
    role: state.role,
    mode: state.mode,
    activeModule: state.activeModule,
    selectedPeriod: state.selectedPeriod,
    selectedChartMetric: state.selectedChartMetric,
    lastCustomMeasurement: state.lastCustomMeasurement,
    selectedScenario: state.selectedScenario,
    selectedMeasurementId: state.selectedMeasurementId,
    selectedReportMonth: state.selectedReportMonth,
    messageThreads: state.messageThreads,
    anomalyCases: state.anomalyCases,
    monthlyReports: state.monthlyReports
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resetWorkflowState(): PersistedDashboardState {
  const initial = getDefaultPersistedState();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}
