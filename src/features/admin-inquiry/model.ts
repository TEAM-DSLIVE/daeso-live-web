import { useCallback, useEffect, useState } from "react";
import { ApiClient, ApiError, type AdminThread, type SupportMessage } from "../../shared/api";
import { Message } from "../../shared/chat";

function toMessage(message: SupportMessage): Message {
  return {
    id: `support-${message.id}`,
    sender: message.sender === "ADMIN" ? "admin" : "user",
    text: message.content,
  };
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return "관리자 권한이 필요해요.";
  if (error instanceof ApiError && error.status === 0) return "서버에 연결할 수 없어요.";
  if (error instanceof ApiError && error.status === 400) return error.fieldErrors[0]?.message ?? error.message;
  return error instanceof Error ? error.message : "문의 내용을 불러오지 못했어요.";
}

export function formatLastActive(value: string) {
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  if (!Number.isFinite(elapsed)) return value;
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Date(value).toLocaleDateString("ko-KR");
}

export function useAdminInquiry(api: ApiClient, threadId?: string) {
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedThreadId = threadId ? Number(threadId) : null;

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const page = await api.getAdminThreads();
      setThreads(page.threads);
      setError(null);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const loadMessages = useCallback(async () => {
    if (selectedThreadId === null || !Number.isInteger(selectedThreadId) || selectedThreadId < 1) {
      setError("문의방을 찾을 수 없어요.");
      return;
    }
    setLoadingMessages(true);
    try {
      const page = await api.getAdminMessages(selectedThreadId);
      setMessages(page.messages.map(toMessage));
      setNextCursor(page.nextCursor);
      setError(null);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoadingMessages(false);
    }
  }, [api, selectedThreadId]);

  useEffect(() => {
    if (threadId) void loadMessages();
    else {
      setMessages([]);
      setNextCursor(null);
    }
  }, [loadMessages, threadId]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder || selectedThreadId === null) return;
    setLoadingOlder(true);
    try {
      const page = await api.getAdminMessages(selectedThreadId, nextCursor);
      const incoming = page.messages.map(toMessage);
      setMessages((current) => [...incoming, ...current.filter((message) => !incoming.some((item) => item.id === message.id))]);
      setNextCursor(page.nextCursor);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoadingOlder(false);
    }
  }, [api, loadingOlder, nextCursor, selectedThreadId]);

  const send = useCallback(
    async (value: string) => {
      const content = value.trim();
      if (!content || selectedThreadId === null) return false;
      if (content.length > 4_000) {
        setError("답변은 4000자 이하로 입력해 주세요.");
        return false;
      }
      setSending(true);
      try {
        const message = await api.sendAdminMessage(selectedThreadId, content);
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
    [api, selectedThreadId],
  );

  const selectedThread = selectedThreadId === null ? undefined : threads.find((thread) => thread.threadId === selectedThreadId);

  return {
    threads,
    messages,
    nextCursor,
    selectedThread,
    loading,
    loadingMessages,
    loadingOlder,
    sending,
    error,
    loadThreads,
    loadOlder,
    send,
  };
}
