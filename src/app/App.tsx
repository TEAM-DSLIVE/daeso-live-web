import { useEffect, type ReactNode } from "react";
import { AppStateProvider, useAppState } from "@b1nd/aid-kit/app-state";
import { BridgeProvider } from "@b1nd/aid-kit/bridge-kit/web";
import { RouteProvider, Router } from "@b1nd/aid-kit/navigation";
import { SafeAreaProvider } from "@b1nd/aid-kit/safe-area-provider";
import { routes } from "./routes";

const ROUTE_STATE_VERSION = 2;

function RouteStateMigration({ children }: { children: ReactNode }) {
  const [version, setVersion] = useAppState(0, "daeso-live::route-state-version");
  const [, setStack] = useAppState<unknown[]>([], "router-provider::stack");
  const [, setTabEntry] = useAppState({ path: "/" }, "router-provider::tab-entry");

  useEffect(() => {
    if (version === ROUTE_STATE_VERSION) return;
    setStack([]);
    setTabEntry({ path: "/" });
    setVersion(ROUTE_STATE_VERSION);
  }, [setStack, setTabEntry, setVersion, version]);

  if (version !== ROUTE_STATE_VERSION) return null;
  return children;
}

export default function App() {
  return (
    <BridgeProvider>
      <SafeAreaProvider>
        <AppStateProvider>
          <RouteStateMigration>
            <RouteProvider routes={routes}>
              <Router routes={routes} />
            </RouteProvider>
          </RouteStateMigration>
        </AppStateProvider>
      </SafeAreaProvider>
    </BridgeProvider>
  );
}
