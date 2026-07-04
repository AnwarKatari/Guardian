import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Triggers haptic feedback with high-quality Capacitor support and standard browser fallback.
 */
export async function triggerHaptic(pattern: number | number[] = 50) {
  try {
    if (typeof pattern === 'number') {
      if (pattern >= 200) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (pattern >= 100) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } else if (Array.isArray(pattern)) {
      // Simulate array pattern using notification or multiple pulses
      await Haptics.notification({ type: NotificationType.Warning });
    } else {
      await Haptics.vibrate();
    }
  } catch (error) {
    // Fallback to standard web vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
}

/**
 * Triggers a success notification vibration/haptic feedback.
 */
export async function triggerSuccessHaptic() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }
}

/**
 * Triggers a warning notification vibration/haptic feedback.
 */
export async function triggerWarningHaptic() {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }
}

/**
 * Triggers an error/failure notification vibration/haptic feedback.
 */
export async function triggerErrorHaptic() {
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (error) {
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 100, 500]);
    }
  }
}
