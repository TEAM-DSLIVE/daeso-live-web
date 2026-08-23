import { useEffect, useState } from "react";
import { parseRoute } from "../shared/navigation";

// Legacy parser retained for pure route tests; active app navigation uses AID RouteProvider.
export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route;
}
