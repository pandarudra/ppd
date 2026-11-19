import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./index.css";
import { useAuthStore } from "./stores/authStore";
import { useAlertStore } from "./stores/alertStore";
import { useEventStore } from "./stores/eventStore";

// Cache aggressively: data is also pushed over WebSocket, so refetch-on-focus/mount is wasted work.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false, retry: 1 } },
});

// Signing out must not leave the previous user's data behind.
useAuthStore.subscribe((s, prev) => {
  if (prev.isAuthenticated && !s.isAuthenticated) {
    queryClient.clear();
    useAlertStore.getState().setAlerts([]);
    useEventStore.getState().clear();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);

if (import.meta.env.DEV) import("agentation").then(({ Agentation }) => {
  const el = document.createElement("div");
  document.body.appendChild(el);
  import("react-dom/client").then(({ createRoot }) => createRoot(el).render(<Agentation />));
});
