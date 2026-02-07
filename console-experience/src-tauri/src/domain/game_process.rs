use serde::Serialize;

/// Domain entity for game process management.
///
/// Represents a running game process with metadata needed for graceful shutdown.
#[derive(Debug, Clone, Serialize)]
pub struct GameProcess {
    /// Process ID (PID) - must be non-zero
    pub pid: u32,
    /// Process name (e.g., "eldenring.exe")
    pub name: String,
    /// Full executable path
    pub path: String,
    /// Whether the process is responding to window messages
    pub is_responding: bool,
}

impl GameProcess {
    /// Creates a new GameProcess with validation.
    ///
    /// # Arguments
    /// * `pid` - Process ID (must be non-zero)
    /// * `name` - Process name
    /// * `path` - Full executable path
    ///
    /// # Errors
    /// Returns `Err` if PID is zero (invalid).
    pub fn new(pid: u32, name: String, path: String) -> Result<Self, String> {
        if pid == 0 {
            return Err("PID cannot be zero".to_string());
        }
        Ok(Self {
            pid,
            name,
            path,
            is_responding: true,
        })
    }

    /// Creates a GameProcess without responsiveness check (used for testing).
    #[must_use]
    pub fn with_responding(mut self, responding: bool) -> Self {
        self.is_responding = responding;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_process_validation() {
        let valid = GameProcess::new(1234, "test.exe".to_string(), "C:\\test.exe".to_string());
        assert!(valid.is_ok());

        let invalid = GameProcess::new(0, "test.exe".to_string(), "C:\\test.exe".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_game_process_responding() {
        let process = GameProcess::new(1234, "test.exe".to_string(), "C:\\test.exe".to_string())
            .unwrap()
            .with_responding(false);

        assert!(!process.is_responding);
    }
}
