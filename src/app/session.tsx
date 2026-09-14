import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Actions, useBridgeProvider } from "@b1nd/aid-kit/bridge-kit/web";
import { ApiClient, ApiError, type AuthSession, type Role } from "../shared/api";
import { ActionButton, EmptyState, PhoneScreen } from "../shared/ui";
import { readAidTokenFromSearch } from "./aid-auth";

type AuthStatus = "loading" | "authenticated" | "error";

type AuthContextValue = {
  api: ApiClient;
  session: AuthSession | null;
  role: Role | null;
  status: AuthStatus;
  error: string | null;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readAidToken(value: unknown) {
  if (isObject(value) && value.success === false) {
    throw new Error(typeof value.error === "string" ? value.error : "AID 인증을 받을 수 없어요.");
  }
  const data = isObject(value) && "data" in value ? value.data : value;
  if (typeof data === "string" && data) return data;
  if (isObject(data)) {
    for (const key of ["aidToken", "token", "accessToken", "oauthToken"]) {
      if (typeof data[key] === "string" && data[key]) return data[key];
    }
  }
  throw new Error("AID 인증 토큰을 받을 수 없어요.");
}

function authErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return "이 서비스에 접근할 수 없는 계정이에요.";
  if (error instanceof ApiError && error.status === 0) return "서버에 연결할 수 없어요.";
  if (error instanceof Error && ["NOT_SUPPORT", "NOT_SUPPORTED"].includes(error.message)) {
    return "도담도담 인증 토큰을 받을 수 없어요.";
  }
  return error instanceof Error ? error.message : "인증에 실패했어요.";
}

function takeAidTokenFromUrl() {
  const token = readAidTokenFromSearch(window.location.search);
  if (!token) return null;
  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [api] = useState(() => new ApiClient());
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { send, subscribe } = useBridgeProvider();

  useEffect(() => {
    return api.setSessionListener((nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "error");
    });
  }, [api]);

  const authenticate = useCallback(
    async (aidToken: string) => {
      setStatus("loading");
      setError(null);
      try {
        const nextSession = await api.login(aidToken);
        setSession(nextSession);
        setStatus("authenticated");
      } catch (nextError) {
        api.clearSession();
        setError(authErrorMessage(nextError));
        setStatus("error");
      }
    },
    [api],
  );

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribe(Actions.OAUTH_GET_TOKEN, async (value) => {
      if (!active) return {};
      try {
        await authenticate(readAidToken(value));
      } catch (nextError) {
        if (active) {
          setError(authErrorMessage(nextError));
          setStatus("error");
        }
      }
      return {};
    });
    const localAidToken = import.meta.env.DEV ? import.meta.env.VITE_DAESO_LIVE_AID_TOKEN : undefined;
    const urlAidToken = localAidToken ? null : takeAidTokenFromUrl();
    if (localAidToken) void authenticate(localAidToken);
    else if (urlAidToken) void authenticate(urlAidToken);
    else send(Actions.OAUTH_GET_TOKEN);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [authenticate, retryCount, send, subscribe]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);
  const value = { api, session, role: session?.role ?? null, status, error, retry };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider 밖에서 사용되고 있어요.");
  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useAuth();
  if (status === "authenticated") return children;

  return (
    <PhoneScreen
      title="대소라이브"
      footer={<ActionButton onClick={retry}>다시 인증</ActionButton>}
      centered
    >
      <EmptyState>
        {status === "loading" ? (
          "도담도담 인증을 확인하고 있어요"
        ) : (
          <>
            {error ?? "인증이 필요해요"}
            <br />
            다시 시도해보세요
          </>
        )}
      </EmptyState>
    </PhoneScreen>
  );
}
