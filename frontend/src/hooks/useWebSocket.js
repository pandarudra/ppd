import { useEffect, useRef } from "react";
import { useAuthStore } from "../stores/authStore";
import { useAlertStore } from "../stores/alertStore";
import { useIncidentStore } from "../stores/incidentStore";
import { useWsStore } from "../stores/wsStore";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

export function useWebSocket() {
  const token = useAuthStore((s) => s.token);
  const wsRef = useRef(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!token) return;

    let closedByCleanup = false;
    let timeoutId;

    function connect() {
      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        useWsStore.getState().setConnected(true);
      };

      ws.onmessage = (event) => {
        const { type, payload } = JSON.parse(event.data);
        switch (type) {
          case "new_alert":
            useAlertStore.getState().prependAlert(payload);
            break;
          case "alert_updated":
            useAlertStore.getState().updateAlert(payload);
            break;
          case "incident_created":
            useIncidentStore.getState().addIncident(payload);
            break;
          case "incident_updated":
            useIncidentStore.getState().updateIncident(payload);
            break;
          case "system_health_update":
            useWsStore.getState().setHealth(payload);
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        useWsStore.getState().setConnected(false);
        if (closedByCleanup) return;
        const delay = Math.min(30000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        timeoutId = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      closedByCleanup = true;
      clearTimeout(timeoutId);
      wsRef.current?.close();
    };
  }, [token]);
}
