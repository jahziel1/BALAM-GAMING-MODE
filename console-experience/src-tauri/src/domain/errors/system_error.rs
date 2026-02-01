use std::error::Error;
use std::fmt;

/// Errors that can occur during system operations.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SystemError {
    /// Access denied (insufficient permissions)
    AccessDenied(String),
    /// Invalid value provided
    InvalidValue(String),
    /// Operation failed
    OperationFailed(String),
}

impl fmt::Display for SystemError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SystemError::AccessDenied(msg) => write!(f, "Access denied: {msg}"),
            SystemError::InvalidValue(msg) => write!(f, "Invalid value: {msg}"),
            SystemError::OperationFailed(msg) => write!(f, "Operation failed: {msg}"),
        }
    }
}

impl Error for SystemError {}
