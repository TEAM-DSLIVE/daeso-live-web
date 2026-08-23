import { RouteParams, Routes, useRouter } from "@b1nd/aid-kit/navigation";
import { AppPages } from "../pages/AppPages";
import { Navigate, Page } from "../shared/navigation";

function AIDRoute({ page, params }: { page: Page; params?: RouteParams }) {
  const { tab, stack } = useRouter();
  const currentStack = stack.current;
  const currentStackPath = currentStack[currentStack.length - 1]?.path;

  const onNavigate: Navigate = (target) => {
    if (target === "home") {
      if (currentStack.length) stack.pop();
      if (tab.current !== "/") tab.move("/");
      return;
    }

    if (target === "settings" && (currentStackPath === "/privacy" || currentStackPath === "/support")) {
      stack.pop();
      return;
    }

    if (target === "admin" && currentStackPath?.startsWith("/admin/")) {
      stack.pop();
      return;
    }

    stack.push(`/${target}`);
  };

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
