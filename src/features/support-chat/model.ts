import { useState } from "react";
import { Message } from "../../shared/chat";

const INITIAL_MESSAGES: Record<string, Message[]> = {
  A17: [
    { id: "a1", sender: "system", text: "문의가 접수됐어요" },
    { id: "a2", sender: "admin", text: "안녕하세요. 무엇을 도와드릴까요?" },
    { id: "a3", sender: "user", text: "매칭이 잘 안돼요." },
    { id: "a4", sender: "admin", text: "확인해볼게요. 잠시만 기다려주세요." },
  ],
  B04: [
    { id: "b1", sender: "system", text: "문의가 접수됐어요" },
    { id: "b2", sender: "user", text: "연결이 자주 끊겨요." },
  ],
  C22: [
    { id: "c1", sender: "system", text: "문의가 접수됐어요" },
    { id: "c2", sender: "user", text: "다시 매칭하는 방법이 궁금해요." },
  ],
};

export function useSupportThreads() {
  const [messagesByUser, setMessagesByUser] = useState(INITIAL_MESSAGES);

  const send = (userId: string, sender: "user" | "admin", value: string) => {
    const text = value.trim();
    if (!text) return;
    setMessagesByUser((threads) => ({
      ...threads,
      [userId]: [...(threads[userId] ?? []), { id: crypto.randomUUID(), sender, text }],
    }));
  };

  return { messagesByUser, send };
}
