import { useState } from "react";
import { ApiClient } from "../../shared/api";
import { Navigate } from "../../shared/navigation";
import { ActionButton, ChatThread, MessageComposer, PhoneScreen } from "../../shared/ui";
import { formatLastActive, useAdminInquiry } from "./model";

type AdminInquiryProps = {
  api: ApiClient;
  threadId?: string;
  onNavigate: Navigate;
};

export function AdminInquiry({ api, threadId, onNavigate }: AdminInquiryProps) {
  const [input, setInput] = useState("");
  const inquiry = useAdminInquiry(api, threadId);

  if (!threadId) {
    return (
      <PhoneScreen title="문의 목록" footer={<ActionButton onClick={() => void inquiry.loadThreads()}>새로고침</ActionButton>}>
        {inquiry.loading && inquiry.threads.length === 0 ? (
          <p className="empty-state">문의 목록을 불러오고 있어요</p>
        ) : (
          <div className="admin-list">
            {inquiry.threads.map((thread) => (
            <button
              className="admin-thread"
              key={thread.threadId}
              type="button"
              onClick={() => onNavigate(`admin/${thread.threadId}`)}
            >
              <strong>익명 사용자 {thread.anonymousUserCode}</strong>
              <time dateTime={thread.lastMessageAt}>{formatLastActive(thread.lastMessageAt)}</time>
            </button>
            ))}
          </div>
        )}
        {inquiry.threads.length === 0 && !inquiry.loading && !inquiry.error && <p className="empty-state">문의가 없어요</p>}
        {inquiry.error && <p className="inline-error" role="alert">{inquiry.error}</p>}
      </PhoneScreen>
    );
  }

  const send = () => {
    void inquiry.send(input).then((sent) => sent && setInput(""));
  };

  return (
    <PhoneScreen
      title={`익명 사용자 ${inquiry.selectedThread?.anonymousUserCode ?? threadId}`}
      footer={
        <>
          <MessageComposer
            disabled={inquiry.sending}
            maxLength={4000}
            value={input}
            placeholder="답변 입력"
            onChange={setInput}
            onSend={send}
          />
          <ActionButton variant="outline" onClick={() => onNavigate("admin")}>
            문의 목록
          </ActionButton>
        </>
      }
    >
      {inquiry.nextCursor && (
        <button className="load-more" type="button" onClick={() => void inquiry.loadOlder()} disabled={inquiry.loadingOlder}>
          {inquiry.loadingOlder ? "불러오는 중" : "이전 문의 불러오기"}
        </button>
      )}
      {inquiry.loadingMessages && inquiry.messages.length === 0 ? (
        <p className="empty-state">문의 내용을 불러오고 있어요</p>
      ) : (
        <ChatThread messages={inquiry.messages} viewer="admin" />
      )}
      {inquiry.error && <p className="inline-error" role="alert">{inquiry.error}</p>}
    </PhoneScreen>
  );
}
