import { Component, OnInit } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { BaseGridComponent } from './base-grid.component';
import { GridColDef, GridSchema } from './grid-state.models';

/**
 * Example standalone grid — no parent dependency.
 * Copy this pattern for every independent grid screen.
 */

const COLUMNS: GridColDef[] = [
  { colId: 'orderId',    field: 'orderId',    headerName: 'Order ID',    defaultWidth: 100 },
  { colId: 'instrument', field: 'instrument', headerName: 'Instrument',  defaultWidth: 200 },
  { colId: 'status',     field: 'status',     headerName: 'Status',      defaultWidth: 120 },
  { colId: 'quantity',   field: 'quantity',   headerName: 'Qty',         defaultWidth: 90  },
  { colId: 'price',      field: 'price',      headerName: 'Price',       defaultWidth: 90  },
  { colId: 'settleDate', field: 'settleDate', headerName: 'Settlement',
    defaultVisible: false, defaultWidth: 140 },
];

@Component({
  selector: 'app-orders-grid',
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
export class OrdersGridComponent extends BaseGridComponent implements OnInit {

  readonly columns = COLUMNS;

  readonly schema: GridSchema = {
    gridId: 'orders-grid',       // unique per grid — used as localStorage key
    schemaVersion: 1,            // bump to force-reset all users
    columns: COLUMNS,
    rowIdField: 'orderId',       // used to restore row selection
  };

  rows: any[] = [];

  ngOnInit(): void {
    // load row data here
  }
}
