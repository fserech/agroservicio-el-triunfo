import { Injectable } from '@angular/core';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = '/api';

  constructor(public auth: AuthService) {}

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const opts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.auth.token()
      }
    };
    if (body) opts.body = JSON.stringify(body);

    const r = await fetch(this.BASE + path, opts);

    // Si recibimos 401, limpiar sesión local para forzar re-login
    if (r.status === 401) {
      this.auth.clearLocal();
      window.location.href = '/#/login';
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    let data: any;
    try { data = await r.json(); } catch { data = {}; }

    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data as T;
  }

  get<T>(path: string)              { return this.request<T>('GET', path); }
  post<T>(path: string, body: any)  { return this.request<T>('POST', path, body); }
  put<T>(path: string, body: any)   { return this.request<T>('PUT', path, body); }
  patch<T>(path: string, body: any) { return this.request<T>('PATCH', path, body); }
  delete<T>(path: string)           { return this.request<T>('DELETE', path); }

  /** Upload file via multipart/form-data */
  async uploadFile<T>(path: string, file: File, extraFields?: Record<string, string>): Promise<T> {
    const form = new FormData();
    form.append('file', file);
    if (extraFields) Object.entries(extraFields).forEach(([k, v]) => form.append(k, v));

    const r = await fetch(this.BASE + path, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + this.auth.token() },
      body: form
    });

    if (r.status === 401) {
      this.auth.clearLocal();
      window.location.href = '/#/login';
      throw new Error('Sesión expirada.');
    }

    let data: any;
    try { data = await r.json(); } catch { data = {}; }
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data as T;
  }

  /** Preview Excel file client-side (no server needed) */
  async uploadPreview(file: File): Promise<{ headers: string[]; rows: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm' as any);
          const wb   = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const headers = json.length ? Object.keys(json[0] as any) : [];
          resolve({ headers, rows: json as any[] });
        } catch(err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}
