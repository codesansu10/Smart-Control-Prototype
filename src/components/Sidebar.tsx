import { Check, ChevronUp, ClipboardList, Gauge, MessageSquare, TriangleAlert, UserCog, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DashboardMode, UserRole, WorkflowModule } from "../types/smartcontrol";
import { identities } from "../utils/workflow";

const operatorNav: Array<{ key: WorkflowModule; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "anomaly-detection", label: "Error Detection" },
  { key: "monthly-report", label: "Monthly Report" },
  { key: "messages", label: "Messages" }
];

const expertNav: Array<{ key: WorkflowModule; label: string }> = [
  { key: "review-queue", label: "Review Queue" },
  { key: "anomaly-detection", label: "Error Detection" },
  { key: "monthly-report-review", label: "Monthly Report Review" },
  { key: "messages", label: "Messages" }
];

export function Sidebar(props: {
  role: UserRole;
  mode: DashboardMode;
  activeModule: WorkflowModule;
  onModeChange: (mode: DashboardMode) => void;
  onModuleChange: (module: WorkflowModule) => void;
  onRoleChange: (role: UserRole) => void;
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

      <div style={{ marginTop: "auto" }}>
        <UserSwitcher
          role={props.role}
          mode={props.mode}
          onRoleChange={props.onRoleChange}
          onModeChange={props.onModeChange}
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

          {props.role === "operator" && (
            <>
              <strong className="sidebar-label">Detail level</strong>
              <button type="button" className={props.mode === "Basic" ? "user-option active" : "user-option"} onClick={() => { props.onModeChange("Basic"); setOpen(false); }}>
                <span>Basic</span>
                {props.mode === "Basic" && <Check size={16} aria-hidden="true" />}
              </button>
              <button type="button" className={props.mode === "Advanced" ? "user-option active" : "user-option"} onClick={() => { props.onModeChange("Advanced"); setOpen(false); }}>
                <span>Advanced</span>
                {props.mode === "Advanced" && <Check size={16} aria-hidden="true" />}
              </button>
            </>
          )}

          <button type="button" className="user-option" onClick={() => { props.onSignOut(); setOpen(false); }}>
            <XCircle size={15} aria-hidden="true" /> Sign out
          </button>
        </section>
      )}
    </div>
  );
}
