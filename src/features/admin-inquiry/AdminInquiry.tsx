import { useState } from "react";
import { Message } from "../../shared/chat";
import { Navigate } from "../../shared/navigation";
import { ActionButton, ChatThread, MessageComposer, PhoneScreen } from "../../shared/ui";

const THREADS = [
  { id: "A17", lastActive: "방금 전" },
  { id: "B04", lastActive: "3분 전" },
  { id: "C22", lastActive: "12분 전" },
];

type AdminInquiryProps = {
  userId?: string;
  messagesByUser: Record<string, Message[]>;
  onNavigate: Navigate;
  onSend: (userId: string, value: string) => void;
};

export function AdminInquiry({ userId, messagesByUser, onNavigate, onSend }: AdminInquiryProps) {
  const [input, setInput] = useState("");

  if (!userId) {
    return (
      <PhoneScreen title="문의 목록" footer={<ActionButton onClick={() => window.location.reload()}>새로고침</ActionButton>}>
        <div className="admin-list">
          {THREADS.map((thread, index) => (
            <button
              className={`admin-thread${index === 0 ? " active" : ""}`}
              key={thread.id}
              type="button"
              onClick={() => onNavigate(`admin/${thread.id}`)}
            >
              <strong>익명 사용자 {thread.id}</strong>
              <time>{thread.lastActive}</time>
            </button>
          ))}
        </div>
      </PhoneScreen>
    );
  }

  const send = () => {
    onSend(userId, input);
    setInput("");
  };

  return (
    <PhoneScreen
      title={`익명 사용자 ${userId}`}
      footer={
        <>
          <MessageComposer value={input} placeholder="답변 입력" onChange={setInput} onSend={send} />
          <ActionButton variant="outline" onClick={() => onNavigate("admin")}>
            문의 목록
          </ActionButton>
        </>
      }
    >
      <ChatThread messages={messagesByUser[userId] ?? []} viewer="admin" />
    </PhoneScreen>
  );
}
