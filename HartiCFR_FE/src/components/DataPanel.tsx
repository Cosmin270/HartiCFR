import { memo, useEffect, useMemo, useRef, useState } from "react";

export type ColumnFilter = "text" | "select";

// Rows are mounted in pages as the user scrolls. Mounting all ~2,300 at once
// made every tab switch, "select all" and filter change lay out the full
// table, which froze the page for a second or more.
const PAGE_SIZE = 100;

export interface ColumnDef<T> {
    key: string;
    label: string;
    filter: ColumnFilter;
    num?: boolean;
    get: (row: T) => string | number | undefined;
}

// A single data row. Wrapped in memo so that toggling one checkbox only
// re-renders that row instead of all ~2000+ rows in the table. This relies on
// `columns` and `onToggle` being stable references from the parent.
function TableRowInner<T extends { id: number }>({
    row,
    columns,
    isSel,
    isFocused,
    onToggle,
}: {
    row: T;
    columns: ColumnDef<T>[];
    isSel: boolean;
    isFocused: boolean;
    onToggle: (id: number) => void;
}) {
    const rowClass = [isSel ? "is-selected" : "", isFocused ? "is-focused" : ""]
        .filter(Boolean)
        .join(" ");
    return (
        <tr className={rowClass || undefined} onClick={() => onToggle(row.id)}>
            <td className="check">
                <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => onToggle(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Selectează rândul ${row.id}`}
                />
            </td>
            {columns.map((col) => (
                <td key={col.key} className={col.num ? "num" : undefined}>
                    {col.get(row)}
                </td>
            ))}
        </tr>
    );
}
const TableRow = memo(TableRowInner) as typeof TableRowInner;

interface DataPanelProps<T extends { id: number }> {
    title: string;
    columns: ColumnDef<T>[];
    rows: T[];
    loading: boolean;
    emptyText: string;
    selected: Set<number>;
    focusedId?: number | null;
    onToggleRow: (id: number) => void;
    onSelectMany: (ids: number[], select: boolean) => void;
    onClearSelection: () => void;
    onRender: () => void;
    renderCount?: number;
    hidden?: boolean;
}

export default function DataPanel<T extends { id: number }>({
    title,
    columns,
    rows,
    loading,
    emptyText,
    selected,
    focusedId = null,
    onToggleRow,
    onSelectMany,
    onClearSelection,
    onRender,
    renderCount,
    hidden = false,
}: DataPanelProps<T>) {
    const plotCount = renderCount ?? selected.size;
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [limit, setLimit] = useState(PAGE_SIZE);
    const wrapRef = useRef<HTMLDivElement>(null);
    const moreRef = useRef<HTMLTableRowElement>(null);

    const selectOptions = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const col of columns) {
            if (col.filter !== "select") continue;
            const values = new Set<string>();
            for (const row of rows) {
                const v = col.get(row);
                if (v !== undefined && v !== null && v !== "") values.add(String(v));
            }
            map[col.key] = Array.from(values).sort();
        }
        return map;
    }, [columns, rows]);

    const filtered = useMemo(() => {
        return rows.filter((row) =>
            columns.every((col) => {
                const q = filters[col.key];
                if (!q) return true;
                const raw = col.get(row);
                const val = raw === undefined || raw === null ? "" : String(raw);
                return col.filter === "select"
                    ? val === q
                    : val.toLowerCase().includes(q.toLowerCase());
            })
        );
    }, [rows, columns, filters]);

    const anyFilterActive = Object.values(filters).some((v) => v !== "");
    const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
    const allSelected =
        filtered.length > 0 && filteredIds.every((id) => selected.has(id));

    const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
    const hasMore = limit < filtered.length;

    // Grow the window when the placeholder row nears the bottom of the scroll
    // area. Re-observing after every growth makes the observer report again
    // if the placeholder is still in view (e.g. after a fast scroll).
    useEffect(() => {
        const target = moreRef.current;
        if (!hasMore || hidden || !target) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setLimit((l) => l + PAGE_SIZE);
                }
            },
            { root: wrapRef.current, rootMargin: "300px 0px" }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, hidden, limit]);

    function setFilter(key: string, value: string) {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setLimit(PAGE_SIZE);
        wrapRef.current?.scrollTo({ top: 0 });
    }

    function clearFilters() {
        setFilters({});
        setLimit(PAGE_SIZE);
    }

    return (
        <section className={`panel panel--table${hidden ? " is-hidden" : ""}`}>
            <div className="panel__head">
                <h2 className="panel__title">
                    {title}
                    <span className="panel__meta">
                        {loading
                            ? "Se încarcă…"
                            : anyFilterActive
                              ? `${filtered.length} din ${rows.length} rânduri`
                              : `${rows.length} rânduri`}
                    </span>
                </h2>
                <div className="panel__actions">
                    {anyFilterActive && (
                        <button type="button" className="btn-clear" onClick={clearFilters}>
                            Șterge filtrele
                        </button>
                    )}
                    {selected.size > 0 && (
                        <button type="button" className="btn-clear" onClick={onClearSelection}>
                            Deselectează tot
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn-render"
                        onClick={onRender}
                        disabled={plotCount === 0}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
                            <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        Afișează pe hartă {plotCount > 0 ? `(${plotCount})` : ""}
                    </button>
                </div>
            </div>

            <div className="log-table-wrap" ref={wrapRef}>
                <table className="log-table">
                    <thead>
                        <tr className="head-labels">
                            <th className="check" aria-hidden="true" />
                            {columns.map((col) => (
                                <th key={col.key} className={col.num ? "num" : undefined}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                        <tr className="head-filters">
                            <th className="check">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() => onSelectMany(filteredIds, !allSelected)}
                                    aria-label="Selectează toate rândurile filtrate"
                                    disabled={loading || filtered.length === 0}
                                />
                            </th>
                            {columns.map((col) => (
                                <th key={col.key}>
                                    {col.filter === "select" ? (
                                        <select
                                            value={filters[col.key] ?? ""}
                                            onChange={(e) => setFilter(col.key, e.target.value)}
                                            aria-label={`Filtrează după ${col.label}`}
                                            disabled={loading}
                                        >
                                            <option value="">Toate</option>
                                            {selectOptions[col.key]?.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={filters[col.key] ?? ""}
                                            onChange={(e) => setFilter(col.key, e.target.value)}
                                            placeholder="Filtrează…"
                                            aria-label={`Filtrează după ${col.label}`}
                                            disabled={loading}
                                        />
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading &&
                            Array.from({ length: 12 }).map((_, i) => (
                                <tr key={`sk-${i}`} className="skeleton-row">
                                    <td className="check" />
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            <span className="skeleton" />
                                        </td>
                                    ))}
                                </tr>
                            ))}

                        {!loading &&
                            visible.map((row) => (
                                <TableRow
                                    key={row.id}
                                    row={row}
                                    columns={columns}
                                    isSel={selected.has(row.id)}
                                    isFocused={row.id === focusedId}
                                    onToggle={onToggleRow}
                                />
                            ))}

                        {!loading && hasMore && (
                            <tr ref={moreRef} className="log-table__more">
                                <td colSpan={columns.length + 1}>
                                    Se încarcă mai multe rânduri… ({visible.length} din {filtered.length})
                                </td>
                            </tr>
                        )}

                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="log-table__empty">
                                    {rows.length === 0
                                        ? emptyText
                                        : "Niciun rând nu corespunde filtrelor."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}