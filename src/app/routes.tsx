import { useCallback } from "react";
import { RouteParams, Routes, useRouter } from "@b1nd/aid-kit/navigation";
import { AppPages } from "../pages/AppPages";
import { Navigate, Page } from "../shared/navigation";

function AIDRoute({ page, params }: { page: Page; params?: RouteParams }) {
  const { tab, stack } = useRouter();
  const { move } = tab;
  const { pop, push } = stack;

  const onNavigate = useCallback<Navigate>((target) => {
    if (target === "home") {
      pop();
      move("/");
      return;
    }

    if (target === "settings" && (page === "privacy" || page === "support")) {
      pop();
      return;
    }

    if (target === "admin" && page === "admin-chat") {
      pop();
      return;
    }

    push(`/${target}`);
  }, [move, page, pop, push]);

  return <AppPages route={{ page, userId: params?.userId }} onNavigate={onNavigate} />;
}

const page = (name: Page) => () => <AIDRoute page={name} />;

export const routes: Routes = {
  tabs: [{ path: "/", index: true, element: page("home") }],
  stacks: [
    { path: "/waiting", element: page("waiting") },
    { path: "/matching", element: page("matching") },
    { path: "/chat", element: page("chat") },
    { path: "/ended", element: page("ended") },
    { path: "/connection-error", element: page("connection-error") },
    { path: "/send-failed", element: page("send-failed") },
    { path: "/settings", element: page("settings") },
    { path: "/privacy", element: page("privacy") },
    { path: "/support", element: page("support") },
    { path: "/admin", element: page("admin") },
    { path: "/admin/:userId", element: ({ params }) => <AIDRoute page="admin-chat" params={params} /> },
  ],
};
