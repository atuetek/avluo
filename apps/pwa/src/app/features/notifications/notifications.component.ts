import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { environment } from '../../core/environment';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <header class="head">
        <h2>Benachrichtigungen</h2>
        <button type="button" (click)="markAll()">Alle gelesen</button>
      </header>
      @for (n of items(); track n.id) {
        <article [class.unread]="!n.readAt">
          <strong>{{ n.title }}</strong>
          <p>{{ n.body }}</p>
          <span class="meta">{{ n.createdAt | date: 'short' }}</span>
          @if (!n.readAt) {
            <button type="button" (click)="markOne(n)">Gelesen</button>
          }
        </article>
      } @empty {
        <p class="empty">Keine Benachrichtigungen.</p>
      }
    </section>
  `,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      article {
        border-bottom: 1px solid var(--color-border);
        padding: 10px 0;
      }
      .unread {
        background: #fff8f6;
        padding: 10px;
        border-radius: 8px;
      }
      .meta {
        color: var(--color-muted);
        font-size: 12px;
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 6px 10px;
      }
      .empty {
        color: var(--color-muted);
      }
    `,
  ],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  items = signal<any[]>([]);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), environment.polling.notificationsMs);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  load() {
    this.api.get<{ notifications: any[] }>('/api/notifications').subscribe({
      next: (res) => this.items.set(res.notifications),
    });
  }

  markAll() {
    this.api.patch('/api/notifications/read-all').subscribe({ next: () => this.load() });
  }

  markOne(n: any) {
    this.api.patch(`/api/notifications/${n.id}/read`).subscribe({ next: () => this.load() });
  }
}
