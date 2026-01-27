use std::process::Command;
use std::thread;
use std::time::Duration;
use sysinfo::{ProcessExt, System, SystemExt};

// Watchdog: Un proceso ligero separado que vigila al juego.
// Cuando el juego termina, el Watchdog restaura el Shell.
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: watchdog <game_pid>");
        return;
    }

    let game_pid = args[1].parse::<i32>().expect("Invalid PID");
    let mut sys = System::new();

    println!("Watchdog started monitoring PID: {}", game_pid);

    loop {
        // Polling de bajo coste (cada 2 segundos)
        thread::sleep(Duration::from_secs(2));

        // Refrescamos solo la lista de procesos para ser eficientes
        sys.refresh_processes();

        // Verificamos si el proceso del juego sigue vivo
        let is_running = sys
            .processes()
            .values()
            .any(|p| p.pid().as_u32() as i32 == game_pid);

        if !is_running {
            println!("Game exited. Restoring Shell...");
            // TODO: Enviar señal al Shell principal para despertar
            // O relanzarlo si estaba cerrado.
            break;
        }
    }
}
