import { Injectable, signal, computed } from '@angular/core';

export interface AuthUser {
  id: string;
  phone?: string;
  locale?: string;
}

export interface AuthMember {
  id: string;
  tenantId: string;
  role: string;
  displayName?: string;
}

const TOKEN_KEY = 'avluo_token';
const USER_KEY = 'avluo_user';
const MEMBER_KEY = 'avluo_member';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSig = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userSig = signal<AuthUser | null>(this.readJson(USER_KEY));
  private readonly memberSig = signal<AuthMember | null>(this.readJson(MEMBER_KEY));

  readonly token = this.tokenSig.asReadonly();
  readonly user = this.userSig.asReadonly();
  readonly member = this.memberSig.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSig());
  readonly isAdmin = computed(() => {
    const role = this.memberSig()?.role;
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  });

  setSession(token: string, user: AuthUser, member: AuthMember | null) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (member) localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
    else localStorage.removeItem(MEMBER_KEY);
    this.tokenSig.set(token);
    this.userSig.set(user);
    this.memberSig.set(member);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MEMBER_KEY);
    this.tokenSig.set(null);
    this.userSig.set(null);
    this.memberSig.set(null);
  }

  private readJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
}
