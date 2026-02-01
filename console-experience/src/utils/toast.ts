/**
 * Toast Notification Utilities
 *
 * Wrapper around sonner for consistent notifications.
 */

import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, { duration: 3000 });
  },

  error: (message: string) => {
    sonnerToast.error(message, { duration: 5000 });
  },

  info: (message: string) => {
    sonnerToast.info(message, { duration: 3000 });
  },

  gameStarted: (title: string) => {
    sonnerToast.success(`${title} started`, {
      description: 'Enjoy your game!',
      duration: 2000,
    });
  },

  gameError: (title: string, error: string) => {
    sonnerToast.error(`Failed to launch ${title}`, {
      description: error,
      duration: 5000,
    });
  },
};
