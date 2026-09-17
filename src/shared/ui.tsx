import { FormEvent, ReactNode, CSSProperties, useEffect, useRef } from "react";
import { useSafeArea } from "@b1nd/aid-kit/safe-area-provider";
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
  const { top, bottom } = useSafeArea();
  const safeAreaStyle = {
    "--aid-safe-top": `${top}px`,
    "--aid-safe-bottom": `${bottom}px`,
  } as CSSProperties;

  return (
    <main className="phone-screen" style={safeAreaStyle}>
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

export function StatusIndicator({ status = "online", label }: { status?: "online" | "error"; label?: string }) {
  const isError = status === "error";
  return (
    <span className={`status-indicator${isError ? " error" : ""}`}>
      <img alt="" height="6" src={isError ? errorDot : onlineDot} width="6" />
      {label ?? (isError ? "연결 끊김" : "연결됨")}
    </span>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "primary",
  compact = false,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "outline";
  compact?: boolean;
}) {
  return (
    <button className={`action-button ${variant}${compact ? " compact" : ""}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

type MessageComposerProps = {
  value: string;
  placeholder: string;
  disabled?: boolean;
  maxLength?: number;
  dimmed?: boolean;
  onChange?: (value: string) => void;
  onSend?: () => void;
};

export function MessageComposer({ value, placeholder, disabled = false, maxLength, dimmed = false, onChange, onSend }: MessageComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled && value.trim()) onSend?.();
  };

  return (
    <form className={`composer${dimmed ? " dimmed" : ""}`} onSubmit={submit}>
      <input
        aria-label={placeholder}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
      />
      <button aria-label="전송" disabled={disabled || !value.trim()} type="submit">
        ↑
      </button>
    </form>
  );
}

export function ChatThread({
  messages,
  viewer,
  autoScroll = false,
  className,
}: {
  messages: Message[];
  viewer: MessageViewer;
  autoScroll?: boolean;
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ block: "end" });
  }, [autoScroll, messages.length]);

  return (
    <div className={`chat-thread${className ? ` ${className}` : ""}`} aria-live="polite">
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
      <div ref={endRef} aria-hidden="true" />
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
