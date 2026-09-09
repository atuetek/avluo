import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <h2>Veranstaltungen</h2>
      <form class="create" (ngSubmit)="create()">
        <input [(ngModel)]="title" name="title" placeholder="Titel" />
        <textarea [(ngModel)]="description" name="description" placeholder="Beschreibung"></textarea>
        <input [(ngModel)]="location" name="location" placeholder="Ort" />
        <input type="datetime-local" [(ngModel)]="startsAt" name="startsAt" />
        <button type="submit">Anlegen</button>
      </form>
      @for (e of events(); track e.id) {
        <article class="card" [class.cancelled]="e.isCancelled">
          <h3>{{ e.title }}</h3>
          <p>{{ e.description }}</p>
          <p class="meta">
            {{ e.startsAt | date: 'short' }}
            @if (e.location) {
              · {{ e.location }}
            }
            · RSVP {{ e.rsvpCount }}
          </p>
          <div class="rsvp">
            <button type="button" [class.active]="e.myRsvp === 'GOING'" (click)="rsvp(e, 'GOING')">
              Komme
            </button>
            <button type="button" [class.active]="e.myRsvp === 'MAYBE'" (click)="rsvp(e, 'MAYBE')">
              Vielleicht
            </button>
            <button
              type="button"
              [class.active]="e.myRsvp === 'NOT_GOING'"
              (click)="rsvp(e, 'NOT_GOING')"
            >
              Nein
            </button>
          </div>
        </article>
      }
    </section>
  `,
  styles: [
    `
      .create,
      .card {
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        padding: 12px;
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      input,
      textarea {
        padding: 8px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
        font: inherit;
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
      }
      .rsvp button {
        background: #eee;
        color: #111;
        margin-right: 6px;
      }
      .rsvp button.active {
        background: var(--color-primary);
        color: #fff;
      }
      .meta {
        color: var(--color-muted);
        font-size: 13px;
      }
      .cancelled {
        opacity: 0.5;
      }
    `,
  ],
})
export class EventsComponent implements OnInit {
  private readonly api = inject(ApiService);
  events = signal<any[]>([]);
  title = '';
  description = '';
  location = '';
  startsAt = '';

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<{ events: any[] }>('/api/events').subscribe({
      next: (res) => this.events.set(res.events),
    });
  }

  create() {
    if (!this.title || !this.description || !this.startsAt) return;
    this.api
      .post('/api/events', {
        title: this.title,
        description: this.description,
        location: this.location || undefined,
        startsAt: new Date(this.startsAt).toISOString(),
      })
      .subscribe({
        next: () => {
          this.title = '';
          this.description = '';
          this.location = '';
          this.startsAt = '';
          this.load();
        },
      });
  }

  rsvp(e: any, status: string) {
    this.api.post(`/api/events/${e.id}/rsvp`, { status }).subscribe({
      next: () => {
        e.myRsvp = status;
        this.events.update((list) => [...list]);
      },
    });
  }
}
