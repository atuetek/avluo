import { Injectable, signal } from '@angular/core';
import messages from '../../locales/messages.json';

type Locale = 'tr-TR' | 'en-US' | 'de-DE';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly localeSig = signal<Locale>(
    (localStorage.getItem('avluo_locale') as Locale) || 'tr-TR',
  );

  readonly locale = this.localeSig.asReadonly();

  setLocale(locale: Locale) {
    localStorage.setItem('avluo_locale', locale);
    this.localeSig.set(locale);
  }

  t(key: string): string {
    const bag = (messages as Record<string, Record<string, string>>)[this.localeSig()];
    return bag?.[key] || key;
  }
}
