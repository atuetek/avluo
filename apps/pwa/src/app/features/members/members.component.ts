import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <h2>Mitglieder</h2>
      <form (ngSubmit)="search()">
        <input [(ngModel)]="q" name="q" placeholder="Name suchen…" />
        <input [(ngModel)]="blockName" name="blockName" placeholder="Block" />
        <button type="submit">Suchen</button>
      </form>
      <ul>
        @for (m of members(); track m.id) {
          <li>
            <div>
              <strong>{{ m.displayName }}</strong>
              <span class="meta">{{ m.blockName }} {{ m.houseNumber }}</span>
            </div>
            <button type="button" (click)="dm(m)">Nachricht</button>
          </li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      form {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      input {
        padding: 8px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
      }
      ul {
        list-style: none;
      }
      li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid var(--color-border);
      }
      .meta {
        display: block;
        color: var(--color-muted);
        font-size: 13px;
      }
    `,
  ],
})
export class MembersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  members = signal<any[]>([]);
  q = '';
  blockName = '';

  ngOnInit() {
    this.search();
  }

  search() {
    const params: Record<string, string> = { limit: '50' };
    if (this.q) params['q'] = this.q;
    if (this.blockName) params['blockName'] = this.blockName;
    this.api.get<{ members: any[] }>('/api/members', params).subscribe({
      next: (res) => this.members.set(res.members),
    });
  }

  dm(m: any) {
    this.api.post<{ id: string }>('/api/messages/conversations', { memberId: m.id }).subscribe({
      next: (res) => this.router.navigate(['/messages'], { queryParams: { c: res.id } }),
    });
  }
}
