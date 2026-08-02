import { Component } from '@angular/core';

@Component({
  selector: 'app-emergency',
  standalone: true,
  template: `
    <div class="emergency">
      <h2>Notfall</h2>
      <button class="sos">SOS</button>
      <p class="hint">Drücke im Notfall. Sendet sofort eine Warnung an alle Nachbarn.</p>
    </div>
  `,
  styles: [`
    .emergency { text-align: center; padding: 20px 0; }
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
    .hint { color: #666; margin-top: 20px; }
  `],
})
export class EmergencyComponent {}
