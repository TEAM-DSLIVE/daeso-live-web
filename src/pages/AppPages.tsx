import { ApiClient, type Role } from "../shared/api";
import { AdminInquiry } from "../features/admin-inquiry/AdminInquiry";
import { RandomChat } from "../features/random-chat/RandomChat";
import { SupportChat } from "../features/support-chat/SupportChat";
import { useSupportChat } from "../features/support-chat/model";
import { Navigate, Route } from "../shared/navigation";
import { AccessDeniedPage, HomePage, PrivacyPage, SettingsPage } from "./StaticPages";

export function AppPages({ api, role, route, onNavigate }: { api: ApiClient; role: Role; route: Route; onNavigate: Navigate }) {
  const support = useSupportChat(api, route.page === "support");

  if (route.page === "settings") return <SettingsPage onNavigate={onNavigate} />;
  if (route.page === "privacy") return <PrivacyPage onNavigate={onNavigate} />;
  if (route.page === "support") {
    return (
      <SupportChat
        messages={support.messages}
        loading={support.loading}
        loadingOlder={support.loadingOlder}
        sending={support.sending}
        error={support.error}
        hasOlder={Boolean(support.nextCursor)}
        onLoadOlder={() => void support.loadOlder()}
        onNavigate={onNavigate}
        onSend={support.send}
      />
    );
  }
  if (route.page === "admin" || route.page === "admin-chat") {
    if (role !== "ADMIN") return <AccessDeniedPage onNavigate={onNavigate} />;
    return (
      <AdminInquiry
        api={api}
        threadId={route.page === "admin-chat" ? route.userId : undefined}
        onNavigate={onNavigate}
      />
    );
  }
  if (route.page !== "home") return <RandomChat api={api} page={route.page} onNavigate={onNavigate} />;
  return <HomePage api={api} onNavigate={onNavigate} />;
}
