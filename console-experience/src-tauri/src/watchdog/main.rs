use std::thread;
use std::time::Duration;
use sysinfo::System;

// Watchdog: Un proceso ligero separado que vigila al juego.
// Cuando el juego termina, el Watchdog restaura el Shell.
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: watchdog <game_pid>");
        return;
    }

    let game_pid_res = args[1].parse::<u32>();
    let game_pid = match game_pid_res {
        Ok(pid) => pid,
        Err(_) => {
            eprintln!("Invalid PID provided");
            return;
        }
    };

    let mut sys = System::new_all();
    println!("Watchdog started monitoring PID: {}", game_pid);

    loop {
        // Polling de bajo coste (cada 2 segundos)
        thread::sleep(Duration::from_secs(2));

        // Refrescamos la lista de procesos
        sys.refresh_all();

        // Verificamos si el proceso del juego sigue vivo
        let is_running = sys
            .processes()
            .values()
            .any(|p| p.pid().as_u32() == game_pid);

        if !is_running {
            println!("Game exited. Restoring Shell...");
            // TODO: Enviar señal al Shell principal para despertar
            break;
        }
    }
}
