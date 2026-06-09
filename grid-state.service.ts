import { Injectable } from '@angular/core';
import { GridApi } from 'ag-grid-community';
import { GridSchema, GridPersistedState } from './grid-state.models';
import { mergeColumnState } from './grid-state.merger';

const LS_PREFIX = 'grid_state__';

@Injectable({ providedIn: 'root' })
export class GridStateService {

  // ── Init ──────────────────────────────────────────────────────────────────
  // Applies columns + filters + row selection immediately on gridReady.
  // Does NOT restore scroll here — scroll is restored in restoreScroll()
  // which must be called from the (firstDataRendered) event.
  // Does NOT save scroll here — saves only columns/filters/selection,
  // and preserves any previously saved scrollPosition from localStorage.

  init(api: GridApi, schema: GridSchema): void {
    const persisted = this.load(schema.gridId);

    // 1. Column order, sizing, visibility, pinning, sort, row group
    const mergedColumns = mergeColumnState(schema.columns, persisted);
    api.applyColumnState({ state: mergedColumns, applyOrder: true });

    // 2. User filters only — parent-driven colIds are excluded
    const userFilters = this.resolveUserFilters(persisted, schema);
    api.setFilterModel(Object.keys(userFilters).length ? userFilters : null);

    // 3. Row selection — only when rowIdField is defined on schema
    if (persisted?.selectedRowIds?.length && schema.rowIdField) {
      const savedIds = new Set(persisted.selectedRowIds);
      api.forEachNode(node => {
        if (node.data && savedIds.has(String(node.data[schema.rowIdField!]))) {
          node.setSelected(true);
        }
      });
    }

    // 4. Save merged state immediately so new columns are persisted.
    //    Preserve the existing scrollPosition — do NOT read from DOM here
    //    because the viewport hasn't scrolled yet and would return 0,0.
    const stateToSave = this.snapshot(api, schema);
    stateToSave.scrollPosition = persisted?.scrollPosition ?? null;
    this.save(schema.gridId, stateToSave);
  }

  // ── Restore Scroll ────────────────────────────────────────────────────────
  // Called from (firstDataRendered) — at this point rows are in the DOM
  // so scrollTo actually works. Never call this inside init().

  restoreScroll(schema: GridSchema, hostElement: HTMLElement): void {
    const persisted = this.load(schema.gridId);
    if (!persisted?.scrollPosition) return;

    const { top, left } = persisted.scrollPosition;
    if (top === 0 && left === 0) return;

    // Scope querySelector to this grid's host element —
    // safe when multiple grids exist on the same page
    const viewport = hostElement.querySelector<HTMLElement>('.ag-body-viewport');
    if (!viewport) return;

    viewport.scrollTop  = top;
    viewport.scrollLeft = left;
  }

  // ── Capture Scroll ────────────────────────────────────────────────────────
  // Called from (bodyScroll) event via a debounced stream in the base component.
  // Reads scroll from the DOM and patches ONLY scrollPosition in localStorage.
  // Does not touch columns, filters, or selection.

  captureScroll(schema: GridSchema, hostElement: HTMLElement): void {
    const viewport = hostElement.querySelector<HTMLElement>('.ag-body-viewport');
    if (!viewport) return;

    const current = this.load(schema.gridId);
    if (!current) return;

    this.save(schema.gridId, {
      ...current,
      scrollPosition: {
        top:  viewport.scrollTop,
        left: viewport.scrollLeft,
      },
    });
  }

  // ── Snapshot ──────────────────────────────────────────────────────────────
  // Reads current live grid state — columns, userFilters, selection.
  // Does NOT read scroll from DOM — scroll is managed separately.
  // Reads scrollPosition back from localStorage to preserve the last value.

  snapshot(api: GridApi, schema: GridSchema): GridPersistedState {
    const parentColIds = new Set(schema.parentDrivenFilterColIds ?? []);

    // Strip parent-driven filter colIds — never persist them
    const userFilters = Object.fromEntries(
      Object.entries(api.getFilterModel() ?? {})
        .filter(([colId]) => !parentColIds.has(colId))
    );

    // Strip AG Grid internal auto-group columns
    const columns = (api.getColumnState() as any[])
      .filter(c => !c.colId.startsWith('ag-Grid-AutoColumn'));

    const selectedRowIds: string[] = schema.rowIdField
      ? api.getSelectedRows().map(row => String(row[schema.rowIdField!]))
      : [];

    // Preserve last saved scroll — never derive from DOM in snapshot
    const current = this.load(schema.gridId);

    return {
      schemaVersion: schema.schemaVersion,
      savedAt: new Date().toISOString(),
      columns,
      userFilters,
      scrollPosition: current?.scrollPosition ?? null,
      selectedRowIds,
    };
  }

  // ── Apply Parent Filter ───────────────────────────────────────────────────
  // Merges a parent-driven filter on top of the current filter model.
  // Passing null removes the parent filter while keeping user filters intact.
  // This does NOT go through scheduleStateSave — parent filters are never saved.

  applyParentFilter(
    api: GridApi,
    schema: GridSchema,
    filterColId: string,
    filterValue: any | null
  ): void {
    const currentFilters = api.getFilterModel() ?? {};

    if (filterValue === null || filterValue === undefined) {
      // Remove only the parent-driven colId, keep user filters
      const { [filterColId]: _removed, ...rest } = currentFilters;
      api.setFilterModel(Object.keys(rest).length ? rest : null);
      return;
    }

    api.setFilterModel({
      ...currentFilters,
      [filterColId]: {
        filterType: 'text',
        type: 'equals',
        filter: String(filterValue),
      },
    });
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  save(gridId: string, state: GridPersistedState): void {
    try {
      localStorage.setItem(`${LS_PREFIX}${gridId}`, JSON.stringify(state));
    } catch { /* storage quota exceeded — silent fail */ }
  }

  clear(gridId: string): void {
    localStorage.removeItem(`${LS_PREFIX}${gridId}`);
  }

  load(gridId: string): GridPersistedState | null {
    const raw = localStorage.getItem(`${LS_PREFIX}${gridId}`);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  // Resolves user filters from persisted state.
  // Handles backward compatibility with old format that used `filters` key.
  // Always strips parentDrivenFilterColIds before returning.
  private resolveUserFilters(
    persisted: GridPersistedState | null,
    schema: GridSchema
  ): Record<string, any> {
    if (!persisted) return {};

    // Backward compat: old saves used `filters`, new saves use `userFilters`
    const raw: Record<string, any> =
      persisted.userFilters ?? (persisted as any).filters ?? {};

    const parentColIds = new Set(schema.parentDrivenFilterColIds ?? []);
    return Object.fromEntries(
      Object.entries(raw).filter(([colId]) => !parentColIds.has(colId))
    );
  }
}
