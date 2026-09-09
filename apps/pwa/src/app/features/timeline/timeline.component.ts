import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { environment } from '../../core/environment';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="timeline">
      @if (auth.isLoggedIn()) {
        <form class="composer" (ngSubmit)="createPost()">
          <textarea
            [(ngModel)]="draft"
            name="draft"
            rows="3"
            [placeholder]="i18n.t('timeline.compose')"
          ></textarea>
          <div class="composer-actions">
            <input type="file" accept="image/*" (change)="onFile($event)" />
            <button type="submit" [disabled]="!draft.trim() || posting()">
              {{ i18n.t('timeline.post') }}
            </button>
          </div>
          @if (previewUrl()) {
            <img class="preview" [src]="previewUrl()" alt="" />
          }
        </form>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @for (post of posts(); track post.id) {
        <article class="post" [class.pinned]="post.isPinned">
          <header>
            <strong>{{ post.author?.displayName }}</strong>
            <span class="meta">
              {{ post.author?.blockName }} {{ post.author?.houseNumber }}
              · {{ post.createdAt | date: 'short' }}
            </span>
          </header>
          <p>{{ post.content }}</p>
          @if (post.media?.[0]?.url) {
            <img [src]="post.media[0].url" alt="" class="post-img" />
          }
          <footer>
            <button type="button" (click)="toggleLike(post)">
              {{ post.likedByMe ? '♥' : '♡' }} {{ post.likeCount }}
            </button>
            <button type="button" (click)="toggleComments(post)">
              💬 {{ post.commentCount }}
            </button>
            @if (canDelete(post)) {
              <button type="button" class="danger" (click)="remove(post)">
                ✕
              </button>
            }
          </footer>
          @if (openComments() === post.id) {
            <div class="comments">
              @for (c of comments()[post.id] || []; track c.id) {
                <div class="comment">
                  <strong>{{ c.author?.displayName }}</strong>
                  {{ c.content }}
                </div>
              }
              <form (ngSubmit)="addComment(post)">
                <input
                  [(ngModel)]="commentDrafts[post.id]"
                  [name]="'c' + post.id"
                  placeholder="Kommentar…"
                />
                <button type="submit">OK</button>
              </form>
            </div>
          }
        </article>
      } @empty {
        <p class="empty">{{ i18n.t('timeline.empty') }}</p>
      }
    </div>
  `,
  styles: [
    `
      .composer,
      .post {
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        padding: 12px;
        margin-bottom: 12px;
        background: #fff;
      }
      .composer textarea {
        width: 100%;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 8px;
        font: inherit;
        resize: vertical;
      }
      .composer-actions {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-top: 8px;
      }
      button {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
      }
      footer button {
        background: transparent;
        color: var(--color-fg);
        margin-right: 8px;
      }
      .danger {
        color: #c00 !important;
      }
      .meta {
        color: var(--color-muted);
        font-size: 12px;
        margin-left: 8px;
      }
      .post-img,
      .preview {
        max-width: 100%;
        border-radius: 8px;
        margin-top: 8px;
      }
      .pinned {
        border-color: var(--color-primary);
      }
      .empty,
      .error {
        color: var(--color-muted);
        font-style: italic;
      }
      .error {
        color: #c00;
        font-style: normal;
      }
      .comments {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--color-border);
      }
      .comment {
        font-size: 14px;
        margin-bottom: 6px;
      }
      .comments form {
        display: flex;
        gap: 6px;
      }
      .comments input {
        flex: 1;
        padding: 6px;
        border-radius: 6px;
        border: 1px solid var(--color-border);
      }
    `,
  ],
})
export class TimelineComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);

  posts = signal<any[]>([]);
  comments = signal<Record<string, any[]>>({});
  openComments = signal<string | null>(null);
  posting = signal(false);
  error = signal('');
  previewUrl = signal<string | null>(null);
  draft = '';
  commentDrafts: Record<string, string> = {};
  private mediaId: string | null = null;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.load();
    this.timer = setInterval(
      () => this.load(),
      environment.polling.timelineMs,
    );
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  load() {
    if (!this.auth.isLoggedIn()) return;
    this.api.get<{ posts: any[] }>('/api/posts').subscribe({
      next: (res) => this.posts.set(res.posts),
      error: (err) =>
        this.error.set(err?.error?.message || 'Timeline konnte nicht geladen werden'),
    });
  }

  async onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.previewUrl.set(URL.createObjectURL(file));
    this.api.upload<{ id: string }>('/api/media/upload', file).subscribe({
      next: (m) => (this.mediaId = m.id),
      error: () => this.error.set('Upload fehlgeschlagen'),
    });
  }

  createPost() {
    if (!this.draft.trim()) return;
    this.posting.set(true);
    this.api
      .post('/api/posts', {
        content: this.draft.trim(),
        mediaId: this.mediaId || undefined,
      })
      .subscribe({
        next: () => {
          this.draft = '';
          this.mediaId = null;
          this.previewUrl.set(null);
          this.posting.set(false);
          this.load();
        },
        error: (err) => {
          this.posting.set(false);
          this.error.set(err?.error?.message || 'Post fehlgeschlagen');
        },
      });
  }

  toggleLike(post: any) {
    this.api.post<{ liked: boolean }>(`/api/posts/${post.id}/like`).subscribe({
      next: (res) => {
        post.likedByMe = res.liked;
        post.likeCount += res.liked ? 1 : -1;
        this.posts.update((list) => [...list]);
      },
    });
  }

  toggleComments(post: any) {
    if (this.openComments() === post.id) {
      this.openComments.set(null);
      return;
    }
    this.openComments.set(post.id);
    this.api
      .get<{ comments: any[] }>(`/api/posts/${post.id}/comments`)
      .subscribe({
        next: (res) =>
          this.comments.update((m) => ({ ...m, [post.id]: res.comments })),
      });
  }

  addComment(post: any) {
    const content = (this.commentDrafts[post.id] || '').trim();
    if (!content) return;
    this.api
      .post(`/api/posts/${post.id}/comments`, { content })
      .subscribe({
        next: () => {
          this.commentDrafts[post.id] = '';
          post.commentCount += 1;
          this.toggleComments(post);
          this.toggleComments(post);
        },
      });
  }

  canDelete(post: any) {
    return (
      post.authorId === this.auth.member()?.id || this.auth.isAdmin()
    );
  }

  remove(post: any) {
    this.api.delete(`/api/posts/${post.id}`).subscribe({
      next: () => this.load(),
    });
  }
}
