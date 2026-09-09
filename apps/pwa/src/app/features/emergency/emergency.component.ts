import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-emergency',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="emergency">
      <h2>{{ i18n.t('sos.title') }}</h2>
      @if (!confirming()) {
        <button class="sos" type="button" (click)="confirming.set(true)">SOS</button>
        <p class="hint">{{ i18n.t('sos.hint') }}</p>
      } @else {
        <form class="form" (ngSubmit)="trigger()">
          <select [(ngModel)]="type" name="type">
            <option value="EARTHQUAKE">Erdbeben</option>
            <option value="FIRE">Feuer</option>
            <option value="MEDICAL">Medizinisch</option>
            <option value="SECURITY">Sicherheit</option>
            <option value="INTRUDER">Eindringling</option>
            <option value="OTHER">Sonstiges</option>
          </select>
          <input [(ngModel)]="title" name="title" placeholder="Titel" />
          <textarea [(ngModel)]="message" name="message" placeholder="Nachricht"></textarea>
          <input [(ngModel)]="location" name="location" placeholder="Ort (optional)" />
          <button type="submit">Jetzt senden</button>
          <button type="button" class="cancel" (click)="confirming.set(false)">Abbrechen</button>
        </form>
      }

      @for (a of alerts(); track a.id) {
        <article class="alert">
          <h3>{{ a.title }}</h3>
          <p>{{ a.message }}</p>
          <p class="meta">{{ a.type }} · {{ a.severity }} · Acks {{ a.acknowledgedCount }}/{{ a.recipients }}</p>
          <div class="acks">
            <button type="button" (click)="ack(a, 'SAFE')">{{ i18n.t('sos.safe') }}</button>
            <button type="button" class="help" (click)="ack(a, 'NEED_HELP')">
              {{ i18n.t('sos.help') }}
            </button>
          </div>
          @if (a.myAck) {
            <p class="meta">Dein Status: {{ a.myAck.status }}</p>
          }
        </article>
      }
    </div>
  `,
  styles: [
    `
      .emergency {
        text-align: center;
        padding: 12px 0;
      }
      .sos {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: #ff5a3c;
        color: white;
        font-size: 48px;
        font-weight: 800;
        border: none;
        box-shadow: 0 8px 30px rgba(255, 90, 60, 0.4);
        cursor: pointer;
      }
      .hint {
        color: #666;
        margin-top: 20px;
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: left;
        max-width: 400px;
        margin: 0 auto;
      }
      input,
      textarea,
      select {
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
        font: inherit;
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 10px;
        cursor: pointer;
      }
      .cancel {
        background: #999;
      }
      .alert {
        text-align: left;
        border: 1px solid #ffb4a4;
        background: #fff5f2;
        border-radius: 12px;
        padding: 12px;
        margin-top: 16px;
      }
      .acks button {
        margin-right: 8px;
      }
      .help {
        background: #b00020;
      }
      .meta {
        color: var(--color-muted);
        font-size: 13px;
      }
    `,
  ],
})
export class EmergencyComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);
  confirming = signal(false);
  alerts = signal<any[]>([]);
  type = 'OTHER';
  title = 'SOS';
  message = 'Hilfe benötigt';
  location = '';

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<{ alerts: any[] }>('/api/emergency').subscribe({
      next: (res) => this.alerts.set(res.alerts),
    });
  }

  trigger() {
    this.api
      .post('/api/emergency', {
        type: this.type,
        title: this.title,
        message: this.message,
        location: this.location || undefined,
        severity: 'HIGH',
      })
      .subscribe({
        next: async () => {
          if (Capacitor.isNativePlatform()) {
            try {
              await Haptics.notification({ type: NotificationType.Warning });
            } catch {
              /* optional */
            }
          }
          this.confirming.set(false);
          this.load();
        },
      });
  }

  ack(a: any, status: 'SAFE' | 'NEED_HELP') {
    this.api.post(`/api/emergency/${a.id}/ack`, { status }).subscribe({
      next: () => this.load(),
    });
  }
}
