import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/layout/PageHeader";
import * as usersApi from "../api/usersApi";
import { timeAgo } from "../utils/formatters";

const ROLES = ["admin", "analyst", "viewer"];
const EMPTY = { email: "", full_name: "", password: "", role: "analyst" };

export default function UserManagement() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.listUsers({ per_page: 100 }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await usersApi.createUser(form);
      setForm(EMPTY);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail?.toString() || "Could not create user");
    }
  }

  const columns = [
    { key: "full_name", label: "Name" },
    { key: "email", label: "Email" },
    {
      key: "role", label: "Role",
      render: (u) => (
        <select aria-label={`Role for ${u.email}`} className="search-pill" value={u.role}
          onChange={(e) => usersApi.updateUser(u.id, { role: e.target.value }).then(refresh)}>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      ),
    },
    { key: "last_login", label: "Last login", render: (u) => (u.last_login ? timeAgo(u.last_login) : "never") },
    {
      key: "is_active", label: "Status",
      render: (u) => (
        <Button variant="secondary" onClick={() => usersApi.updateUser(u.id, { is_active: !u.is_active }).then(refresh)}>
          {u.is_active ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Users">Create accounts and manage roles. Admin only.</PageHeader>
      <Card>
        <h2 className="mb-4 text-heading-md">New user</h2>
        <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input aria-label="Full name" required placeholder="Full name" className="text-input-sm" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input aria-label="Email" type="email" required placeholder="Email" className="text-input-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input aria-label="Password" type="password" required minLength={8} placeholder="Password" className="text-input-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select aria-label="Role" className="text-input-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <Button type="submit">Create</Button>
        </form>
        {error && <p className="mt-3 text-body-sm text-ink" role="alert">{error}</p>}
      </Card>
      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.users} emptyMessage="No users." />}
    </div>
  );
}
