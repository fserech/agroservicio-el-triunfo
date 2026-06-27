import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class PaginationComponent implements OnChanges {
  @Input() total = 0;
  @Input() page  = 1;
  @Input() limit = 15;
  @Output() pageChange = new EventEmitter<number>();

  totalPages = 1;
  pages: number[] = [];
  start = 0;
  end = 0;

  ngOnChanges() {
    this.totalPages = Math.max(1, Math.ceil(this.total / this.limit));
    this.start = this.total === 0 ? 0 : (this.page - 1) * this.limit + 1;
    this.end   = Math.min(this.page * this.limit, this.total);
    this.buildPages();
  }

  buildPages() {
    const p = this.page, t = this.totalPages;
    if (t <= 7) { this.pages = Array.from({ length: t }, (_, i) => i + 1); return; }
    const arr: number[] = [1];
    if (p > 3) arr.push(-1);
    for (let i = Math.max(2, p - 1); i <= Math.min(t - 1, p + 1); i++) arr.push(i);
    if (p < t - 2) arr.push(-1);
    arr.push(t);
    this.pages = arr;
  }

  go(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.pageChange.emit(p);
  }
}
