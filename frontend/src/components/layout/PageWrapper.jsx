import Navbar from "./Navbar";
import Footer from "./Footer";
import { useWebSocket } from "../../hooks/useWebSocket";

export default function PageWrapper({ children }) {
  useWebSocket();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-wide flex-1 px-4 py-12 md:px-6 md:py-16">{children}</main>
      <Footer />
    </div>
  );
}
