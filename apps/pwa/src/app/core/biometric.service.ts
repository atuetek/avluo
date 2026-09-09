import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth';

/**
 * Native biometric gate (Face ID / Fingerprint) before Passkey unlock.
 * Falls back to confirm() if plugin/hardware unavailable.
 */
@Injectable({ providedIn: 'root' })
export class BiometricService {
  isNative() {
    return Capacitor.isNativePlatform();
  }

  async confirmUnlock(reason = 'Avluo entsperren'): Promise<boolean> {
    if (!this.isNative()) return true;

    try {
      const result = await BiometricAuth.checkBiometry();
      if (!result.isAvailable) {
        return window.confirm(reason);
      }

      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Abbrechen',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Code verwenden',
        androidTitle: 'Avluo',
        androidSubtitle: reason,
      });

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        /* optional */
      }

      return true;
    } catch (err) {
      if (err instanceof BiometryError) {
        if (err.code === BiometryErrorType.userCancel) return false;
      }
      // Plugin missing / unexpected → soft fallback
      return window.confirm(reason);
    }
  }
}
