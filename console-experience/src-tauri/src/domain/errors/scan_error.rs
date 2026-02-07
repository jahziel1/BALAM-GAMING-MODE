use std::error::Error;
use std::fmt;

/// Errors that can occur during game scanning.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScanError {
    /// Failed to access filesystem (permissions, disk error, etc.)
    IoError(String),
    /// Failed to parse game metadata (corrupted VDF, invalid JSON, etc.)
    ParseError(String),
    /// Game directory not found
    DirectoryNotFound(String),
    /// Invalid game data (missing executable, invalid app ID, etc.)
    InvalidGameData(String),
    /// Platform-specific error (e.g., Windows Registry access failed)
    PlatformError(String),
}

impl fmt::Display for ScanError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ScanError::IoError(msg) => write!(f, "I/O error: {msg}"),
            ScanError::ParseError(msg) => write!(f, "Parse error: {msg}"),
            ScanError::DirectoryNotFound(path) => write!(f, "Directory not found: {path}"),
            ScanError::InvalidGameData(msg) => write!(f, "Invalid game data: {msg}"),
            ScanError::PlatformError(msg) => write!(f, "Platform error: {msg}"),
        }
    }
}

impl Error for ScanError {}

impl From<std::io::Error> for ScanError {
    fn from(err: std::io::Error) -> Self {
        ScanError::IoError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_error_display() {
        let error = ScanError::IoError("Permission denied".to_string());
        assert_eq!(error.to_string(), "I/O error: Permission denied");
    }

    #[test]
    fn test_io_error_conversion() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let scan_err: ScanError = io_err.into();

        assert!(
            matches!(scan_err, ScanError::IoError(ref msg) if msg.contains("file not found")),
            "Expected IoError variant with 'file not found' message"
        );
    }
}
