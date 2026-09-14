import { useState } from "react";
import { Message } from "../../shared/chat";
import { Navigate } from "../../shared/navigation";
import { ActionButton, ChatThread, EmptyState, MessageComposer, PhoneScreen } from "../../shared/ui";

export function SupportChat({
  messages,
  loading,
  loadingOlder,
  sending,
  error,
  hasOlder,
  onLoadOlder,
  onNavigate,
  onSend,
}: {
  messages: Message[];
  loading: boolean;
  loadingOlder: boolean;
  sending: boolean;
  error: string | null;
  hasOlder: boolean;
  onLoadOlder: () => void;
  onNavigate: Navigate;
  onSend: (value: string) => Promise<boolean>;
}) {
  const [input, setInput] = useState("");

  const send = async () => {
    if (await onSend(input)) setInput("");
  };

  return (
    <PhoneScreen
      title="문의하기"
      spacious
      footer={
        <>
            <MessageComposer
              disabled={sending}
              maxLength={4000}
              value={input}
              placeholder="문의 내용을 입력"
              onChange={setInput}
              onSend={() => void send()}
            />
          <ActionButton variant="outline" onClick={() => onNavigate("settings")}>
            설정으로
          </ActionButton>
        </>
      }
    >
      {hasOlder && (
        <button className="load-more" type="button" onClick={onLoadOlder} disabled={loadingOlder}>
          {loadingOlder ? "불러오는 중" : "이전 문의 불러오기"}
        </button>
      )}
      {loading && messages.length === 0 ? (
        <EmptyState>문의 내용을 불러오고 있어요</EmptyState>
      ) : messages.length > 0 ? (
        <ChatThread messages={messages} viewer="user" />
      ) : (
        <EmptyState>아직 문의한 내용이 없어요</EmptyState>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </PhoneScreen>
  );
}
