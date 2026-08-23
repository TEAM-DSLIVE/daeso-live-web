import { useState } from "react";
import { Message } from "../../shared/chat";
import { Navigate } from "../../shared/navigation";
import { ActionButton, ChatThread, MessageComposer, PhoneScreen } from "../../shared/ui";

export function SupportChat({
  messages,
  onNavigate,
  onSend,
}: {
  messages: Message[];
  onNavigate: Navigate;
  onSend: (value: string) => void;
}) {
  const [input, setInput] = useState("");

  const send = () => {
    onSend(input);
    setInput("");
  };

  return (
    <PhoneScreen
      title="문의하기"
      spacious
      footer={
        <>
          <MessageComposer value={input} placeholder="문의 내용을 입력" onChange={setInput} onSend={send} />
          <ActionButton variant="outline" onClick={() => onNavigate("settings")}>
            설정으로
          </ActionButton>
        </>
      }
    >
      <ChatThread messages={messages} viewer="user" />
    </PhoneScreen>
  );
}
