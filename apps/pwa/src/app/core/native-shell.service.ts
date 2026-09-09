import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

/**
 * Boots Capacitor shell plugins once on native platforms.
 */
@Injectable({ providedIn: 'root' })
export class NativeShellService {
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ff5a3c' });
    } catch {
      /* web / unsupported */
    }

    try {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    } catch {
      /* optional */
    }

    try {
      await SplashScreen.hide();
    } catch {
      /* optional */
    }

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }
}
