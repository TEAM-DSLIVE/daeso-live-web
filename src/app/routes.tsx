import { useCallback, useState } from "react";
import { RouteParams, Routes, useRouter } from "@b1nd/aid-kit/navigation";
import { RandomChat } from "../features/random-chat/RandomChat";
import { AppPages } from "../pages/AppPages";
import { Navigate, Page } from "../shared/navigation";

type RandomPage = Extract<Page, "waiting" | "matching" | "chat" | "ended" | "connection-error" | "send-failed">;
const RANDOM_PAGES = new Set<string>(["waiting", "matching", "chat", "ended", "connection-error", "send-failed"]);

function RandomFlowRoute() {
  const [page, setPage] = useState<RandomPage>("matching");
  const { pop } = useRouter().stack;

  const onNavigate = useCallback<Navigate>((target) => {
    if (target === "home") {
      pop();
      return;
    }
    if (RANDOM_PAGES.has(target)) setPage(target as RandomPage);
  }, [pop]);

  return <RandomChat page={page} onNavigate={onNavigate} />;
}

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

    if (RANDOM_PAGES.has(target)) {
      push("/random");
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
    { path: "/random", element: () => <RandomFlowRoute /> },
    { path: "/settings", element: page("settings") },
    { path: "/privacy", element: page("privacy") },
    { path: "/support", element: page("support") },
    { path: "/admin", element: page("admin") },
    { path: "/admin/:userId", element: ({ params }) => <AIDRoute page="admin-chat" params={params} /> },
  ],
};
