import { Capacitor } from '@capacitor/core';

export const environment = {
  production: true,
  apiUrl: 'https://api.avluo.app',
  productionApiUrl: 'https://api.avluo.app',
  tenantSlug: 'yesiltepe',
  polling: {
    timelineMs: 10000,
    messagesMs: 5000,
    notificationsMs: 15000,
  },
};

let runtimeApiUrl: string | null = null;
let runtimeTenant: string | null = null;

/** Called once at bootstrap from /assets/config.json (Helm ConfigMap). */
export function applyRuntimeConfig(cfg: { apiUrl?: string; tenantSlug?: string }) {
  if (cfg.apiUrl?.trim()) runtimeApiUrl = cfg.apiUrl.trim().replace(/\/$/, '');
  if (cfg.tenantSlug?.trim()) runtimeTenant = cfg.tenantSlug.trim();
}

export function resolveApiUrl(): string {
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem('avluo_api_url');
    if (override?.trim()) return override.trim().replace(/\/$/, '');
  }
  if (runtimeApiUrl) return runtimeApiUrl;
  if (Capacitor.isNativePlatform()) return environment.productionApiUrl;
  return environment.apiUrl;
}

export function resolveTenantSlug(): string {
  return runtimeTenant || environment.tenantSlug;
}
