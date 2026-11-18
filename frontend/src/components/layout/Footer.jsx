import { Link } from "react-router-dom";
import { NAV_LINKS } from "./navLinks";

export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-canvas py-8">
      <div className="mx-auto flex max-w-wide px-4 md:px-6 flex-wrap items-center justify-center gap-x-5 gap-y-2 text-caption-sm text-body md:justify-between">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="py-2">
              {label}
            </Link>
          ))}
        </nav>
        <span>© 2026 Sentinel</span>
      </div>
    </footer>
  );
}
