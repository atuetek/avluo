import { Component } from '@angular/core';

@Component({
  selector: 'app-timeline',
  standalone: true,
  template: `
    <div class="timeline">
      <h2>Timeline</h2>
      <p class="empty">Willkommen bei Yeşiltepe. Hier erscheinen bald die ersten Posts deiner Nachbarn.</p>
    </div>
  `,
  styles: [`
    .timeline h2 { color: #1a1a1a; }
    .empty { color: #999; font-style: italic; }
  `],
})
export class TimelineComponent {}
