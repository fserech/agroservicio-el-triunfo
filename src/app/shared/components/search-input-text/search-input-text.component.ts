// search-input-text.component.ts — igual al modelo de referencia
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component,
         CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
      <div class="relative">
        <input [formControl]="getFormControl()"
          placeholder="{{ placeholder }}"
          minlength="{{ minlength === 0 ? 1 : minlength }}"
          maxlength="{{ maxlength === 0 ? 200 : maxlength }}"
          [required]="getValidatorRequired()"
          class="text-gray-400 bg-gray-100 py-2 px-4 w-full font-bold text-left
                 focus:border-gray-300 focus:outline-none focus:border
                 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-700 dark:text-white
                 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl placeholder-gray-400"/>
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button (click)="cleanFilters()" type="button" class="clean-filters">
            <ng-icon class="text-slate-500 font-bold dark:text-slate-400" size="20" name="bootstrapXCircle"></ng-icon>
          </button>
        </div>
      </div>
    } @else {
      <div class="relative">
        <input class="relative w-full pl-12 pr-3 py-2 rounded-2xl bg-gray-300 dark:bg-gray-700
                      dark:text-white border-none focus:border focus:border-gray-300 animate-pulse" disabled>
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          @if (icon) {
            <ng-icon class="text-slate-500 font-bold dark:text-slate-400 animate-pulse" size="20" [name]="icon"></ng-icon>
          }
        </div>
      </div>
    }
  `
})
export class SearchInputTextComponent implements OnInit, AfterViewInit {
  @Input() icon:          string | undefined;
  @Input() label:         string | undefined;
  @Input() placeholder:   string = 'Buscar...';
  @Input() form!:         FormGroup;
  @Input() name!:         string;
  @Input() load           = false;
  @Input() helpMessage:   string | undefined;
  @Input() minlength      = 0;
  @Input() maxlength      = 0;
  @Input() counter:       boolean | undefined;
  @Input() filtersActive: boolean | undefined;
  @Output() changes      = new EventEmitter<string>();
  @Output() clearFilters = new EventEmitter<boolean>();

  constructor(private cdr: ChangeDetectorRef) {}
  ngAfterViewInit(): void { this.cdr.detectChanges(); }
  ngOnInit(): void {}

  cleanFilters(): void { this.clearFilters.emit(true); }

  getFormControl(): FormControl {
    const ctrl = this.form.get(this.name) as FormControl;
    if (!ctrl) throw new Error(`Control '${this.name}' no encontrado`);
    return ctrl;
  }

  getValidatorRequired(): boolean {
    return this.getFormControl().hasValidator(Validators.required);
  }
}
