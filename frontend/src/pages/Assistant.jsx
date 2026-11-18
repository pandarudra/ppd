import ChatWindow from "../components/assistant/ChatWindow";
import PageHeader from "../components/layout/PageHeader";

export default function Assistant() {
  return (
    <div className="mx-auto max-w-column space-y-8">
      <PageHeader title="Assistant">Ask about an alert, an incident, or any security question.</PageHeader>
      <ChatWindow />
    </div>
  );
}
