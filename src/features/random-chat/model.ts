import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClient, type ChatState } from "../../shared/api";
import { Message } from "../../shared/chat";
import { decryptText, deriveRoomKey, encryptText, createRoomKeyState, type RoomKeyState } from "./crypto";

type RandomChatPage = "waiting" | "matching" | "chat" | "ended" | "connection-error" | "send-failed";
type Frame = { type: string; data: Record<string, unknown> };
type RoomData = {
  roomId: string;
  myNickname: string;
  peerNickname: string;
  initiator: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFrame(value: unknown): Frame | null {
  try {
    const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
    if (!isObject(parsed) || typeof parsed.type !== "string") return null;
    return { type: parsed.type, data: isObject(parsed.data) ? parsed.data : {} };
  } catch {
    return null;
  }
}

function readRoomData(data: Record<string, unknown>): RoomData | null {
  if (
    typeof data.roomId !== "string" ||
    typeof data.myNickname !== "string" ||
    typeof data.peerNickname !== "string" ||
    typeof data.initiator !== "boolean"
  ) {
    return null;
  }
  return {
    roomId: data.roomId,
    myNickname: data.myNickname,
    peerNickname: data.peerNickname,
    initiator: data.initiator,
  };
}

function roomDataFromState(state: ChatState): RoomData | null {
  if (state.state !== "IN_ROOM" || !state.roomId || !state.myNickname || !state.peerNickname || state.initiator === null) return null;
  return {
    roomId: state.roomId,
    myNickname: state.myNickname,
    peerNickname: state.peerNickname,
    initiator: state.initiator,
  };
}

function toMessages(messages: Message[], sender: Message["sender"], text: string) {
  return [...messages, { id: crypto.randomUUID(), sender, text }];
}

export function useRandomChat(api: ApiClient, page: RandomChatPage, onNavigate: (target: string) => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [failedDraft, setFailedDraft] = useState("");
  const [endMessage, setEndMessage] = useState("대화가 끝났어요");
  const [waitingCount, setWaitingCount] = useState(0);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const pageRef = useRef(page);
  const socketRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);
  const roomKeyRef = useRef<RoomKeyState | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const keySentRef = useRef(false);
  const pingTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pendingAcksRef = useRef(new Map<string, number>());
  const closingRef = useRef(false);
  const connectRef = useRef<() => void>(() => undefined);

  pageRef.current = page;

  const clearPendingAcks = useCallback(() => {
    pendingAcksRef.current.forEach((timer) => window.clearTimeout(timer));
    pendingAcksRef.current.clear();
  }, []);

  const sendFrame = useCallback((type: string, data: Record<string, unknown> = {}) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type, data }));
    return true;
  }, []);

  const closeSocket = useCallback(() => {
    closingRef.current = true;
    if (pingTimerRef.current !== null) window.clearInterval(pingTimerRef.current);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    clearPendingAcks();
    socketRef.current?.close();
    socketRef.current = null;
    roomKeyRef.current = null;
    roomIdRef.current = null;
    setEncryptionReady(false);
    keySentRef.current = false;
  }, [clearPendingAcks]);

  const addSystemMessage = useCallback((text: string, tone: Message["tone"] = "default") => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "system", text, tone }]);
  }, []);

  const receivePeerKey = useCallback(
    async (material: string) => {
      if (!material || closingRef.current) return;
      if (!roomKeyRef.current) roomKeyRef.current = await createRoomKeyState();
      if (!keySentRef.current) {
        if (!sendFrame("KEY_EXCHANGE", { material: roomKeyRef.current.publicMaterial })) return;
        keySentRef.current = true;
      }
      await deriveRoomKey(roomKeyRef.current, material);
      if (closingRef.current) return;
      setEncryptionReady(true);
    },
    [sendFrame],
  );

  const activateRoom = useCallback(
    async (data: RoomData) => {
      if (roomIdRef.current === data.roomId) return;
      if (closingRef.current) return;
      roomIdRef.current = data.roomId;
      roomKeyRef.current = await createRoomKeyState();
      if (closingRef.current) return;
      setEncryptionReady(false);
      keySentRef.current = false;
      setEndMessage("대화가 끝났어요");
      setFailedDraft("");
      setMessages([{ id: "room-started", sender: "system", text: "익명의 상대와 연결됐어요" }]);
      onNavigate("chat");
      if (data.initiator && sendFrame("KEY_EXCHANGE", { material: roomKeyRef.current.publicMaterial })) {
        keySentRef.current = true;
      }
    },
    [onNavigate, sendFrame],
  );

  const handleFrame = useCallback(
    async (frame: Frame) => {
      switch (frame.type) {
        case "MATCH_WAITING":
          setWaitingCount(typeof frame.data.waitingCount === "number" ? frame.data.waitingCount : 0);
          onNavigate("waiting");
          return;
        case "MATCH_SUCCESS": {
          const room = readRoomData(frame.data);
          if (!room) return;
          try {
            await activateRoom(room);
          } catch {
            onNavigate("connection-error");
          }
          return;
        }
        case "MATCH_CANCELLED":
          closeSocket();
          onNavigate("home");
          return;
        case "KEY_EXCHANGE":
          if (typeof frame.data.material === "string") {
            try {
              await receivePeerKey(frame.data.material);
            } catch {
              addSystemMessage("암호화 연결을 만들지 못했어요", "danger");
              onNavigate("connection-error");
            }
          }
          return;
        case "MESSAGE":
          if (
            frame.data.roomId !== roomIdRef.current ||
            typeof frame.data.messageId !== "string" ||
            typeof frame.data.ciphertext !== "string" ||
            typeof frame.data.iv !== "string" ||
            !roomKeyRef.current?.sharedKey
          ) {
            return;
          }
          try {
            const text = await decryptText(roomKeyRef.current.sharedKey, frame.data.ciphertext, frame.data.iv);
            setMessages((current) => toMessages(current, "stranger", text));
          } catch {
            addSystemMessage("메시지를 읽을 수 없어요", "danger");
          }
          return;
        case "MESSAGE_ACK": {
          if (typeof frame.data.messageId !== "string") return;
          const timer = pendingAcksRef.current.get(frame.data.messageId);
          if (timer !== undefined) {
            window.clearTimeout(timer);
            pendingAcksRef.current.delete(frame.data.messageId);
          }
          return;
        }
        case "PEER_LEFT":
          setEndMessage("상대가 대화를 종료했어요");
          onNavigate("ended");
          return;
        case "ROOM_CLOSED": {
          const reason = typeof frame.data.reason === "string" ? frame.data.reason : "";
          if (reason === "NEXT_BY_ME") return;
          if (reason === "NEXT_BY_PEER" || reason === "LEFT_BY_PEER") setEndMessage("상대가 대화를 종료했어요");
          else if (reason === "PEER_DISCONNECTED") setEndMessage("상대의 연결이 끊어졌어요");
          else setEndMessage("대화를 종료했어요");
          if (reason !== "NEXT_BY_ME") onNavigate("ended");
          return;
        }
        case "ERROR":
          if (frame.data.code === "CHAT_409_1") {
            try {
              const state = await api.getChatState();
              const room = roomDataFromState(state);
              if (room) await activateRoom(room);
              else onNavigate("connection-error");
            } catch {
              onNavigate("connection-error");
            }
            return;
          }
          const code = typeof frame.data.code === "string" ? frame.data.code : null;
          const message = typeof frame.data.message === "string" ? frame.data.message : null;
          setConnectionError(message ? `${message}${code ? ` (${code})` : ""}` : code ? `채팅 오류가 발생했어요. (${code})` : "채팅 오류가 발생했어요.");
          onNavigate("connection-error");
          return;
        default:
          return;
      }
    },
    [activateRoom, addSystemMessage, api, closeSocket, onNavigate, receivePeerKey],
  );

  const connect = useCallback(async () => {
    if (socketRef.current || connectingRef.current || pageRef.current !== "matching") return;
    connectingRef.current = true;
    closingRef.current = false;
    setConnectionError(null);
    let state: ChatState;
    try {
      state = await api.getChatState();
      if (closingRef.current || pageRef.current !== "matching") {
        connectingRef.current = false;
        return;
      }
      const socket = api.createChatSocket();
      socketRef.current = socket;
      let opened = false;
      socket.onopen = () => {
        connectingRef.current = false;
        opened = true;
        setConnectionError(null);
        const room = roomDataFromState(state);
        if (room) void activateRoom(room);
        else {
          sendFrame("MATCH_REQUEST");
        }
        pingTimerRef.current = window.setInterval(() => sendFrame("PING"), 25_000);
      };
      socket.onmessage = (event) => {
        const frame = readFrame(event.data);
        if (frame) void handleFrame(frame);
      };
      socket.onerror = () => undefined;
      socket.onclose = (event) => {
        connectingRef.current = false;
        if (socketRef.current === socket) socketRef.current = null;
        if (pingTimerRef.current !== null) window.clearInterval(pingTimerRef.current);
        clearPendingAcks();
        setEncryptionReady(false);
        roomKeyRef.current = null;
        roomIdRef.current = null;
        keySentRef.current = false;
        if (closingRef.current || pageRef.current === "ended") return;
        if (event.code === 1008) setConnectionError("같은 계정이 다른 기기에서 접속해 연결이 종료됐어요. (WS_1008)");
        else if (!opened && event.code === 1006) setConnectionError("WebSocket handshake가 거절됐어요. AID 실행 origin과 서버 허용 목록을 확인해 주세요. (WS_1006)");
        else if (event.code === 1009) setConnectionError("메시지가 너무 커서 WebSocket 연결이 종료됐어요. (WS_1009)");
        else setConnectionError(`WebSocket 연결이 종료됐어요. (WS_${event.code})`);
        onNavigate("connection-error");
      };
    } catch {
      connectingRef.current = false;
      setConnectionError("채팅 상태를 확인하지 못했어요.");
      if (!closingRef.current && pageRef.current === "matching") onNavigate("connection-error");
    }
  }, [activateRoom, api, clearPendingAcks, handleFrame, onNavigate, sendFrame]);

  connectRef.current = () => void connect();

  useEffect(() => {
    if (page === "matching" && !socketRef.current) connectRef.current();
  }, [connect, page]);

  useEffect(() => {
    return () => closeSocket();
  }, [closeSocket]);

  const failSend = useCallback(
    (text: string) => {
      setFailedDraft(text);
      onNavigate("send-failed");
    },
    [onNavigate],
  );

  const sendMessage = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text) return false;
      if (!navigator.onLine || !roomKeyRef.current?.sharedKey) {
        failSend(text);
        return false;
      }
      try {
        const messageId = crypto.randomUUID();
        const encrypted = await encryptText(roomKeyRef.current.sharedKey, text);
        if (!sendFrame("MESSAGE", { messageId, ...encrypted })) throw new Error("소켓이 닫혔어요.");
        setMessages((current) => toMessages(current, "user", text));
        const timer = window.setTimeout(() => {
          pendingAcksRef.current.delete(messageId);
          failSend(text);
        }, 8_000);
        pendingAcksRef.current.set(messageId, timer);
        return true;
      } catch {
        failSend(text);
        return false;
      }
    },
    [failSend, sendFrame],
  );

  const startMatching = useCallback(() => {
    closeSocket();
    setConnectionError(null);
    setMessages([]);
    setFailedDraft("");
    setEndMessage("대화가 끝났어요");
    onNavigate("matching");
  }, [closeSocket, onNavigate]);

  const findPartner = useCallback(() => {
    setMessages([]);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      sendFrame("MATCH_REQUEST");
      onNavigate("matching");
      return;
    }
    startMatching();
  }, [onNavigate, sendFrame, startMatching]);

  const cancelMatching = useCallback(() => {
    sendFrame("CANCEL_MATCHING");
    closeSocket();
    onNavigate("home");
  }, [closeSocket, onNavigate, sendFrame]);

  const leaveRoom = useCallback(() => {
    sendFrame("LEAVE_ROOM");
    setEndMessage("대화를 종료했어요");
    onNavigate("ended");
    closeTimerRef.current = window.setTimeout(closeSocket, 1_000);
  }, [closeSocket, onNavigate, sendFrame]);

  const nextPartner = useCallback(() => {
    if (!sendFrame("NEXT_PARTNER")) {
      startMatching();
      return;
    }
    roomKeyRef.current = null;
    roomIdRef.current = null;
    setEncryptionReady(false);
    keySentRef.current = false;
    clearPendingAcks();
    setMessages([]);
    setEndMessage("대화가 끝났어요");
    onNavigate("matching");
  }, [clearPendingAcks, onNavigate, sendFrame, startMatching]);

  const retry = useCallback(async () => {
    const sent = await sendMessage(failedDraft);
    if (sent) onNavigate("chat");
    return sent;
  }, [failedDraft, onNavigate, sendMessage]);

  return {
    messages,
    failedDraft,
    encryptionReady,
    setFailedDraft,
    endMessage,
    waitingCount,
    connectionError,
    startMatching,
    findPartner,
    cancelMatching,
    leaveRoom,
    nextPartner,
    sendMessage,
    retry,
  };
}
