import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Log } from "../types/log";
import type { Station } from "../types/station";
import type { MapLayer } from "./GeoMap";
import { fold } from "@/lib/text";
import "./GlobalSearch.scss";

const MAX_PER_GROUP = 5;

const PHONE_QUERY = "(max-width: 640px)";

function subscribePhone(onChange: () => void) {
    const mq = window.matchMedia(PHONE_QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
}

// The box is narrow on phones, where the full placeholder gets cut off.
function useIsPhone(): boolean {
    return useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches);
}

interface Result {
    layer: MapLayer;
    id: number;
    title: string;
    meta: string;
    // Lower sorts first: a name that starts with the query beats one that
    // merely contains it.
    rank: number;
}

interface IndexEntry<T> {
    item: T;
    name: string;
    haystack: string;
}

function rankOf(name: string, haystack: string, q: string): number {
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (haystack.includes(q)) return 2;
    return -1;
}

function topResults<T>(index: IndexEntry<T>[], q: string, toResult: (item: T, rank: number) => Result): Result[] {
    const hits: Result[] = [];
    for (const entry of index) {
        const rank = rankOf(entry.name, entry.haystack, q);
        if (rank >= 0) hits.push(toResult(entry.item, rank));
    }
    return hits.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title, "ro")).slice(0, MAX_PER_GROUP);
}

interface GlobalSearchProps {
    logs: Log[];
    stations: Station[];
    onPick: (layer: MapLayer, id: number) => void;
}

export default function GlobalSearch({ logs, stations, onPick }: GlobalSearchProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const isPhone = useIsPhone();

    // Folded once per data load, so typing only does substring checks.
    const stationIndex = useMemo<IndexEntry<Station>[]>(
        () => stations.map((s) => ({ item: s, name: fold(s.name), haystack: `${fold(s.name)} ${s.cod}` })),
        [stations]
    );
    const crossingIndex = useMemo<IndexEntry<Log>[]>(
        () =>
            logs.map((l) => {
                const name = fold(`${l.location?.start ?? ""} ${l.location?.end ?? ""}`);
                return { item: l, name, haystack: `${name} ${fold(l.srcf)} ${fold(l.ct)} #${l.id}` };
            }),
        [logs]
    );

    const q = fold(query.trim());
    const results = useMemo<Result[]>(() => {
        if (q.length < 2 && !/^#?\d+$/.test(q)) return [];
        return [
            ...topResults(stationIndex, q, (s, rank) => ({
                layer: "stations",
                id: s.id,
                title: s.name,
                meta: `Stație · cod ${s.cod}`,
                rank,
            })),
            ...topResults(crossingIndex, q, (l, rank) => ({
                layer: "crossings",
                id: l.id,
                title: `${l.location?.start || "—"}${l.location?.end ? ` → ${l.location.end}` : ""}`,
                meta: `Trecere #${l.id} · ${l.srcf} · ${l.ct} · km ${l.tnPosition}`,
                rank,
            })),
        ];
    }, [q, stationIndex, crossingIndex]);

    useEffect(() => setActive(0), [q]);

    // "/" jumps to the search box from anywhere on the dashboard.
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const typing = target?.closest("input, textarea, select, [contenteditable]");
            if (e.key === "/" && !typing) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    function pick(result: Result) {
        onPick(result.layer, result.id);
        setQuery("");
        setOpen(false);
        inputRef.current?.blur();
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "ArrowDown" && results.length > 0) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % results.length);
        } else if (e.key === "ArrowUp" && results.length > 0) {
            e.preventDefault();
            setActive((i) => (i - 1 + results.length) % results.length);
        } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            pick(results[active]);
        } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
        }
    }

    const showList = open && q.length > 0;
    const firstCrossing = results.findIndex((r) => r.layer === "crossings");

    return (
        <div className="global-search">
            <svg className="global-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
            </svg>
            <input
                ref={inputRef}
                type="search"
                className="global-search__input"
                placeholder={isPhone ? "Caută…" : "Caută o stație sau o trecere…"}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-label="Caută o stație sau o trecere la nivel"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
                autoComplete="off"
                spellCheck={false}
            />
            {!query && <kbd className="global-search__kbd" aria-hidden="true">/</kbd>}

            {showList && (
                <ul className="global-search__list" id={listId} role="listbox">
                    {results.length === 0 && (
                        <li className="global-search__empty" role="presentation">
                            {q.length < 2 ? "Scrie cel puțin două litere…" : `Niciun rezultat pentru „${query.trim()}”`}
                        </li>
                    )}
                    {results.map((r, i) => (
                        <li key={`${r.layer}-${r.id}`} role="presentation">
                            {(i === 0 || i === firstCrossing) && (
                                <span className="global-search__group">
                                    {r.layer === "stations" ? "Stații" : "Treceri la nivel"}
                                </span>
                            )}
                            <div
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                className={`global-search__option${i === active ? " is-active" : ""}`}
                                // Keep focus in the input so blur does not close the list first.
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => pick(r)}
                            >
                                <span className={`global-search__dot global-search__dot--${r.layer}`} aria-hidden="true" />
                                <span className="global-search__text">
                                    <span className="global-search__title">{r.title}</span>
                                    <span className="global-search__meta">{r.meta}</span>
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
