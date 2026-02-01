/**
 * Domain: Game Launch Error Types
 *
 * TypeScript mirror of Rust domain types.
 * Represents all possible failure reasons when launching a game.
 *
 * @module domain/errors/game-launch-error
 */

/**
 * Reason why a game launch failed
 */
export type LaunchFailureReason =
  | {
      type: 'Timeout';
      details: {
        timeout_seconds: number;
      };
    }
  | {
      type: 'QuickExit';
      details: {
        runtime_seconds: number;
      };
    }
  | {
      type: 'ExplicitError';
      details: {
        error_message: string;
      };
    }
  | {
      type: 'NoMonitoring';
    };

/**
 * Complete error information for game launch failure
 */
export interface GameLaunchError {
  /** Game ID that failed to launch */
  game_id: string;
  /** Game title (for display) */
  game_title: string;
  /** Store/Source (Steam, Xbox, Epic, Manual) */
  store: string;
  /** Why it failed */
  reason: LaunchFailureReason;
  /** Suggested actions for user (localized) */
  suggested_actions: string[];
}

/**
 * Get human-readable description of failure reason
 */
export function getFailureDescription(reason: LaunchFailureReason): string {
  switch (reason.type) {
    case 'Timeout':
      return `El juego no respondió después de ${reason.details.timeout_seconds} segundos`;
    case 'QuickExit':
      return `El juego se cerró después de ${reason.details.runtime_seconds} segundos`;
    case 'ExplicitError':
      return `Error del sistema: ${reason.details.error_message}`;
    case 'NoMonitoring':
      return 'No se pudo monitorear el estado del juego';
  }
}

/**
 * Get icon emoji for error type
 */
export function getErrorIcon(reason: LaunchFailureReason): string {
  switch (reason.type) {
    case 'Timeout':
      return '⏱️';
    case 'QuickExit':
      return '⚡';
    case 'ExplicitError':
      return '❌';
    case 'NoMonitoring':
      return '⚠️';
  }
}

/**
 * Get severity level for error
 */
export function getErrorSeverity(reason: LaunchFailureReason): 'error' | 'warning' | 'info' {
  switch (reason.type) {
    case 'Timeout':
      return 'warning'; // Puede ser temporal
    case 'QuickExit':
      return 'error'; // Probablemente fallo real
    case 'ExplicitError':
      return 'error'; // Error confirmado
    case 'NoMonitoring':
      return 'info'; // Informativo
  }
}
