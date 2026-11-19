import { useState } from "react";
import { LogOut } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import PageHeader from "../components/layout/PageHeader";
import { useAuthStore } from "../stores/authStore";
import { changePassword, logout as logoutApi } from "../api/authApi";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [form, setForm] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: "", next: "" });
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      const d = err.response?.data?.detail;
      setMsg({ ok: false, text: typeof d === "string" ? d : "Could not change password." });
    } finally {
      setBusy(false);
    }
  }

  // Best effort: blacklist the token server-side, then clear local state regardless.
  const signOut = () => logoutApi().catch(() => {}).finally(logout);

  const rows = [["Name", user?.full_name], ["Email", user?.email], ["Role", user?.role]];

  return (
    <div className="mx-auto max-w-column space-y-6">
      <PageHeader title="Profile" actions={<Button variant="secondary" onClick={signOut}><LogOut size={14} />Sign out</Button>}>
        Your account and security settings.
      </PageHeader>

      <Card>
        <div className="mb-4 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-heading-md uppercase text-on-dark">
            {(user?.full_name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
          </span>
          <div>
            <div className="text-heading-sm">{user?.full_name}</div>
            <div className="text-body-sm capitalize text-body">{user?.role}</div>
          </div>
        </div>
        <ul>
          {rows.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between border-t border-hairline py-3 text-body-sm">
              <span className="text-body">{k}</span>
              <span className="text-ink">{v}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-4 text-heading-sm">Change password</h2>
        <form onSubmit={submit} className="space-y-3">
          <input aria-label="Current password" type="password" autoComplete="current-password" required placeholder="Current password" className="text-input" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          <input aria-label="New password" type="password" autoComplete="new-password" required minLength={8} placeholder="New password (8+ characters)" className="text-input" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          {msg && <p role="status" className={`text-body-sm ${msg.ok ? "text-primary" : "text-sev-critical"}`}>{msg.text}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      </Card>
    </div>
  );
}
