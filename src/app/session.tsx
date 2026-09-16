import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
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

function authErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return "이 서비스에 접근할 수 없는 계정이에요.";
  if (error instanceof ApiError && error.status === 0) return "서버에 연결할 수 없어요.";
  if (error instanceof ApiError && error.code === "AUTH_401_6") {
    return "도담도담 앱 인증이 만료됐어요. 앱에서 다시 로그인한 후 서비스를 열어주세요. (AUTH_401_6)";
  }
  if (error instanceof ApiError) {
    const identifier = error.code ?? `HTTP_${error.status}`;
    return `${error.message} (${identifier})`;
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
  const { send } = useBridgeProvider();
  const aidToken = useRef<string | null>(null);
  const authenticatingToken = useRef<string | null>(null);

  useEffect(() => {
    return api.setSessionListener((nextSession, nextError) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "error");
      if (nextSession) setError(null);
      else if (nextError) setError(authErrorMessage(nextError));
    });
  }, [api]);

  const authenticate = useCallback(
    async (token: string) => {
      if (api.getAccessToken() || authenticatingToken.current) return;
      authenticatingToken.current = token;
      setStatus("loading");
      setError(null);
      try {
        const nextSession = await api.login(token);
        setSession(nextSession);
        setStatus("authenticated");
      } catch (nextError) {
        api.clearSession();
        aidToken.current = null;
        setError(authErrorMessage(nextError));
        setStatus("error");
      } finally {
        if (authenticatingToken.current === token) authenticatingToken.current = null;
      }
    },
    [api],
  );

  useEffect(() => {
    const localAidToken = import.meta.env.DEV ? import.meta.env.VITE_DAESO_LIVE_AID_TOKEN : undefined;
    const urlAidToken = localAidToken ? null : takeAidTokenFromUrl();
    const initialAidToken = aidToken.current ?? localAidToken ?? urlAidToken;

    if (initialAidToken) {
      aidToken.current = initialAidToken;
      void authenticate(initialAidToken);
      return;
    }

    setError("도담도담 앱에서 최신 인증으로 서비스를 다시 열어주세요.");
    setStatus("error");
  }, [authenticate]);

  const retry = useCallback(() => {
    if (authenticatingToken.current) return;
    aidToken.current = null;
    api.clearSession();
    if (window.ReactNativeWebView?.postMessage) send(Actions.NAVIGATION_POP);
    else setError("도담도담 앱에서 최신 인증으로 서비스를 다시 열어주세요.");
  }, [api, send]);
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
      footer={<ActionButton onClick={retry}>앱에서 다시 인증</ActionButton>}
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
