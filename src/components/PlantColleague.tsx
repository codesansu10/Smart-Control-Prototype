import { Bot, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import type {
  AnalysisResult,
  HistoryRecord,
  MessageThread,
  MonthlyReport,
  PeriodKpis,
  UserRole,
  WorkflowCase,
  WorkflowModule
} from "../types/smartcontrol";
import {
  answerPlantColleague,
  plantColleaguePrompts,
  type PlantColleagueContext
} from "../utils/plantColleagueResponses";

interface AssistantMessage {
  id: string;
  sender: "assistant" | "user";
  body: string;
}

const greeting =
  "Hi, I’m your Plant Colleague. I can explain alerts, interpret the current dashboard and suggest the next workflow action. What would you like to know?";

function messageId(): string {
  return `plant-colleague-${Math.random().toString(36).slice(2, 10)}`;
}

export function PlantColleague(props: {
  role: UserRole;
  activeModule: WorkflowModule;
  currentAnalysis: AnalysisResult;
  selectedMeasurementId: string | null;
  historyRecords: HistoryRecord[];
  periodHistory: HistoryRecord[];
  kpis: PeriodKpis;
  anomalyCases: Record<string, WorkflowCase>;
  monthlyReports: Record<string, MonthlyReport>;
  selectedMonth: string;
  messageThreads: MessageThread[];
  dataSource: string;
  isApiConnected: boolean;
  isAnalyzeAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: messageId(), sender: "assistant", body: greeting }
  ]);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const quickPrompts = plantColleaguePrompts(props.role);

  useEscapeKey(open, () => {
    setOpen(false);
    toggleRef.current?.focus();
  });

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }
    if (typeof messagesRef.current.scrollTo === "function") {
      messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight });
    } else {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  function context(): PlantColleagueContext {
    return {
      role: props.role,
      activeModule: props.activeModule,
      currentAnalysis: props.currentAnalysis,
      selectedMeasurementId: props.selectedMeasurementId,
      historyRecords: props.historyRecords,
      periodHistory: props.periodHistory,
      kpis: props.kpis,
      anomalyCases: props.anomalyCases,
      monthlyReports: props.monthlyReports,
      selectedMonth: props.selectedMonth,
      messageThreads: props.messageThreads,
      dataSource: props.dataSource,
      isApiConnected: props.isApiConnected,
      isAnalyzeAvailable: props.isAnalyzeAvailable
    };
  }

  function submitQuestion(value: string) {
    const question = value.trim();
    if (!question) {
      return;
    }

    const answer = answerPlantColleague(question, context());
    setMessages((current) => [
      ...current,
      { id: messageId(), sender: "user", body: question },
      { id: messageId(), sender: "assistant", body: answer }
    ]);
    setDraft("");
  }

  return (
    <div className="plant-colleague" aria-live="polite">
      {open && (
        <section className="plant-colleague-panel" aria-label="Plant Colleague assistant">
          <header className="plant-colleague-header">
            <span className="assistant-icon"><Bot size={18} aria-hidden="true" /></span>
            <div>
              <h2>Plant Colleague</h2>
              <p className="muted">Plant guidance · local dashboard assistant</p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close Plant Colleague"
              onClick={() => setOpen(false)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>

          <div className="plant-colleague-messages" ref={messagesRef}>
            {messages.map((message) => (
              <article key={message.id} className={`assistant-message ${message.sender}`}>
                <strong>{message.sender === "assistant" ? "Plant Colleague" : "You"}</strong>
                <p>{message.body}</p>
              </article>
            ))}
          </div>

          <div className="quick-prompts" aria-label="Quick questions">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => submitQuestion(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <label className="field plant-colleague-input">
            <span className="sr-only">Ask Plant Colleague</span>
            <textarea
              ref={inputRef}
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(draft);
                }
              }}
              placeholder="Ask about current status, errors, review cases or reports"
            />
          </label>
          <button className="primary-button plant-colleague-send" type="button" disabled={!draft.trim()} onClick={() => submitQuestion(draft)}>
            <Send size={15} aria-hidden="true" /> Send
          </button>
        </section>
      )}

      <button
        ref={toggleRef}
        className="plant-colleague-toggle"
        type="button"
        aria-expanded={open}
        aria-label={open ? "Minimize Plant Colleague" : "Open Plant Colleague"}
        onClick={() => setOpen((value) => !value)}
      >
        <Bot size={17} aria-hidden="true" />
        Plant Colleague
      </button>
    </div>
  );
}
