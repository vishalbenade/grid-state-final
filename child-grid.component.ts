import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { inject } from '@angular/core';
import { BaseGridComponent } from './base-grid.component';
import { GridColDef, GridSchema } from './grid-state.models';
import { GridStateService } from './grid-state.service';

/**
 * Child grid — filtered by parent grid row selection.
 *
 * Key points:
 *  - parentDrivenFilterColIds lists the colIds driven by parent selection.
 *    These are NEVER saved to localStorage.
 *  - User's own filters on other columns ARE saved and restored.
 *  - When selectedAccount changes, applyParentFilter() merges the parent
 *    filter on top of the user's existing filters — it does not replace them.
 *  - Deselecting the parent (null) removes only the parent filter.
 */

const COLUMNS: GridColDef[] = [
  { colId: 'orderId',    field: 'orderId',    headerName: 'Order ID',   defaultWidth: 100 },
  { colId: 'accountId',  field: 'accountId',  headerName: 'Account',    defaultWidth: 120 },
  { colId: 'instrument', field: 'instrument', headerName: 'Instrument', defaultWidth: 200 },
  { colId: 'status',     field: 'status',     headerName: 'Status',     defaultWidth: 120 },
  { colId: 'quantity',   field: 'quantity',   headerName: 'Qty',        defaultWidth: 90  },
];

@Component({
  selector: 'app-child-grid',
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
      (selectionChanged)="scheduleStateSave()"
      (bodyScroll)="scheduleScrollSave()"
    />
  `,
})
export class ChildGridComponent extends BaseGridComponent implements OnInit, OnChanges {

  readonly columns = COLUMNS;

  readonly schema: GridSchema = {
    gridId: 'child-orders-grid',
    schemaVersion: 1,
    columns: COLUMNS,
    rowIdField: 'orderId',
    // accountId is driven by parent selection — never saved to localStorage
    parentDrivenFilterColIds: ['accountId'],
  };

  rows: any[] = [];

  // Set by parent component via @Input
  @Input() selectedAccount: any | null = null;

  private readonly stateSvc = inject(GridStateService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedAccount'] && this.gridApi) {
      // Merge parent filter on top of user filters — does not trigger save
      this.stateSvc.applyParentFilter(
        this.gridApi,
        this.schema,
        'accountId',
        this.selectedAccount?.accountId ?? null
      );
    }
  }

  ngOnInit(): void {
    // load row data here
  }
}
