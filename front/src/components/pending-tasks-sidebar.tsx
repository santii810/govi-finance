"use client";

import type { ClassifiedPending, PersonaValue } from "@/lib/import-rules/types";
import {
  EMPTY_PENDING_FILTERS,
  getCuentaFilterOptions,
  hasActiveFilters,
  PERSONA_FILTER_OPTIONS,
  TABLA_DESTINO_FILTER_OPTIONS,
  TIPO_FILTER_OPTIONS,
  type PendingTasksFilters,
  type TablaDestinoFilter,
} from "@/lib/pending-tasks-filters";

interface PendingTasksSidebarProps {
  items: ClassifiedPending[];
  filters: PendingTasksFilters;
  filteredCount: number;
  onFiltersChange: (filters: PendingTasksFilters) => void;
}

function FilterCheckboxList<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(value: T) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <ul className="space-y-1.5">
      {options.map((option) => (
        <li key={option.value}>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            {option.label}
          </label>
        </li>
      ))}
    </ul>
  );
}

export function PendingTasksSidebar({
  items,
  filters,
  filteredCount,
  onFiltersChange,
}: PendingTasksSidebarProps) {
  const cuentaOptions = getCuentaFilterOptions(items);
  const active = hasActiveFilters(filters);

  function patchFilters(patch: Partial<PendingTasksFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="space-y-4 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-24">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Filtrar</h3>
            {active && (
              <button
                type="button"
                onClick={() => onFiltersChange(EMPTY_PENDING_FILTERS)}
                className="text-xs text-accent hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Concepto</span>
              <input
                type="search"
                value={filters.concepto}
                onChange={(e) => patchFilters({ concepto: e.target.value })}
                placeholder="Buscar…"
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            {cuentaOptions.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-muted">Cuenta</p>
                <FilterCheckboxList
                  options={cuentaOptions.map((option) => ({
                    value: option.key,
                    label: option.label,
                  }))}
                  selected={filters.cuentas}
                  onChange={(cuentas) => patchFilters({ cuentas })}
                />
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs text-muted">Tipo</p>
              <FilterCheckboxList
                options={TIPO_FILTER_OPTIONS}
                selected={filters.tipos}
                onChange={(tipos) => patchFilters({ tipos })}
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs text-muted">Persona</p>
              <FilterCheckboxList
                options={PERSONA_FILTER_OPTIONS.map((persona) => ({
                  value: persona,
                  label: persona,
                }))}
                selected={filters.personas}
                onChange={(personas) =>
                  patchFilters({ personas: personas as PersonaValue[] })
                }
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs text-muted">Tabla destino</p>
              <FilterCheckboxList
                options={TABLA_DESTINO_FILTER_OPTIONS}
                selected={filters.tablasDestino}
                onChange={(tablasDestino) =>
                  patchFilters({ tablasDestino: tablasDestino as TablaDestinoFilter[] })
                }
              />
            </div>
          </div>
        </section>

        {items.length > 0 && (
          <p className="border-t border-border pt-3 text-xs text-muted">
            {active ? (
              <>
                Mostrando <span className="text-foreground">{filteredCount}</span> de{" "}
                {items.length}
              </>
            ) : (
              <>
                <span className="text-foreground">{items.length}</span> tareas
              </>
            )}
          </p>
        )}
      </div>
    </aside>
  );
}
