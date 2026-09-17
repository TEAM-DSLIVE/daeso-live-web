import { useState } from "react";
import { ApiClient } from "../../shared/api";
import { Navigate, Page } from "../../shared/navigation";
import { ActionButton, ChatThread, EmptyState, MessageComposer, PhoneScreen, StatusIndicator } from "../../shared/ui";
import { useRandomChat } from "./model";

type RandomChatPage = Extract<Page, "waiting" | "matching" | "chat" | "ended" | "connection-error" | "send-failed">;
const ONLINE_LABEL = "8,412명 접속";

export function RandomChat({ api, page, onNavigate }: { api: ApiClient; page: RandomChatPage; onNavigate: Navigate }) {
  const [input, setInput] = useState("");
  const chat = useRandomChat(api, page, onNavigate);
  const endedMessages = [...chat.messages, { id: "ended", sender: "system" as const, text: chat.endMessage }];
  const failedMessages = [
    { id: "failed", sender: "system" as const, text: "전송에 실패했어요", tone: "danger" as const },
    ...chat.messages,
  ];

  if (page === "connection-error") {
    return (
      <PhoneScreen
        title="대소라이브"
        action={<StatusIndicator status="error" />}
        centered
        footer={<ActionButton onClick={chat.startMatching}>다시 찾기</ActionButton>}
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
        action={<StatusIndicator label={ONLINE_LABEL} />}
        centered
        footer={
          <>
            <MessageComposer disabled value="" placeholder="연결되면 입력할 수 있어요" />
            <ActionButton variant="outline" onClick={chat.cancelMatching}>
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
        action={<StatusIndicator label={ONLINE_LABEL} />}
        centered
        footer={
          <>
            <MessageComposer disabled value="" placeholder="연결되면 입력할 수 있어요" />
            <ActionButton onClick={chat.findPartner}>찾기</ActionButton>
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
        action={<StatusIndicator label={ONLINE_LABEL} />}
        footer={
          <>
            <MessageComposer disabled value="" placeholder="연결되면 입력할 수 있어요" />
            <ActionButton onClick={chat.startMatching}>찾기</ActionButton>
          </>
        }
      >
        <ChatThread autoScroll messages={endedMessages} viewer="user" />
      </PhoneScreen>
    );
  }

  if (page === "send-failed") {
    return (
      <PhoneScreen
        title="대소라이브"
        action={<StatusIndicator label={ONLINE_LABEL} />}
        footer={
          <>
            <MessageComposer
              value={chat.failedDraft}
              placeholder="다시 보내려면 눌러주세요"
              onChange={chat.setFailedDraft}
              onSend={() => void chat.retry()}
            />
            <ActionButton compact variant="outline" onClick={chat.leaveRoom}>
              끝내기
            </ActionButton>
          </>
        }
      >
        <ChatThread autoScroll messages={failedMessages} viewer="user" />
      </PhoneScreen>
    );
  }

  return (
    <PhoneScreen
      title="대소라이브"
      action={<StatusIndicator label={ONLINE_LABEL} />}
      footer={
        <>
          <MessageComposer
            disabled={!chat.encryptionReady}
            value={input}
            placeholder={chat.encryptionReady ? "메시지 입력" : "암호화 연결 중"}
            onChange={setInput}
            onSend={() => void chat.sendMessage(input).then((sent) => sent && setInput(""))}
          />
          <ActionButton onClick={chat.nextPartner}>다음 상대</ActionButton>
          <ActionButton compact variant="outline" onClick={chat.leaveRoom}>
            끝내기
          </ActionButton>
        </>
      }
    >
      <ChatThread autoScroll messages={chat.messages} viewer="user" />
    </PhoneScreen>
  );
}
