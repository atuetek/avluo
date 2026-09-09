import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin">
      <h2>Yönetim</h2>
      <nav class="tabs">
        <button type="button" [class.active]="tab() === 'members'" (click)="tab.set('members')">
          Members
        </button>
        <button type="button" [class.active]="tab() === 'invites'" (click)="loadInvites(); tab.set('invites')">
          Invites
        </button>
        <button type="button" [class.active]="tab() === 'audit'" (click)="loadAudit(); tab.set('audit')">
          Audit
        </button>
        <button type="button" [class.active]="tab() === 'sos'" (click)="loadSos(); tab.set('sos')">
          SOS
        </button>
      </nav>

      @if (tab() === 'members') {
        <ul>
          @for (m of members(); track m.id) {
            <li>
              <div>
                <strong>{{ m.displayName }}</strong>
                <span class="meta">{{ m.role }} · {{ m.isActive ? 'aktiv' : 'inaktiv' }}</span>
              </div>
              <div class="actions">
                <select [(ngModel)]="m.role" [name]="'role' + m.id" (change)="setRole(m)">
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
                <button type="button" (click)="toggleActive(m)">
                  {{ m.isActive ? 'Deaktivieren' : 'Aktivieren' }}
                </button>
              </div>
            </li>
          }
        </ul>
      }

      @if (tab() === 'invites') {
        <form (ngSubmit)="createInvite()">
          <input [(ngModel)]="inviteHouse" name="inviteHouse" placeholder="Hausnummer" />
          <button type="submit">Invite anlegen</button>
        </form>
        <ul>
          @for (i of invites(); track i.id) {
            <li><code>{{ i.code }}</code> · {{ i.houseNumber }} · bis {{ i.expiresAt | date }}</li>
          }
        </ul>
      }

      @if (tab() === 'audit') {
        <ul>
          @for (l of logs(); track l.id) {
            <li>
              <strong>{{ l.action }}</strong>
              <span class="meta">{{ l.resource }} · {{ l.createdAt | date: 'short' }}</span>
            </li>
          }
        </ul>
      }

      @if (tab() === 'sos') {
        @for (a of alerts(); track a.id) {
          <article class="sos-card">
            <h3>{{ a.title }}</h3>
            <p>{{ a.message }}</p>
            <button type="button" (click)="loadAcks(a.id)">Acks laden</button>
            @if (acks()[a.id]) {
              <ul>
                @for (ack of acks()[a.id]; track ack.id) {
                  <li>
                    {{ ack.member?.displayName }} — {{ ack.status }}
                    ({{ ack.member?.blockName }} {{ ack.member?.houseNumber }})
                  </li>
                }
              </ul>
            }
          </article>
        }
      }
    </section>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .tabs button {
        background: #eee;
        color: #111;
        border: none;
        border-radius: 8px;
        padding: 8px 10px;
      }
      .tabs button.active {
        background: var(--color-primary);
        color: #fff;
      }
      ul {
        list-style: none;
      }
      li {
        padding: 10px 0;
        border-bottom: 1px solid var(--color-border);
      }
      .meta {
        display: block;
        color: var(--color-muted);
        font-size: 12px;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 6px;
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 8px 10px;
      }
      input,
      select {
        padding: 8px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }
      .sos-card {
        border: 1px solid #ffb4a4;
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 10px;
      }
    `,
  ],
})
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  tab = signal<'members' | 'invites' | 'audit' | 'sos'>('members');
  members = signal<any[]>([]);
  invites = signal<any[]>([]);
  logs = signal<any[]>([]);
  alerts = signal<any[]>([]);
  acks = signal<Record<string, any[]>>({});
  inviteHouse = '';

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.api.get<{ members: any[] }>('/api/admin/members').subscribe({
      next: (res) => this.members.set(res.members),
    });
  }

  setRole(m: any) {
    this.api.patch(`/api/admin/members/${m.id}`, { role: m.role }).subscribe();
  }

  toggleActive(m: any) {
    this.api
      .patch(`/api/admin/members/${m.id}`, { isActive: !m.isActive })
      .subscribe({ next: () => this.loadMembers() });
  }

  loadInvites() {
    this.api.get<{ invites: any[] }>('/api/admin/invites').subscribe({
      next: (res) => this.invites.set(res.invites),
    });
  }

  createInvite() {
    this.api
      .post('/api/admin/invites', { houseNumber: this.inviteHouse || undefined })
      .subscribe({
        next: () => {
          this.inviteHouse = '';
          this.loadInvites();
        },
      });
  }

  loadAudit() {
    this.api.get<{ logs: any[] }>('/api/admin/audit').subscribe({
      next: (res) => this.logs.set(res.logs),
    });
  }

  loadSos() {
    this.api.get<{ alerts: any[] }>('/api/emergency').subscribe({
      next: (res) => this.alerts.set(res.alerts),
    });
  }

  loadAcks(id: string) {
    this.api.get<any>(`/api/admin/emergency/${id}/acks`).subscribe({
      next: (alert) =>
        this.acks.update((m) => ({ ...m, [id]: alert.acks || [] })),
    });
  }
}
