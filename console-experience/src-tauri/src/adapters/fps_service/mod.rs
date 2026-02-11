/// FPS Service Client Module
///
/// Provides client-side functionality for interacting with the
/// Balam FPS Windows Service.
pub mod elevation;
pub mod fps_client;
pub mod service_installer;

pub use elevation::execute_elevated;
pub use fps_client::FpsClient;
pub use service_installer::FpsServiceInstaller;
