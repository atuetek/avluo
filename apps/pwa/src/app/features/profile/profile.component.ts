import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="profile">
      <h2>Profil</h2>
      @if (member()) {
        <label>Anzeigename<input [(ngModel)]="displayName" name="displayName" /></label>
        <label>Hausnummer<input [(ngModel)]="houseNumber" name="houseNumber" /></label>
        <label>Block<input [(ngModel)]="blockName" name="blockName" /></label>
        <label>
          Sprache
          <select [(ngModel)]="preferredLang" name="preferredLang">
            <option value="tr-TR">Türkçe</option>
            <option value="en-US">English</option>
            <option value="de-DE">Deutsch</option>
          </select>
        </label>
        <label>
          Avatar
          <input type="file" accept="image/*" (change)="onAvatar($event)" />
        </label>
        @if (avatarUrl) {
          <img [src]="avatarUrl" alt="" class="avatar" />
        }
        <button type="button" (click)="save()">Speichern</button>
        <button type="button" class="logout" (click)="logout()">Logout</button>
        @if (msg()) {
          <p>{{ msg() }}</p>
        }
      }
    </section>
  `,
  styles: [
    `
      .profile {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 14px;
      }
      input,
      select {
        padding: 8px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 10px;
      }
      .logout {
        background: #666;
      }
      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  member = signal<any>(null);
  displayName = '';
  houseNumber = '';
  blockName = '';
  preferredLang: 'tr-TR' | 'en-US' | 'de-DE' = 'tr-TR';
  avatarUrl = '';
  msg = signal('');

  ngOnInit() {
    this.api.get<any>('/api/members/me').subscribe({
      next: (m) => {
        this.member.set(m);
        this.displayName = m.displayName;
        this.houseNumber = m.houseNumber || '';
        this.blockName = m.blockName || '';
        this.preferredLang = m.preferredLang || 'tr-TR';
        this.avatarUrl = m.avatarUrl || '';
      },
    });
  }

  onAvatar(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.upload<{ url: string }>('/api/media/upload', file).subscribe({
      next: (m) => (this.avatarUrl = m.url),
    });
  }

  save() {
    this.api
      .patch('/api/members/me', {
        displayName: this.displayName,
        houseNumber: this.houseNumber || undefined,
        blockName: this.blockName || undefined,
        preferredLang: this.preferredLang,
        avatarUrl: this.avatarUrl || undefined,
      })
      .subscribe({
        next: () => {
          this.i18n.setLocale(this.preferredLang);
          this.msg.set('Gespeichert');
        },
      });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
