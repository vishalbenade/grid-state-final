import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { BaseGridComponent } from './base-grid.component';
import { GridColDef, GridSchema } from './grid-state.models';

/**
 * Parent grid — emits rowSelected output when a row is clicked.
 * Child grids listen to this and call applyParentFilter().
 */

const COLUMNS: GridColDef[] = [
  { colId: 'accountId',   field: 'accountId',   headerName: 'Account ID', defaultWidth: 120 },
  { colId: 'accountName', field: 'accountName', headerName: 'Name',       defaultWidth: 200 },
  { colId: 'region',      field: 'region',      headerName: 'Region',     defaultWidth: 120 },
];

@Component({
  selector: 'app-parent-grid',
  standalone: true,
  imports: [AgGridModule],
  template: `
    <button (click)="resetLayout()">Reset Layout</button>
    <ag-grid-angular
      class="ag-theme-balham-dark"
      [columnDefs]="columns"
      [rowData]="rows"
      (gridReady)="onGridReady($event)"
      (firstDataRendered)="onFirstDataRendered()"
      (columnMoved)="scheduleStateSave()"
      (columnResized)="scheduleStateSave()"
      (columnVisible)="scheduleStateSave()"
      (columnPinned)="scheduleStateSave()"
      (columnRowGroupChanged)="scheduleStateSave()"
      (sortChanged)="scheduleStateSave()"
      (filterChanged)="scheduleStateSave()"
      (selectionChanged)="onSelectionChanged()"
      (bodyScroll)="scheduleScrollSave()"
    />
  `,
})
export class ParentGridComponent extends BaseGridComponent implements OnInit {

  readonly columns = COLUMNS;

  readonly schema: GridSchema = {
    gridId: 'accounts-grid',
    schemaVersion: 1,
    columns: COLUMNS,
    rowIdField: 'accountId',
  };

  rows: any[] = [];

  // Child grids bind to this output
  @Output() rowSelected = new EventEmitter<any | null>();

  onSelectionChanged(): void {
    const selected = this.gridApi?.getSelectedRows() ?? [];
    this.rowSelected.emit(selected[0] ?? null);
    this.scheduleStateSave();
  }

  ngOnInit(): void {
    // load row data here
  }
}
