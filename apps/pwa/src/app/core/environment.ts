import { Capacitor } from '@capacitor/core';

/**
 * Dev defaults:
 * - Browser: localhost:3000
 * - iOS Simulator: 127.0.0.1:3000
 * - Android Emulator: 10.0.2.2:3000
 * - Physical device: localStorage `avluo_api_url`
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
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
  if (environment.production) return environment.productionApiUrl;
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') return 'http://10.0.2.2:3000';
    if (platform === 'ios') return 'http://127.0.0.1:3000';
  }
  return environment.apiUrl;
}

export function resolveTenantSlug(): string {
  return runtimeTenant || environment.tenantSlug;
}
