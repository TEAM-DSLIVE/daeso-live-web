import { FormEvent, ReactNode } from "react";
import errorDot from "./assets/error-dot.svg";
import onlineDot from "./assets/online-dot.svg";
import { Message, MessageViewer, messageSide } from "./chat";

type PhoneScreenProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  centered?: boolean;
  spacious?: boolean;
};

export function PhoneScreen({ title, action, children, footer, centered = false, spacious = false }: PhoneScreenProps) {
  return (
    <main className="phone-screen">
      <section className="phone-panel">
        <header className="phone-header">
          <h1>{title}</h1>
          {action}
        </header>
        <div className={`phone-body${centered ? " centered" : ""}${spacious ? " spacious" : ""}`}>{children}</div>
        <footer className="phone-footer">{footer}</footer>
      </section>
    </main>
  );
}

export function StatusIndicator({ status = "online" }: { status?: "online" | "error" }) {
  const isError = status === "error";
  return (
    <span className={`status-indicator${isError ? " error" : ""}`}>
      <img alt="" height="6" src={isError ? errorDot : onlineDot} width="6" />
      {isError ? "연결 끊김" : "8,412명 접속"}
    </span>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "outline";
}) {
  return (
    <button className={`action-button ${variant}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

type MessageComposerProps = {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onSend?: () => void;
};

export function MessageComposer({ value, placeholder, disabled = false, onChange, onSend }: MessageComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled && value.trim()) onSend?.();
  };

  return (
    <form className="composer" onSubmit={submit}>
      <input
        aria-label={placeholder}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <button aria-label="전송" disabled={disabled || !value.trim()} type="submit">
        ↑
      </button>
    </form>
  );
}

export function ChatThread({ messages, viewer }: { messages: Message[]; viewer: MessageViewer }) {
  return (
    <div className="chat-thread" aria-live="polite">
      {messages.map((message) => {
        const side = messageSide(message.sender, viewer);
        return (
          <div className={`message-row ${side}`} key={message.id}>
            <div className={side === "system" ? `system-chip ${message.tone ?? "default"}` : "message-bubble"}>
              {message.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function MenuCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button className="menu-card" type="button" onClick={onClick}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span aria-hidden="true" className="chevron">
        ›
      </span>
    </button>
  );
}

export function InfoCard({ title, children, accent = false }: { title: string; children: ReactNode; accent?: boolean }) {
  return (
    <section className={`info-card${accent ? " accent" : ""}`}>
      <strong>{title}</strong>
      <p>{children}</p>
    </section>
  );
}
