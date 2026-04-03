import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { matCancelPresentationOutline, matDeleteOutline, matModeEditOutline, matMoreVertOutline, matReceiptLongOutline, matRemoveRedEyeOutline, matThumbUpOutline } from '@ng-icons/material-icons/outline';
import { NgClass } from '@angular/common';
import { bootstrapBoxSeam, bootstrapCheckCircleFill, bootstrapXCircle } from '@ng-icons/bootstrap-icons';
import { OptionsChatBubble } from '../../../core/interfaces/options-chat-bubble';

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [NgIcon, NgClass],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  viewProviders: [provideIcons({ matMoreVertOutline, matModeEditOutline, matDeleteOutline, matCancelPresentationOutline, bootstrapBoxSeam, matRemoveRedEyeOutline, bootstrapCheckCircleFill, matReceiptLongOutline, bootstrapXCircle, matThumbUpOutline })],
  template: `
    <button (click)="toggleMenu(); $event.stopPropagation()"
      class="relative flex rounded-full bg-transparent text-sm m-auto" type="button">
      <ng-icon class="text-gray-400 dark:text-gray-300 font-bold float-end m-0 p-0" size="30" name="matMoreVertOutline"></ng-icon>
    </button>
    <div class="relative ml-3 z-50 right-28">
      <div [ngClass]="isMenuOpen ? 'pointer-events-auto scale-100 opacity-100 duration-200' : 'pointer-events-none scale-95 opacity-0 duration-100 ease-in'"
        class="absolute w-auto m-auto transform rounded-md bg-white dark:bg-slate-900 py-2 shadow-lg transition focus:outline-none border dark:border-slate-800">
        <ul class="p-0 pl-1 pr-1">
          @for (option of options; track $index) {
            <li (click)="clickAction(option); $event.stopPropagation()"
                class="flex cursor-pointer rounded-md px-3 py-2 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-slate-950"
                [class]="(option.colorIcon && option.colorIcon !== '') ? option.colorIcon : 'text-gray-500 dark:text-gray-300'">
              <p class="ml-1 flex"><ng-icon class="font-bold float-end mr-1" size="20" [name]="option.icon"></ng-icon>{{ option.label }}</p>
            </li>
          }
        </ul>
      </div>
    </div>`,
  host: { '(document:click)': 'closeMenu()' }
})
export class ChatBubbleComponent implements OnInit {
  @Input() id:      number = 0;
  @Input() options: OptionsChatBubble[] = [];
  @Output() selectOption = new EventEmitter<OptionsChatBubble>();
  isMenuOpen = false;
  ngOnInit(): void {}
  toggleMenu(): void { this.isMenuOpen = !this.isMenuOpen; }
  closeMenu():  void { this.isMenuOpen = false; }
  clickAction(option: OptionsChatBubble): void {
    option.id = this.id;
    this.selectOption.emit({ ...option });
    this.isMenuOpen = false;
  }
}
