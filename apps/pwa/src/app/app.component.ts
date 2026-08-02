import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="avluo-container">
      <header>
        <h1>avluo</h1>
        <p class="tagline">Yeşiltepe · Komşuluk Ağı</p>
      </header>
      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .avluo-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    header h1 {
      color: #ff5a3c;
      font-size: 32px;
      font-weight: 700;
      margin: 0;
    }
    .tagline {
      color: #666;
      font-size: 14px;
      margin: 4px 0 24px;
    }
  `],
})
export class AppComponent {}
