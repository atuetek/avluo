import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { resolveApiUrl, resolveTenantSlug } from './environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  get baseUrl(): string {
    return resolveApiUrl();
  }

  private headers(extra?: Record<string, string>): HttpHeaders {
    let h = new HttpHeaders({
      'x-dev-tenant': resolveTenantSlug(),
      ...(extra || {}),
    });
    const token = this.auth.token();
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      params,
    });
  }

  post<T>(path: string, body?: unknown) {
    return this.http.post<T>(`${this.baseUrl}${path}`, body ?? {}, {
      headers: this.headers(),
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body ?? {}, {
      headers: this.headers(),
    });
  }

  delete<T>(path: string) {
    return this.http.delete<T>(`${this.baseUrl}${path}`, {
      headers: this.headers(),
    });
  }

  upload<T>(path: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<T>(`${this.baseUrl}${path}`, form, {
      headers: this.headers(),
    });
  }
}
