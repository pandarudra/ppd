import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import MessageBubble from "./MessageBubble";
import Button from "../common/Button";
import Spinner from "../common/Spinner";
import * as assistantApi from "../../api/assistantApi";

const SUGGESTED_PROMPTS = [
  "What should I do next?",
  "Summarize recent alerts",
  "Is this a credible threat?",
];

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [contextAlertId, setContextAlertId] = useState("");
  const [contextIncidentId, setContextIncidentId] = useState("");

  const analyzeMutation = useMutation({
    mutationFn: (question) =>
      assistantApi.analyze({
        question,
        context_alert_ids: contextAlertId ? [contextAlertId] : [],
        context_incident_id: contextIncidentId || null,
      }),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.analysis }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong reaching the AI assistant." },
      ]);
    },
  });

  function send(question) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    analyzeMutation.mutate(question);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-200"
          placeholder="Pin alert ID (optional)"
          value={contextAlertId}
          onChange={(e) => setContextAlertId(e.target.value)}
        />
        <input
          className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-200"
          placeholder="Pin incident ID (optional)"
          value={contextIncidentId}
          onChange={(e) => setContextIncidentId(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.length === 0 && (
          <div className="text-slate-500 text-sm">
            Ask SENTINEL-AI about an alert, incident, or general security question.
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {analyzeMutation.isPending && <Spinner />}
      </div>

      <div className="flex gap-2 mb-2 flex-wrap">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded-full text-slate-300 hover:bg-slate-700"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100"
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
        />
        <Button type="submit" disabled={analyzeMutation.isPending}>
          Send
        </Button>
      </form>
    </div>
  );
}
