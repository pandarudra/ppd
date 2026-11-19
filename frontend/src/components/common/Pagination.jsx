import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** page/perPage state for a server- or client-paged list. Changing the page size or calling reset() returns to page 1. */
export function usePagination(initialPerPage = 25) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(initialPerPage);
  return {
    page,
    perPage,
    setPage,
    setPerPage: (n) => { setPerPageState(n); setPage(1); },
    reset: () => setPage(1),
  };
}

function pageList(page, pages) {
  // 1 … 4 5 [6] 7 8 … 20
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return list.flatMap((n, i) => (i && n - list[i - 1] > 1 ? ["…" + n, n] : [n]));
}

const btn = "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-body-sm transition-colors";

export default function Pagination({ page, perPage, total = 0, onPage, onPerPage, compact = false }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (!total) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-4 text-body-sm text-body">
      {!compact && <span className="tabular">Showing {from}–{to} of {total}</span>}
      <div className={`flex items-center gap-1 ${compact ? "w-full justify-between" : ""}`}>
        <button aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${btn} border border-hairline bg-surface text-charcoal hover:border-hairline-strong disabled:text-mute disabled:hover:border-hairline`}>
          <ChevronLeft size={16} />
        </button>
        {compact ? (
          <span className="tabular px-2">{page} / {pages}</span>
        ) : (
          pageList(page, pages).map((n) =>
            typeof n === "string" ? (
              <span key={n} className="px-1 text-mute">…</span>
            ) : (
              <button key={n} aria-label={`Page ${n}`} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)} className={`${btn} tabular ${n === page ? "bg-secondary text-on-dark" : "text-charcoal hover:bg-surface"}`}>
                {n}
              </button>
            ),
          )
        )}
        <button aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${btn} border border-hairline bg-surface text-charcoal hover:border-hairline-strong disabled:text-mute disabled:hover:border-hairline`}>
          <ChevronRight size={16} />
        </button>
      </div>
      {!compact && onPerPage && (
        <label className="flex items-center gap-2">
          Rows
          <select aria-label="Rows per page" className="search-pill !h-8" value={perPage} onChange={(e) => onPerPage(Number(e.target.value))}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
    </nav>
  );
}
