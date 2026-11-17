import ChatWindow from "../components/assistant/ChatWindow";

export default function Assistant() {
  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <h1 className="text-xl font-bold text-slate-100 mb-4">AI SOC Assistant</h1>
      <div className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-4">
        <ChatWindow />
      </div>
    </div>
  );
}
