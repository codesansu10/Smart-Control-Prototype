import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import type { MessageThread, UserRole } from "../types/smartcontrol";

export function MessagesView(props: {
  role: UserRole;
  threads: MessageThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onSendMessage: (threadId: string, body: string) => void;
  onCreateThread: (subject: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [message, setMessage] = useState("");

  const visibleThreads = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return props.threads;
    }
    return props.threads.filter((thread) => thread.subject.toLowerCase().includes(value));
  }, [props.threads, query]);

  const activeThread = props.threads.find((thread) => thread.id === props.activeThreadId) ?? null;

  return (
    <div className="messages-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Conversations</h2>
            <p className="muted">General, anomaly-linked, and monthly-report conversations.</p>
          </div>
        </div>
        <label className="field">
          <span>Search or filter conversations</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subjects" />
        </label>
        <label className="field">
          <span>Compose new conversation</span>
          <div className="drawer-actions">
            <input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Subject" />
            <button className="secondary-button" type="button" disabled={!newSubject.trim()} onClick={() => { props.onCreateThread(newSubject); setNewSubject(""); }}>Create</button>
          </div>
        </label>
        <div className="conversation-list">
          {visibleThreads.map((thread) => {
            const unread = props.role === "operator" ? thread.unreadByOperator : thread.unreadByExpert;
            return (
              <button key={thread.id} type="button" className={props.activeThreadId === thread.id ? "conversation-item active" : "conversation-item"} onClick={() => props.onSelectThread(thread.id)}>
                <strong>{thread.subject || "(No subject)"}</strong>
                <small>{thread.type} - {new Date(thread.lastActivityAt).toLocaleString()}</small>
                {unread > 0 && <span className="badge fallback">{unread} unread</span>}
              </button>
            );
          })}
          {!props.threads.length && <p className="muted">No conversations yet</p>}
          {!!props.threads.length && !visibleThreads.length && <p className="muted">No conversations match the current filter.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{activeThread?.subject || "Conversation thread"}</h2>
            <p className="muted">Role-specific sender identity and status cards.</p>
          </div>
        </div>
        {activeThread ? (
          <>
            <div className="thread-messages">
              {activeThread.messages.map((entry) => (
                <article key={entry.id} className={entry.kind === "status" ? "message-card status" : "message-card"}>
                  <header>
                    <strong>{entry.senderLabel}</strong>
                    <small>{entry.senderSubLabel} - {new Date(entry.timestamp).toLocaleString()}</small>
                  </header>
                  <p>{entry.body}</p>
                </article>
              ))}
            </div>
            <div className="drawer-actions">
              <textarea className="message-input" aria-label="Message input" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
              <button className="primary-button" type="button" disabled={!message.trim()} onClick={() => { props.onSendMessage(activeThread.id, message); setMessage(""); }}>
                <Send size={15} aria-hidden="true" /> Send
              </button>
            </div>
          </>
        ) : (
          <p className="muted">{props.threads.length ? "Select a conversation to view messages." : "No conversations yet"}</p>
        )}
      </section>
    </div>
  );
}
