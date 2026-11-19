import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Button from "../components/common/Button";
import WorldMap from "../components/charts/WorldMap";
import { DEMO_EURASIA } from "../utils/demoSources";
import Wordmark from "../components/layout/Wordmark";
import Logo from "../components/layout/Logo";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate(from || "/dashboard", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 md:px-16">
        <Link to="/" className="mb-10 flex items-center gap-2" aria-label="Back to home">
          <Logo size={28} />
          <Wordmark className="text-[24px]" />
        </Link>
        <h1 className="text-display-xl">Sign in to the console</h1>
        <p className="mt-2 text-body-md text-body">Security operations, in one place.</p>

        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="text-input" placeholder="analyst@sentinel.local" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="text-input pr-11" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-body">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="text-body-sm text-sev-critical">{error}</p>}
          <Button type="submit" className="h-10 w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
        </form>
      </div>
      <div className="relative hidden overflow-hidden border-l border-hairline bg-panel lg:block" aria-hidden>
        <WorldMap fill sources={DEMO_EURASIA} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_30%,rgba(0,117,255,0.14),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-panel to-transparent" />
        <p className="absolute bottom-8 left-8 right-8 text-body-md text-body">
          <span className="text-heading-sm text-ink">Every attack, on one map.</span><br />Illustrative traffic shown.
        </p>
      </div>
    </div>
  );
}
