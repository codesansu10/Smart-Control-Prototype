import type { DashboardMode, PeriodKey, PlantMeasurement, ScenarioKey, ChartMetric } from "../types/smartcontrol";

export const STORAGE_KEY = "smartcontrol-dashboard-v2";

export interface PersistedDashboardState {
  mode: DashboardMode;
  selectedPeriod: PeriodKey;
  selectedChartMetric: ChartMetric;
  lastCustomMeasurement: PlantMeasurement | null;
  selectedScenario: ScenarioKey;
}

const defaultState: PersistedDashboardState = {
  mode: "Normal",
  selectedPeriod: "30",
  selectedChartMetric: "methane_percent",
  lastCustomMeasurement: null,
  selectedScenario: "latest"
};

export function loadPersistedState(): PersistedDashboardState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    return {
      ...defaultState,
      ...JSON.parse(raw)
    };
  } catch {
    return defaultState;
  }
}

export function savePersistedState(state: PersistedDashboardState): void {
  const payload: PersistedDashboardState = {
    mode: state.mode,
    selectedPeriod: state.selectedPeriod,
    selectedChartMetric: state.selectedChartMetric,
    lastCustomMeasurement: state.lastCustomMeasurement,
    selectedScenario: state.selectedScenario
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
