/**
 * Domain: Game Launch Error Types
 *
 * Represents all possible failure reasons when launching a game.
 * Following Clean Architecture: Pure domain logic, no framework dependencies.
 */
use serde::{Deserialize, Serialize};

/// Reason why a game launch failed
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "details")]
pub enum LaunchFailureReason {
    /// Game didn't start within timeout period (Steam registry, Xbox activation)
    Timeout {
        /// How many seconds we waited
        timeout_seconds: u64,
    },
    /// Game process exited too quickly (< 5 seconds)
    QuickExit {
        /// How many seconds it ran before exiting
        runtime_seconds: u64,
    },
    /// Explicit error from launcher/spawn
    ExplicitError {
        /// Error message from system
        error_message: String,
    },
    /// No watchdog available to monitor (Xbox explorer fallback)
    NoMonitoring,
}

impl LaunchFailureReason {
    /// Get human-readable description
    #[must_use]
    pub fn description(&self) -> String {
        match self {
            Self::Timeout { timeout_seconds } => {
                format!("El juego no respondió después de {timeout_seconds} segundos")
            },
            Self::QuickExit { runtime_seconds } => {
                format!("El juego se cerró después de {runtime_seconds} segundos")
            },
            Self::ExplicitError { error_message } => {
                format!("Error del sistema: {error_message}")
            },
            Self::NoMonitoring => "No se pudo monitorear el estado del juego".to_string(),
        }
    }
}

/// Complete error information for game launch failure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameLaunchError {
    /// Game ID that failed to launch
    pub game_id: String,
    /// Game title (for display)
    pub game_title: String,
    /// Store/Source (Steam, Xbox, Epic, Manual)
    pub store: String,
    /// Why it failed
    pub reason: LaunchFailureReason,
    /// Suggested actions for user (localized)
    pub suggested_actions: Vec<String>,
}

impl GameLaunchError {
    /// Create error for Steam timeout
    #[must_use]
    pub fn steam_timeout(game_id: String, game_title: String, timeout_seconds: u64) -> Self {
        Self {
            game_id,
            game_title,
            store: "Steam".to_string(),
            reason: LaunchFailureReason::Timeout { timeout_seconds },
            suggested_actions: vec![
                "Verifica que el juego no esté corriendo en otra PC".to_string(),
                "Actualiza Steam a la última versión".to_string(),
                "Reinicia Steam y vuelve a intentar".to_string(),
            ],
        }
    }

    /// Create error for Xbox/UWP activation failure
    #[must_use]
    pub fn xbox_activation_failed(game_id: String, game_title: String, error: String) -> Self {
        Self {
            game_id,
            game_title,
            store: "Xbox".to_string(),
            reason: LaunchFailureReason::ExplicitError { error_message: error },
            suggested_actions: vec![
                "Abre la Xbox App y verifica que el juego esté instalado".to_string(),
                "Actualiza la Xbox App desde Microsoft Store".to_string(),
                "Verifica permisos de administrador".to_string(),
            ],
        }
    }

    /// Create error for Xbox explorer fallback (no monitoring)
    #[must_use]
    pub fn xbox_explorer_fallback(game_id: String, game_title: String) -> Self {
        Self {
            game_id,
            game_title,
            store: "Xbox".to_string(),
            reason: LaunchFailureReason::NoMonitoring,
            suggested_actions: vec![
                "Cierra manualmente el juego si no inicia correctamente".to_string(),
                "Verifica en Task Manager si hay procesos del juego".to_string(),
            ],
        }
    }

    /// Create error for native game quick exit
    #[must_use]
    pub fn native_quick_exit(game_id: String, game_title: String, runtime_seconds: u64, store: String) -> Self {
        Self {
            game_id,
            game_title,
            store,
            reason: LaunchFailureReason::QuickExit { runtime_seconds },
            suggested_actions: vec![
                "Verifica que el juego no esté ya corriendo".to_string(),
                "Instala dependencias necesarias (.NET, DirectX, Visual C++)".to_string(),
                "Verifica integridad de archivos del juego".to_string(),
                "Ejecuta como administrador".to_string(),
            ],
        }
    }

    /// Create error for spawn failure
    #[must_use]
    pub fn spawn_failed(game_id: String, game_title: String, store: String, error: String) -> Self {
        Self {
            game_id,
            game_title,
            store,
            reason: LaunchFailureReason::ExplicitError { error_message: error },
            suggested_actions: vec![
                "Verifica que el archivo ejecutable existe".to_string(),
                "Verifica permisos del archivo".to_string(),
                "Intenta ejecutar el juego directamente desde su carpeta".to_string(),
            ],
        }
    }
}
