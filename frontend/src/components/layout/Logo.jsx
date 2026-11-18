import { Shield } from "lucide-react";

// ponytail: stroke-only shield stands in for the spec's mascot; swap for a drawn mark when one exists.
export default function Logo({ size = 24 }) {
  return <Shield size={size} strokeWidth={1.5} className="text-ink" aria-hidden />;
}
