use crate::domain::game_process::GameProcess;

/// Port for game process management operations.
///
/// Provides a hardware abstraction layer for managing game processes,
/// including graceful shutdown (WM_CLOSE) and force termination.
///
/// # Graceful Shutdown Strategy
/// 1. Enumerate all windows belonging to the process
/// 2. Send WM_CLOSE to each window (allows save prompts)
/// 3. Wait up to 5 seconds for process to exit
/// 4. If still running, use TerminateProcess as last resort
///
/// # Thread Safety
/// All implementations must be `Send + Sync`.
///
/// # Examples
/// ```rust
/// use console_experience::ports::game_management_port::GameManagementPort;
/// use console_experience::adapters::game::WindowsGameAdapter;
///
/// let adapter = WindowsGameAdapter::new();
/// if let `Some`(game) = adapter.get_current_game()? {
///     let was_graceful = adapter.close_game(game.pid)?;
///     if was_graceful {
///         println!("Game closed gracefully");
///     } else {
///         println!("Game was force-terminated");
///     }
/// }
/// # Ok::<(), String>(())
/// ```
pub trait GameManagementPort: Send + Sync {
    /// Gets the currently running game process (if any).
    ///
    /// # Returns
    /// - `Ok(`Some`(GameProcess))` - A game is currently running
    /// - `Ok(`None`)` - No game is running
    /// - `Err(...)` - Error detecting game
    ///
    /// # Performance
    /// Should complete within 50ms. Called by UI when opening in-game menu.
    fn get_current_game(&self) -> Result<Option<GameProcess>, String>;

    /// Closes a game process gracefully.
    ///
    /// # Process
    /// 1. Enumerate windows for process PID
    /// 2. Send WM_CLOSE to all windows (graceful shutdown)
    /// 3. Wait up to 5 seconds for process to exit
    /// 4. If still running, call TerminateProcess (force kill)
    ///
    /// # Arguments
    /// * `pid` - Process ID of the game to close
    ///
    /// # Returns
    /// - `Ok(true)` - Process closed gracefully (WM_CLOSE succeeded)
    /// - `Ok(false)` - Process was force-terminated (TerminateProcess used)
    /// - `Err(...)` - Close operation failed
    ///
    /// # Safety
    /// - WM_CLOSE is safe (allows save prompts, cleanup)
    /// - TerminateProcess is dangerous (may cause data corruption)
    ///
    /// # Platform Notes
    /// - **Windows**: Uses `EnumWindows` + `WM_CLOSE` + `TerminateProcess`
    /// - **Linux**: Uses SIGTERM (15s timeout) + SIGKILL
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::game_management_port::GameManagementPort;
    /// # use console_experience::adapters::game::WindowsGameAdapter;
    /// let adapter = WindowsGameAdapter::new();
    /// let was_graceful = adapter.close_game(12345)?;
    /// if !was_graceful {
    ///     println!("Warning: Game did not respond to close request");
    /// }
    /// # Ok::<(), String>(())
    /// ```
    fn close_game(&self, pid: u32) -> Result<bool, String>;

    /// Checks if a process is responding to window messages.
    ///
    /// # Arguments
    /// * `pid` - Process ID to check
    ///
    /// # Returns
    /// - `Ok(true)` - Process is responding normally
    /// - `Ok(false)` - Process is hung (not responding)
    /// - `Err(...)` - Error checking responsiveness
    ///
    /// # Platform Notes
    /// - **Windows**: Uses `IsHungAppWindow` or `SendMessageTimeout`
    /// - **Linux**: Checks `/proc/[pid]/status` for 'D' state
    fn is_process_responding(&self, pid: u32) -> Result<bool, String>;
}
