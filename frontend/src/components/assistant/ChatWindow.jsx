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
    <div className="space-y-8">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          aria-label="Pin alert ID"
          className="text-input-sm font-mono"
          placeholder="Pin alert ID (optional)"
          value={contextAlertId}
          onChange={(e) => setContextAlertId(e.target.value)}
        />
        <input
          aria-label="Pin incident ID"
          className="text-input-sm font-mono"
          placeholder="Pin incident ID (optional)"
          value={contextIncidentId}
          onChange={(e) => setContextIncidentId(e.target.value)}
        />
      </div>

      <div className="space-y-6" aria-live="polite">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {analyzeMutation.isPending && <Spinner />}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button key={p} onClick={() => send(p)} className="command-tag font-sans">
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex h-12 items-center gap-2 rounded-full bg-surface-soft pl-5 pr-1.5 focus-within:bg-canvas focus-within:ring-[3px] focus-within:ring-blue-500/50"
      >
        <input
          aria-label="Question"
          className="min-w-0 flex-1 bg-transparent text-body-md text-ink placeholder:text-mute focus:shadow-none"
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
        />
        <Button type="submit" disabled={analyzeMutation.isPending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
