import { useEffect, useMemo, useState } from "react";
import { Message } from "../../shared/chat";
import { Navigate, Page } from "../../shared/navigation";
import { ActionButton, ChatThread, EmptyState, MessageComposer, PhoneScreen, StatusIndicator } from "../../shared/ui";

const INITIAL_MESSAGES: Message[] = [
  { id: "r1", sender: "system", text: "익명의 상대와 연결됐어요" },
  { id: "r2", sender: "stranger", text: "안녕! 오늘 뭐해?" },
  { id: "r3", sender: "user", text: "방금 퇴근했어 ㅋㅋ 너는?" },
  { id: "r4", sender: "stranger", text: "난 야식 고민 중. 라면 vs 치킨" },
  { id: "r5", sender: "user", text: "고민할 게 있나 치킨" },
];

type RandomChatPage = Extract<Page, "waiting" | "matching" | "chat" | "ended" | "connection-error" | "send-failed">;

export function RandomChat({ page, onNavigate }: { page: RandomChatPage; onNavigate: Navigate }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [failedDraft, setFailedDraft] = useState("");

  useEffect(() => {
    if (page !== "matching") return;
    const timer = window.setTimeout(() => onNavigate("chat"), 1200);
    return () => window.clearTimeout(timer);
  }, [onNavigate, page]);

  const endedMessages = useMemo(
    () => [...messages, { id: "ended", sender: "system" as const, text: "대화가 끝났어요" }],
    [messages],
  );

  const failedMessages = useMemo(
    () => [{ id: "failed", sender: "system" as const, text: "전송에 실패했어요", tone: "danger" as const }, ...messages],
    [messages],
  );

  const startMatching = () => {
    setMessages(INITIAL_MESSAGES);
    setInput("");
    onNavigate("matching");
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (!navigator.onLine) {
      setFailedDraft(text);
      setInput("");
      onNavigate("send-failed");
      return;
    }
    setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "user", text }]);
    setInput("");
  };

  const retry = () => {
    const text = failedDraft.trim();
    if (!text || !navigator.onLine) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "user", text }]);
    setFailedDraft("");
    onNavigate("chat");
  };

  if (page === "connection-error") {
    return (
      <PhoneScreen
        title="대소라이브"
        action={<StatusIndicator status="error" />}
        centered
        footer={<ActionButton onClick={startMatching}>다시 찾기</ActionButton>}
      >
        <EmptyState>
          연결이 끊겼어요
          <br />
          다시 시도해보세요
        </EmptyState>
      </PhoneScreen>
    );
  }

  if (page === "matching") {
    return (
      <PhoneScreen
        title="대소라이브"
        action={<StatusIndicator />}
        centered
        footer={
          <>
            <MessageComposer disabled value="" placeholder="연결되면 입력할 수 있어요" />
            <ActionButton variant="outline" onClick={() => onNavigate("home")}>
              취소
            </ActionButton>
          </>
        }
      >
        <EmptyState>
          새로운 상대를 찾고 있어요
          <br />
          잠시만 기다려주세요
        </EmptyState>
      </PhoneScreen>
    );
  }

  if (page === "waiting") {
    return (
      <PhoneScreen
        title="대소라이브"
        action={<StatusIndicator />}
        centered
        footer={
          <>
            <MessageComposer disabled value="" placeholder="연결되면 입력할 수 있어요" />
            <ActionButton onClick={startMatching}>찾기</ActionButton>
          </>
        }
      >
        <EmptyState>
          아직 연결된 상대가 없어요
          <br />
          아래 찾기를 누르면 바로 연결돼요
        </EmptyState>
      </PhoneScreen>
    );
  }

  if (page === "ended") {
    return (
      <PhoneScreen
        title="대소라이브"
        action={<StatusIndicator />}
        footer={
          <>
            <MessageComposer disabled value="" placeholder="연결되면 입력할 수 있어요" />
            <ActionButton onClick={startMatching}>찾기</ActionButton>
          </>
        }
      >
        <ChatThread messages={endedMessages} viewer="user" />
      </PhoneScreen>
    );
  }

  if (page === "send-failed") {
    return (
      <PhoneScreen
        title="대소라이브"
        action={<StatusIndicator />}
        footer={
          <>
            <MessageComposer
              value={failedDraft}
              placeholder="다시 보내려면 눌러주세요"
              onChange={setFailedDraft}
              onSend={retry}
            />
            <ActionButton variant="outline" onClick={() => onNavigate("ended")}>
              끝내기
            </ActionButton>
          </>
        }
      >
        <ChatThread messages={failedMessages} viewer="user" />
      </PhoneScreen>
    );
  }

  return (
    <PhoneScreen
      title="대소라이브"
      action={<StatusIndicator />}
      footer={
        <>
          <MessageComposer value={input} placeholder="메시지 입력" onChange={setInput} onSend={send} />
          <ActionButton variant="outline" onClick={() => onNavigate("ended")}>
            끝내기
          </ActionButton>
        </>
      }
    >
      <ChatThread messages={messages} viewer="user" />
    </PhoneScreen>
  );
}
