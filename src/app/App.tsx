import { AppPages } from "../pages/AppPages";
import { navigate, useRoute } from "./router";

export default function App() {
  return <AppPages route={useRoute()} onNavigate={navigate} />;
}
