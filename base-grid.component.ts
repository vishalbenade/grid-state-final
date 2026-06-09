import { Directive, OnDestroy, inject, ElementRef } from '@angular/core';
import { GridApi, GridReadyEvent } from 'ag-grid-community';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { GridStateService } from './grid-state.service';
import { GridSchema } from './grid-state.models';

/**
 * Abstract base class for all grid components.
 *
 * Every grid component extends this and provides:
 *  - schema: GridSchema  (gridId, schemaVersion, columns, rowIdField, parentDrivenFilterColIds)
 *
 * Wire these events in your template:
 *  (gridReady)              → onGridReady($event)
 *  (firstDataRendered)      → onFirstDataRendered()
 *  (columnMoved)            → scheduleStateSave()
 *  (columnResized)          → scheduleStateSave()
 *  (columnVisible)          → scheduleStateSave()
 *  (columnPinned)           → scheduleStateSave()
 *  (columnRowGroupChanged)  → scheduleStateSave()
 *  (sortChanged)            → scheduleStateSave()
 *  (filterChanged)          → scheduleStateSave()
 *  (selectionChanged)       → scheduleStateSave()
 *  (bodyScroll)             → scheduleScrollSave()
 */
@Directive()
export abstract class BaseGridComponent implements OnDestroy {

  protected abstract readonly schema: GridSchema;

  protected gridApi?: GridApi;

  private readonly stateSvc = inject(GridStateService);
  private readonly elRef    = inject(ElementRef);

  // Stream for column / filter / selection changes — debounced 600ms
  private readonly save$    = new Subject<void>();
  // Separate stream for scroll — debounced 300ms, writes only scrollPosition
  private readonly scroll$  = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  // ── Called from (gridReady) ───────────────────────────────────────────────
  protected onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;

    // Apply columns, filters, row selection
    this.stateSvc.init(this.gridApi, this.schema);

    // Debounced save for column / filter / selection events
    this.save$.pipe(debounceTime(600), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.gridApi) {
          this.stateSvc.save(
            this.schema.gridId,
            this.stateSvc.snapshot(this.gridApi, this.schema)
          );
        }
      });

    // Debounced scroll capture — patches only scrollPosition in localStorage
    this.scroll$.pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.stateSvc.captureScroll(this.schema, this.elRef.nativeElement);
      });
  }

  // ── Called from (firstDataRendered) ──────────────────────────────────────
  // Rows are guaranteed to be in the DOM at this point.
  // This is the only safe place to restore scroll position.
  protected onFirstDataRendered(): void {
    this.stateSvc.restoreScroll(this.schema, this.elRef.nativeElement);
  }

  // ── Call from column / filter / selection events ──────────────────────────
  protected scheduleStateSave(): void { this.save$.next(); }

  // ── Call from (bodyScroll) event only ─────────────────────────────────────
  protected scheduleScrollSave(): void { this.scroll$.next(); }

  // ── Resets grid to colDef defaults ────────────────────────────────────────
  resetLayout(): void {
    if (!this.gridApi) return;
    this.stateSvc.clear(this.schema.gridId);
    this.stateSvc.init(this.gridApi, this.schema);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
