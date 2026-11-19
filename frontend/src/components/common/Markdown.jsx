import { Fragment } from "react";

// Tiny, safe Markdown subset for LLM output: #/## headings, "1. Heading" lines, - / * / 1. lists,
// **bold**, *italic*, `code`. Everything is rendered as React nodes (no raw HTML).
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i} className="text-ink">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[12px] text-charcoal">{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const BULLET = /^(\s*)[-*•]\s+(.*)$/;
const NUMBERED = /^(\s*)\d+[.)]\s+(.*)$/;
const HEADING = /^#{1,4}\s+(.*)$/;
const SECTION = /^\d+\.\s+(?:\*\*)?(Threat Assessment|Evidence Summary|Investigation Steps|Recommended Response Actions|Confidence Level)(?:\*\*)?:?\s*$/i; // "1. Threat Assessment"

export default function Markdown({ children = "" }) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };

  children.split("\n").forEach((raw) => {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) return flush();
    let m;
    if ((m = line.match(HEADING))) { flush(); blocks.push({ t: "h", text: m[1] }); }
    else if ((m = line.match(SECTION))) { flush(); blocks.push({ t: "h", text: m[1] }); }
    else if ((m = line.match(BULLET))) {
      if (!list || list.t !== "ul") { flush(); list = { t: "ul", items: [] }; }
      list.items.push({ depth: Math.min(2, Math.floor(m[1].length / 2)), text: m[2] });
    } else if ((m = line.match(NUMBERED))) {
      if (!list || list.t !== "ol") { flush(); list = { t: "ol", items: [] }; }
      list.items.push({ depth: Math.min(2, Math.floor(m[1].length / 2)), text: m[2] });
    } else { flush(); blocks.push({ t: "p", text: line.trim() }); }
  });
  flush();

  return (
    <div className="space-y-3 text-body-md text-charcoal [&_p]:leading-relaxed">
      {blocks.map((b, i) =>
        b.t === "h" ? (
          <h4 key={i} className="pt-2 text-heading-sm text-ink first:pt-0">{inline(b.text)}</h4>
        ) : b.t === "p" ? (
          <p key={i}>{inline(b.text)}</p>
        ) : (
          (() => {
            const Tag = b.t;
            return (
              <Tag key={i} className={`space-y-1.5 pl-5 ${b.t === "ul" ? "list-disc" : "list-decimal"} marker:text-mute`}>
                {b.items.map((it, j) => (
                  <li key={j} style={{ marginLeft: it.depth * 16 }}>{inline(it.text)}</li>
                ))}
              </Tag>
            );
          })()
        ),
      )}
    </div>
  );
}
