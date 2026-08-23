import { AdminInquiry } from "../features/admin-inquiry/AdminInquiry";
import { RandomChat } from "../features/random-chat/RandomChat";
import { SupportChat } from "../features/support-chat/SupportChat";
import { useSupportThreads } from "../features/support-chat/model";
import { Navigate, Route } from "../shared/navigation";
import { HomePage, PrivacyPage, SettingsPage } from "./StaticPages";

export function AppPages({ route, onNavigate }: { route: Route; onNavigate: Navigate }) {
  const support = useSupportThreads();

  if (route.page === "settings") return <SettingsPage onNavigate={onNavigate} />;
  if (route.page === "privacy") return <PrivacyPage onNavigate={onNavigate} />;
  if (route.page === "support") {
    return (
      <SupportChat
        messages={support.messagesByUser.A17}
        onNavigate={onNavigate}
        onSend={(value) => support.send("A17", "user", value)}
      />
    );
  }
  if (route.page === "admin" || route.page === "admin-chat") {
    return (
      <AdminInquiry
        userId={route.page === "admin-chat" ? route.userId : undefined}
        messagesByUser={support.messagesByUser}
        onNavigate={onNavigate}
        onSend={(userId, value) => support.send(userId, "admin", value)}
      />
    );
  }
  if (route.page !== "home") return <RandomChat page={route.page} onNavigate={onNavigate} />;
  return <HomePage onNavigate={onNavigate} />;
}
