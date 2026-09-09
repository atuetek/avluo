import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { environment } from '../../core/environment';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="messages">
      @if (!activeId()) {
        <h2>Nachrichten</h2>
        <ul>
          @for (c of conversations(); track c.id) {
            <li>
              <a [routerLink]="[]" [queryParams]="{ c: c.id }" (click)="open(c.id)">
                <strong>{{ c.otherMember?.displayName || 'Chat' }}</strong>
                @if (c.unread) {
                  <span class="badge">neu</span>
                }
                <div class="preview">{{ c.lastMessage?.content }}</div>
              </a>
            </li>
          } @empty {
            <li class="empty">Noch keine Unterhaltungen.</li>
          }
        </ul>
      } @else {
        <button type="button" class="back" (click)="close()">← Zurück</button>
        <div class="thread">
          @for (m of messages(); track m.id) {
            <div class="bubble" [class.mine]="m.senderId === myId">
              <div class="who">{{ m.sender?.displayName }}</div>
              {{ m.content }}
            </div>
          }
        </div>
        <form (ngSubmit)="send()">
          <input [(ngModel)]="draft" name="draft" placeholder="Nachricht…" />
          <button type="submit">Senden</button>
        </form>
      }
    </div>
  `,
  styles: [
    `
      ul {
        list-style: none;
      }
      li a {
        display: block;
        padding: 12px;
        border-bottom: 1px solid var(--color-border);
        color: inherit;
        text-decoration: none;
      }
      .badge {
        background: var(--color-primary);
        color: #fff;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 999px;
        margin-left: 6px;
      }
      .preview {
        color: var(--color-muted);
        font-size: 13px;
      }
      .thread {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 40vh;
        margin-bottom: 12px;
      }
      .bubble {
        max-width: 80%;
        padding: 8px 12px;
        border-radius: 12px;
        background: #f3f3f5;
      }
      .bubble.mine {
        align-self: flex-end;
        background: #ffe5df;
      }
      .who {
        font-size: 11px;
        color: var(--color-muted);
      }
      form {
        display: flex;
        gap: 8px;
      }
      input {
        flex: 1;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 10px 14px;
      }
      .back {
        background: transparent;
        color: var(--color-fg);
        margin-bottom: 8px;
      }
    `,
  ],
})
export class MessagesComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  conversations = signal<any[]>([]);
  messages = signal<any[]>([]);
  activeId = signal<string | null>(null);
  draft = '';
  myId = '';
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.api.get<any>('/api/members/me').subscribe({
      next: (m) => (this.myId = m.id),
    });
    this.loadConversations();
    this.route.queryParamMap.subscribe((q) => {
      const c = q.get('c');
      if (c) this.open(c);
    });
    this.timer = setInterval(() => {
      if (this.activeId()) this.loadMessages(this.activeId()!);
      else this.loadConversations();
    }, environment.polling.messagesMs);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  loadConversations() {
    this.api.get<{ conversations: any[] }>('/api/messages/conversations').subscribe({
      next: (res) => this.conversations.set(res.conversations),
    });
  }

  open(id: string) {
    this.activeId.set(id);
    this.loadMessages(id);
    this.api.patch(`/api/messages/conversations/${id}/read`).subscribe();
  }

  close() {
    this.activeId.set(null);
    this.loadConversations();
  }

  loadMessages(id: string) {
    this.api
      .get<{ messages: any[] }>(`/api/messages/conversations/${id}`)
      .subscribe({ next: (res) => this.messages.set(res.messages) });
  }

  send() {
    const id = this.activeId();
    if (!id || !this.draft.trim()) return;
    this.api
      .post(`/api/messages/conversations/${id}`, { content: this.draft.trim() })
      .subscribe({
        next: () => {
          this.draft = '';
          this.loadMessages(id);
        },
      });
  }
}
