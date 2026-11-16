import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon, type IconName } from "./Icon";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon: IconName;
  keys?: string[];
  keywords?: string;
  run: () => void;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return commands;
    return commands.filter((c) => norm(`${c.label} ${c.group} ${c.keywords ?? ""}`).includes(q));
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const exec = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    // Let the dialog close (and restore focus) before running the command.
    setTimeout(c.run, 0);
  };

  let lastGroup = "";
  return (
    <Dialog open={open} onClose={onClose} title="Commandes" bare label="Palette de commandes" className="cmdk">
      <div className="cmdk-input">
        <Icon name="search" />
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={results[active] ? `cmd-${results[active]!.id}` : undefined}
          placeholder="Rechercher une action ou un écran…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); exec(results[active]); }
          }}
        />
        <kbd>Échap</kbd>
      </div>
      <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef} aria-label="Résultats">
        {results.length === 0 && <div className="cmdk-empty">Aucune commande pour « {query} »</div>}
        {results.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          return (
            <div key={c.id}>
              {header && <div className="cmdk-group overline" role="presentation">{header}</div>}
              <button
                id={`cmd-${c.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                data-index={i}
                className="cmdk-item"
                tabIndex={-1}
                onMouseMove={() => setActive(i)}
                onClick={() => exec(c)}
              >
                <Icon name={c.icon} />
                {c.label}
                {c.keys && <span className="meta">{c.keys.map((k) => <kbd key={k}>{k}</kbd>)}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
