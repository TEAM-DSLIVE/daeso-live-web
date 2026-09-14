import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClient, ApiError, type SupportMessage } from "../../shared/api";
import { Message } from "../../shared/chat";

function toMessage(message: SupportMessage): Message {
  return {
    id: `support-${message.id}`,
    sender: message.sender === "ADMIN" ? "admin" : "user",
    text: message.content,
  };
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 0) return "서버에 연결할 수 없어요.";
  if (error instanceof ApiError && error.status === 400) return error.fieldErrors[0]?.message ?? error.message;
  return error instanceof Error ? error.message : "문의 내용을 불러오지 못했어요.";
}

export function useSupportChat(api: ApiClient, enabled = true) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadLatest = useCallback(async () => {
    if (!enabled) return;
    if (!loadedRef.current) setLoading(true);
    try {
      const page = await api.getSupportMessages();
      const incoming = page.messages.map(toMessage);
      setMessages((current) => {
        if (!loadedRef.current) return incoming;
        const known = new Set(current.map((message) => message.id));
        return [...current, ...incoming.filter((message) => !known.has(message.id))];
      });
      if (!loadedRef.current) setNextCursor(page.nextCursor);
      loadedRef.current = true;
      setError(null);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [api, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void loadLatest();
    const timer = window.setInterval(() => void loadLatest(), 15_000);
    return () => window.clearInterval(timer);
  }, [enabled, loadLatest]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.getSupportMessages(nextCursor);
      const incoming = page.messages.map(toMessage);
      setMessages((current) => [...incoming, ...current.filter((message) => !incoming.some((item) => item.id === message.id))]);
      setNextCursor(page.nextCursor);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoadingOlder(false);
    }
  }, [api, loadingOlder, nextCursor]);

  const send = useCallback(
    async (value: string) => {
      const content = value.trim();
      if (!content) return false;
      if (content.length > 4_000) {
        setError("문의 내용은 4000자 이하로 입력해 주세요.");
        return false;
      }
      setSending(true);
      try {
        const message = await api.sendSupportMessage(content);
        setMessages((current) => [...current, toMessage(message)]);
        setError(null);
        return true;
      } catch (nextError) {
        setError(errorMessage(nextError));
        return false;
      } finally {
        setSending(false);
      }
    },
    [api],
  );

  return { messages, loading, loadingOlder, sending, error, nextCursor, loadOlder, send };
}
