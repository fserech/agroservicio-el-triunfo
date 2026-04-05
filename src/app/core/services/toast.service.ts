import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new BehaviorSubject<{msg:string;type:string;id:number}[]>([]);
  toasts$ = this._toasts$.asObservable();
  private id = 0;

  show(msg: string, type: 'success'|'error'|'info'|'warning' = 'info', duration = 3500) {
    const toast = { msg, type, id: ++this.id };
    this._toasts$.next([...this._toasts$.value, toast]);
    setTimeout(() => this._toasts$.next(this._toasts$.value.filter(t => t.id !== toast.id)), duration);
  }
  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string)   { this.show(msg, 'error'); }
  info(msg: string)    { this.show(msg, 'info'); }
  warning(msg: string) { this.show(msg, 'warning'); }
}
