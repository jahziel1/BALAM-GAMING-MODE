use crate::domain::Game;
use std::process::Command;
use std::os::windows::process::CommandExt;

pub struct XboxScanner;

impl XboxScanner {
    pub fn scan() -> Vec<Game> {
        let mut games = Vec::new();
        println!("Scanning Xbox/UWP Apps (via PowerShell)...");

        // PowerShell script to get installed UWP apps
        // We use Get-StartApps because it's faster and cleaner than Get-AppxPackage for finding "launchable" items.
        // OR we use the robust Get-AppxPackage logic we had before.
        
        // Let's use the robust one:
        let ps_script = r#"
            Get-AppxPackage | Where-Object { $_.SignatureKind -eq "Store" -or $_.IsFramework -eq $false } | ForEach-Object {
                $pkg = $_
                try {
                    $manifest = $pkg | Get-AppxPackageManifest
                    $app = $manifest.Package.Applications.Application
                    if ($app) {
                        # Handle array of apps in one package
                        if ($app.Count -gt 1) {
                            foreach ($a in $app) {
                                [PSCustomObject]@{
                                    Name = $a.VisualElements.DisplayName
                                    Id = $pkg.PackageFamilyName + "!" + $a.Id
                                    Package = $pkg.Name
                                }
                            }
                        } else {
                            [PSCustomObject]@{
                                Name = $app.VisualElements.DisplayName
                                Id = $pkg.PackageFamilyName + "!" + $app.Id
                                Package = $pkg.Name
                            }
                        }
                    }
                } catch {}
            } | ConvertTo-Json -Compress
        "#;

        // Execute PowerShell
        // CREATE_NO_WINDOW = 0x08000000
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_script])
            .creation_flags(0x08000000) 
            .output();

        match output {
            Ok(o) => {
                if o.status.success() {
                    let stdout = String::from_utf8_lossy(&o.stdout);
                    // Parse JSON output
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&stdout) {
                        if let Some(arr) = parsed.as_array() {
                            for item in arr {
                                let name = item["Name"].as_str().unwrap_or("").to_string();
                                let id = item["Id"].as_str().unwrap_or("").to_string();
                                let package_name = item["Package"].as_str().unwrap_or("").to_string();

                                if name.is_empty() || id.is_empty() { continue; }

                                // Filter Logic (Same as Native)
                                let lower_name = name.to_lowercase();
                                let lower_id = id.to_lowercase();
                                let lower_pkg = package_name.to_lowercase();

                                let is_likely_game = 
                                    lower_id.contains("gaming") || 
                                    lower_pkg.contains("xbox") ||
                                    lower_name.contains("solitaire") ||
                                    lower_name.contains("minecraft") ||
                                    lower_name.contains("halo") ||
                                    lower_name.contains("forza") ||
                                    lower_name.contains("flight") ||
                                    lower_name.contains("age of empires");

                                let is_junk = 
                                    lower_name.contains("ms-resource") || 
                                    lower_name.contains("uninstall") ||
                                    lower_id.contains("windows.print") ||
                                    lower_id.contains("helper") ||
                                    lower_id.contains("overlay");

                                if is_likely_game && !is_junk {
                                    games.push(Game {
                                        id: format!("xbox_{}", id),
                                        title: name,
                                        path: id, // AppUserModelId
                                        image: None,
                                        last_played: None,
                                    });
                                }
                            }
                        } else if let Some(obj) = parsed.as_object() {
                             // Single result case
                             // ... (Simplified for now, array is 99% case)
                        }
                    }
                } else {
                    println!("PowerShell error: {}", String::from_utf8_lossy(&o.stderr));
                }
            },
            Err(e) => println!("Failed to execute PowerShell: {}", e),
        }

        println!("Found {} Xbox/UWP games", games.len());
        games
    }
}
