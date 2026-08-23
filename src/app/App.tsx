import { AppStateProvider } from "@b1nd/aid-kit/app-state";
import { BridgeProvider } from "@b1nd/aid-kit/bridge-kit/web";
import { RouteProvider, Router } from "@b1nd/aid-kit/navigation";
import { SafeAreaProvider } from "@b1nd/aid-kit/safe-area-provider";
import { routes } from "./routes";

export default function App() {
  return (
    <BridgeProvider>
      <SafeAreaProvider>
        <AppStateProvider>
          <RouteProvider routes={routes}>
            <Router routes={routes} />
          </RouteProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </BridgeProvider>
  );
}
