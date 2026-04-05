import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardKpis } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  kpis(): Observable<DashboardKpis> { return this.http.get<DashboardKpis>(\/dashboard/kpis); }
  chart(): Observable<any[]>        { return this.http.get<any[]>(\/dashboard/ventas-chart); }
  topProductos(): Observable<any[]> { return this.http.get<any[]>(\/dashboard/top-productos); }
  actividad(): Observable<any[]>    { return this.http.get<any[]>(\/dashboard/actividad); }
}
