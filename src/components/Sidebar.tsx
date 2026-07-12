import { Check, ChevronUp, ClipboardList, Gauge, History, MessageSquare, Settings2, TriangleAlert, UserCog, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DashboardMode, PeriodKey, ScenarioKey, UserRole, WorkflowModule } from "../types/smartcontrol";
import { identities } from "../utils/workflow";

const operatorNav: Array<{ key: WorkflowModule; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "anomaly-detection", label: "Anomaly Detection" },
  { key: "monthly-report", label: "Monthly Report" },
  { key: "messages", label: "Messages" }
];

const expertNav: Array<{ key: WorkflowModule; label: string }> = [
  { key: "review-queue", label: "Review Queue" },
  { key: "anomaly-detection", label: "Anomaly Detection" },
  { key: "monthly-report-review", label: "Monthly Report Review" },
  { key: "messages", label: "Messages" }
];

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

export function Sidebar(props: {
  role: UserRole;
  mode: DashboardMode;
  selectedPeriod: PeriodKey;
  selectedScenario: ScenarioKey;
  activeModule: WorkflowModule;
  isAnalyzing: boolean;
  onModeChange: (mode: DashboardMode) => void;
  onPeriodChange: (period: PeriodKey) => void;
  onScenarioChange: (scenario: ScenarioKey) => void;
  onModuleChange: (module: WorkflowModule) => void;
  onRoleChange: (role: UserRole) => void;
  onResetData: () => void;
  onSignOut: () => void;
}) {
  const nav = props.role === "expert" ? expertNav : operatorNav;

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/assets/logo-oekobit.png" alt="OEKOBIT" />
      </div>
      <span className="scope-chip">Plant_01 model scope</span>

      <nav className="sidebar-section" aria-label="Application navigation">
        <span className="sidebar-label">Navigation</span>
        <div className="scenario-controls">
          {nav.map((item) => (
            <button key={item.key} type="button" className={props.activeModule === item.key ? "active" : ""} onClick={() => props.onModuleChange(item.key)}>
              {iconForModule(item.key)} {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-section">
        <span className="sidebar-label">Detail level</span>
        <div className="segmented" role="group" aria-label="Dashboard mode">
          {(["Basic", "Advanced"] as const).map((item) => (
            <button key={item} type="button" className={props.mode === item ? "active" : ""} onClick={() => props.onModeChange(item)}>
              {item === "Basic" ? <Gauge size={16} aria-hidden="true" /> : <Settings2 size={16} aria-hidden="true" />}
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">Period</span>
        <div className="period-controls" role="group" aria-label="History period">
          {(["7", "30", "all"] as const).map((item) => (
            <button key={item} type="button" className={props.selectedPeriod === item ? "active" : ""} onClick={() => props.onPeriodChange(item)}>
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
            <button key={scenario} type="button" className={props.selectedScenario === scenario ? "active" : ""} onClick={() => props.onScenarioChange(scenario)} disabled={props.isAnalyzing}>
              {scenarioLabels[scenario]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <UserSwitcher
          role={props.role}
          mode={props.mode}
          onRoleChange={props.onRoleChange}
          onModeChange={props.onModeChange}
          onResetData={props.onResetData}
          onSignOut={props.onSignOut}
        />
      </div>
    </aside>
  );
}

function iconForModule(module: WorkflowModule) {
  switch (module) {
    case "dashboard":
      return <Gauge size={16} aria-hidden="true" />;
    case "anomaly-detection":
      return <TriangleAlert size={16} aria-hidden="true" />;
    case "monthly-report":
    case "monthly-report-review":
      return <ClipboardList size={16} aria-hidden="true" />;
    case "messages":
      return <MessageSquare size={16} aria-hidden="true" />;
    case "review-queue":
      return <UserCog size={16} aria-hidden="true" />;
    default:
      return <Gauge size={16} aria-hidden="true" />;
  }
}

function UserSwitcher(props: {
  role: UserRole;
  mode: DashboardMode;
  onRoleChange: (role: UserRole) => void;
  onModeChange: (mode: DashboardMode) => void;
  onResetData: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointer = (event: MouseEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = props.role === "expert" ? identities.bernd : identities.julia;

  return (
    <div className="user-switcher" ref={cardRef}>
      <button type="button" className="user-card" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="user-avatar">{active.initials}</span>
        <span className="user-main">
          <strong>{active.name}</strong>
          <small>{active.subtitle}</small>
        </span>
        <ChevronUp size={16} aria-hidden="true" />
      </button>
      {open && (
        <section className="user-menu" role="menu" aria-label="Switch user menu">
          <strong className="sidebar-label">Switch user</strong>
          <button type="button" className={props.role === "operator" ? "user-option active" : "user-option"} onClick={() => { props.onRoleChange("operator"); setOpen(false); }}>
            <span>
              <strong>{identities.julia.name}</strong>
              <small>{identities.julia.subtitle}</small>
            </span>
            {props.role === "operator" && <Check size={16} aria-hidden="true" />}
          </button>
          <button type="button" className={props.role === "expert" ? "user-option active" : "user-option"} onClick={() => { props.onRoleChange("expert"); setOpen(false); }}>
            <span>
              <strong>{identities.bernd.name}</strong>
              <small>{identities.bernd.subtitle}</small>
            </span>
            {props.role === "expert" && <Check size={16} aria-hidden="true" />}
          </button>

          <strong className="sidebar-label">Detail level</strong>
          <button type="button" className={props.mode === "Basic" ? "user-option active" : "user-option"} onClick={() => { props.onModeChange("Basic"); setOpen(false); }}>
            <span>Basic</span>
            {props.mode === "Basic" && <Check size={16} aria-hidden="true" />}
          </button>
          <button type="button" className={props.mode === "Advanced" ? "user-option active" : "user-option"} onClick={() => { props.onModeChange("Advanced"); setOpen(false); }}>
            <span>Advanced</span>
            {props.mode === "Advanced" && <Check size={16} aria-hidden="true" />}
          </button>

          <button type="button" className="user-option" onClick={() => { props.onResetData(); setOpen(false); }}>
            <span>Reset prototype data</span>
          </button>
          <button type="button" className="user-option" onClick={() => { props.onSignOut(); setOpen(false); }}>
            <XCircle size={15} aria-hidden="true" /> Sign out
          </button>
        </section>
      )}
    </div>
  );
}
