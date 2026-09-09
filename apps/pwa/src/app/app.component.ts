import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';
import { ApiService } from './core/api.service';
import { NativeShellService } from './core/native-shell.service';
import { environment } from './core/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="avluo-container">
      <header>
        <div>
          <h1>{{ i18n.t('appName') }}</h1>
          <p class="tagline">{{ i18n.t('tagline') }}</p>
        </div>
        @if (auth.isLoggedIn()) {
          <a routerLink="/notifications" class="bell" [attr.data-count]="unread()">
            🔔
            @if (unread() > 0) {
              <span>{{ unread() }}</span>
            }
          </a>
        }
      </header>

      @if (auth.isLoggedIn()) {
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            {{ i18n.t('nav.home') }}
          </a>
          <a routerLink="/messages" routerLinkActive="active">{{ i18n.t('nav.messages') }}</a>
          <a routerLink="/events" routerLinkActive="active">{{ i18n.t('nav.events') }}</a>
          <a routerLink="/members" routerLinkActive="active">{{ i18n.t('nav.members') }}</a>
          <a routerLink="/emergency" routerLinkActive="active">{{ i18n.t('nav.emergency') }}</a>
          <a routerLink="/profile" routerLinkActive="active">{{ i18n.t('nav.profile') }}</a>
          @if (auth.isAdmin()) {
            <a routerLink="/yonetim" routerLinkActive="active">{{ i18n.t('nav.admin') }}</a>
          }
        </nav>
      }

      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .avluo-container {
        max-width: 640px;
        margin: 0 auto;
        padding: 16px 16px 40px;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      header h1 {
        color: var(--color-primary);
        font-size: 32px;
        font-weight: 700;
        margin: 0;
      }
      .tagline {
        color: #666;
        font-size: 14px;
        margin: 4px 0 16px;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 16px;
      }
      nav a {
        text-decoration: none;
        color: var(--color-fg);
        background: #f3f3f5;
        padding: 8px 10px;
        border-radius: 999px;
        font-size: 13px;
      }
      nav a.active {
        background: var(--color-primary);
        color: #fff;
      }
      .bell {
        position: relative;
        text-decoration: none;
        font-size: 22px;
      }
      .bell span {
        position: absolute;
        top: -6px;
        right: -8px;
        background: var(--color-primary);
        color: #fff;
        font-size: 11px;
        border-radius: 999px;
        padding: 1px 5px;
      }
    `,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);
  private readonly nativeShell = inject(NativeShellService);
  unread = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    void this.nativeShell.init();
    this.pollUnread();
    this.timer = setInterval(
      () => this.pollUnread(),
      environment.polling.notificationsMs,
    );
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private pollUnread() {
    if (!this.auth.isLoggedIn()) {
      this.unread.set(0);
      return;
    }
    this.api.get<{ unread: number }>('/api/notifications').subscribe({
      next: (res) => this.unread.set(res.unread || 0),
      error: () => undefined,
    });
  }
}
