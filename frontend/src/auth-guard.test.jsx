import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Markdown from "./components/common/Markdown";

test("Markdown renders sections, bold and lists without raw HTML", () => {
  const { container } = render(<Markdown>{"1. Threat Assessment\n*   **Severity:** High <b>x</b>\n2.  Step two\n- a\n- b"}</Markdown>);
  expect(screen.getByRole("heading", { name: "Threat Assessment" })).toBeInTheDocument();
  expect(screen.getByText("Severity:").tagName).toBe("STRONG");
  expect(container.querySelectorAll("li").length).toBe(4);
  expect(container.querySelector("b")).toBeNull(); // escaped, not injected
});

test("signed-in user is redirected away from /login and survives a refresh", async () => {
  localStorage.setItem(
    "sentinel-auth",
    JSON.stringify({ state: { token: "t", refreshToken: "r", user: { role: "admin", full_name: "A" }, isAuthenticated: true }, version: 0 }),
  );
  window.history.pushState({}, "", "/login");
  const { default: App } = await import("./App");
  render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);
  await screen.findByText(/Sentinel · Security operations/);
  expect(window.location.pathname).toBe("/dashboard");
  expect(screen.queryByText("Sign in to the console")).toBeNull();
});
