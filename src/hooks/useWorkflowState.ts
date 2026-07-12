import { useCallback, useEffect, useState } from "react";
import {
  getDefaultPersistedState,
  loadPersistedState,
  resetWorkflowState,
  savePersistedState,
  type PersistedDashboardState
} from "../services/storage";
import type { UserRole, WorkflowModule } from "../types/smartcontrol";

export function defaultModuleForRole(role: UserRole): WorkflowModule {
  return role === "expert" ? "review-queue" : "dashboard";
}

export function useWorkflowState() {
  const [state, setState] = useState<PersistedDashboardState>(() => {
    const persisted = loadPersistedState();
    if (persisted.activeModule === "dashboard" && persisted.role === "expert") {
      return { ...persisted, activeModule: "review-queue" };
    }
    return persisted;
  });

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  const patchState = useCallback((patch: Partial<PersistedDashboardState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setState((current) => ({
      ...current,
      role,
      activeModule:
        current.activeModule === "review-queue" || current.activeModule === "dashboard"
          ? defaultModuleForRole(role)
          : current.activeModule
    }));
  }, []);

  const resetState = useCallback(() => {
    const reset = resetWorkflowState();
    setState({ ...getDefaultPersistedState(), ...reset });
  }, []);

  return {
    state,
    patchState,
    switchRole,
    resetState
  };
}
