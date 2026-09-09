import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { BiometricService } from '../../core/biometric.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="login">
      <h2>{{ i18n.t('login.title') }}</h2>
      <label>
        Telefon (E.164)
        <input [(ngModel)]="phone" name="phone" placeholder="+905551234567" />
      </label>
      @if (!otpSent()) {
        <button type="button" (click)="sendOtp()" [disabled]="busy()">
          {{ i18n.t('login.sendOtp') }}
        </button>
      } @else {
        <label>
          OTP
          <input [(ngModel)]="code" name="code" placeholder="123456" />
        </label>
        <button type="button" (click)="verifyOtp()" [disabled]="busy()">
          {{ i18n.t('login.verify') }}
        </button>
      }
      @if (auth.user()?.id) {
        <hr />
        <button type="button" (click)="loginWithPasskey()" [disabled]="busy()">
          Mit Passkey / Biometrie
        </button>
      } @else if (savedUserId) {
        <hr />
        <button type="button" (click)="loginWithPasskey()" [disabled]="busy()">
          Mit Passkey / Biometrie
        </button>
      }
      @if (debugOtp()) {
        <p class="hint">Dev OTP: {{ debugOtp() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .login {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 360px;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 14px;
      }
      input {
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
        padding: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .hint {
        color: var(--color-muted);
        font-size: 13px;
      }
      .error {
        color: #c00;
      }
    `,
  ],
})
export class LoginComponent {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly biometric = inject(BiometricService);

  phone = '+905551234567';
  code = '';
  otpSent = signal(false);
  debugOtp = signal('');
  busy = signal(false);
  error = signal('');
  savedUserId = localStorage.getItem('avluo_user_id') || '';

  sendOtp() {
    this.busy.set(true);
    this.error.set('');
    this.api
      .post<{ sent: boolean; debugOtp?: string }>('/api/auth/send-otp', {
        phone: this.phone,
      })
      .subscribe({
        next: (res) => {
          this.otpSent.set(true);
          this.debugOtp.set(res.debugOtp || '');
          this.busy.set(false);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'OTP fehlgeschlagen');
        },
      });
  }

  verifyOtp() {
    this.busy.set(true);
    this.api
      .post<any>('/api/auth/verify-otp', { phone: this.phone, code: this.code })
      .subscribe({
        next: async (res) => {
          this.auth.setSession(res.token, res.user, res.member);
          localStorage.setItem('avluo_user_id', res.user.id);
          this.savedUserId = res.user.id;
          this.busy.set(false);
          try {
            await this.enrollPasskey();
          } catch {
            /* optional */
          }
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'Verify fehlgeschlagen');
        },
      });
  }

  async enrollPasskey() {
    const options = await firstValueFrom(
      this.api.post<any>('/api/auth/passkey/register/options'),
    );
    if (!options) return;
    const attestation = await startRegistration({ optionsJSON: options });
    await firstValueFrom(
      this.api.post('/api/auth/passkey/register/verify', {
        response: attestation,
        deviceName: this.biometric.isNative() ? 'Native Device' : 'Browser',
      }),
    );
  }

  async loginWithPasskey() {
    const userId = this.auth.user()?.id || this.savedUserId;
    if (!userId) {
      this.error.set('Bitte zuerst einmal per OTP anmelden');
      return;
    }
    const ok = await this.biometric.confirmUnlock();
    if (!ok) return;
    this.busy.set(true);
    try {
      const options = await firstValueFrom(
        this.api.post<any>('/api/auth/passkey/authenticate/options', { userId }),
      );
      const assertion = await startAuthentication({ optionsJSON: options });
      const res = await firstValueFrom(
        this.api.post<any>('/api/auth/passkey/authenticate/verify', {
          userId,
          response: assertion,
        }),
      );
      this.auth.setSession(res.token, res.user, res.member);
      this.router.navigateByUrl('/');
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Passkey fehlgeschlagen');
    } finally {
      this.busy.set(false);
    }
  }
}
