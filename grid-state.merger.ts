import { GridColDef, GridColState, GridPersistedState } from './grid-state.models';

const AUTO_GROUP_PREFIX = 'ag-Grid-AutoColumn';

/**
 * Pure function — no Angular, fully unit-testable.
 *
 * Merge rules:
 *  - Column definitions own WHAT exists
 *  - Persisted state owns HOW the user arranged them
 *  - Columns removed from colDefs are silently dropped
 *  - New columns are inserted at their natural position relative to neighbours
 *  - AG Grid auto-group columns are always stripped
 */
export function mergeColumnState(
  colDefs: GridColDef[],
  persisted: GridPersistedState | null
): GridColState[] {

  // No saved state — build defaults from colDefs
  if (!persisted?.columns?.length) {
    return colDefs.map(c => ({
      colId: c.colId,
      hide: c.defaultVisible === false,
      width: c.defaultWidth,
    }));
  }

  const definedIds = new Set(colDefs.map(c => c.colId));

  // Start from user's saved order.
  // Drop columns that no longer exist in colDefs.
  // Drop AG Grid internal auto-group columns.
  const merged: GridColState[] = persisted.columns
    .filter(c => definedIds.has(c.colId))
    .filter(c => !c.colId.startsWith(AUTO_GROUP_PREFIX))
    .map(c => ({ ...c }));

  // Find columns added by developers since the user last saved
  const persistedIds = new Set(persisted.columns.map(c => c.colId));
  const newCols = colDefs.filter(c => !persistedIds.has(c.colId));

  // Insert each new column adjacent to its nearest left neighbour in colDefs
  for (const def of newCols) {
    const defIndex = colDefs.findIndex(d => d.colId === def.colId);

    let insertAfter = -1;
    for (let i = defIndex - 1; i >= 0; i--) {
      const idx = merged.findIndex(c => c.colId === colDefs[i].colId);
      if (idx !== -1) { insertAfter = idx; break; }
    }

    const newState: GridColState = {
      colId: def.colId,
      hide: def.defaultVisible === false,
      width: def.defaultWidth,
    };

    insertAfter === -1
      ? merged.unshift(newState)
      : merged.splice(insertAfter + 1, 0, newState);
  }

  return merged;
}
