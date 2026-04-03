import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matSearchOutline } from '@ng-icons/material-icons/outline';
import { NgIf } from '@angular/common';
import { bootstrapXCircle } from '@ng-icons/bootstrap-icons';

@Component({
  selector: 'app-search-input-text',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgIf, NgIconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ matSearchOutline, bootstrapXCircle })],
  template: `
    @if (!load) {
      <div class="relative w-full">
        <input [formControl]="getFormControl()"
          placeholder="{{ placeholder }}" maxlength="{{ maxlength === 0 ? 200 : maxlength }}"
          class="text-gray-400 dark:text-gray-300 bg-gray-100 dark:bg-slate-950 py-2 px-4 w-full font-bold text-left
                 focus:border-gray-300 dark:focus:border-slate-600 focus:outline-none focus:border
                 border dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl placeholder-gray-400"/>
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button (click)="cleanFilters()" type="button" class="clean-filters">
            <ng-icon class="text-slate-500 font-bold dark:text-slate-400" size="20" name="bootstrapXCircle"></ng-icon>
          </button>
        </div>
      </div>
    } @else {
      <div class="relative w-full">
        <input class="relative w-full pl-12 pr-3 py-2 rounded-2xl bg-gray-300 dark:bg-gray-700 dark:text-white border-none focus:border animate-pulse" disabled>
      </div>
    }`
})
export class SearchInputTextComponent implements OnInit, AfterViewInit {
  @Input() icon: string; @Input() label: string; @Input() placeholder = 'Buscar...';
  @Input() form!: FormGroup; @Input() name!: string; @Input() load = false;
  @Input() minlength = 0; @Input() maxlength = 0; @Input() counter: boolean;
  @Output() changes = new EventEmitter<string>(); @Output() clearFilters = new EventEmitter<boolean>();
  constructor(private cdr: ChangeDetectorRef) {}
  ngAfterViewInit(): void { this.cdr.detectChanges(); }
  ngOnInit(): void {}
  cleanFilters(): void { this.clearFilters.emit(true); }
  getFormControl(): FormControl {
    const ctrl = this.form.get(this.name) as FormControl;
    if (!ctrl) throw new Error(`Control '${this.name}' no encontrado`);
    return ctrl;
  }
  getValidatorRequired(): boolean { return this.getFormControl().hasValidator(Validators.required); }
}
