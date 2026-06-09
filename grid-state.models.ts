import { ColDef } from 'ag-grid-community';

export type GridColDef = ColDef & {
  colId: string;
  defaultVisible?: boolean;
  defaultWidth?: number;
};

export interface GridColState {
  colId: string;
  width?: number;
  hide?: boolean;
  pinned?: 'left' | 'right' | null;
  sort?: 'asc' | 'desc' | null;
  sortIndex?: number | null;
  flex?: number | null;
  rowGroup?: boolean;
  rowGroupIndex?: number | null;
}

export interface GridPersistedState {
  schemaVersion: number;
  savedAt: string;
  // Covers: column order, column sizing, column visibility,
  //         column pinning, sort, multi-sort, sort direction,
  //         row group, column group
  columns: GridColState[];
  // User-set column filters only.
  // Parent-driven filter colIds are NEVER stored here.
  userFilters: Record<string, any>;
  // Scroll position — written only on bodyScroll event, never inside init()
  scrollPosition: { top: number; left: number } | null;
  // Row selection — stored as string IDs using schema.rowIdField
  selectedRowIds: string[];
}

export interface GridSchema {
  gridId: string;
  schemaVersion: number;
  columns: GridColDef[];
  // Field name used to identify rows for selection restore (e.g. 'orderId')
  rowIdField?: string;
  // ColIds controlled externally by a parent grid selection.
  // Stripped from userFilters before saving — never persisted.
  parentDrivenFilterColIds?: string[];
}
