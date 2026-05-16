use std::{
    path::PathBuf,
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PowerShellOutput {
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
    duration_ms: u128,
    timed_out: bool,
}

fn validate_project_path(project_path: String) -> Result<PathBuf, String> {
    let trimmed = project_path.trim();

    if trimmed.is_empty() {
        return Err("Select a project path first.".into());
    }

    let path = PathBuf::from(trimmed);

    if !path.exists() {
        return Err(format!("Project path does not exist: {trimmed}"));
    }

    Ok(path)
}

#[tauri::command]
fn open_folder(project_path: String) -> Result<(), String> {
    let path = validate_project_path(project_path)?;

    Command::new("explorer")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open folder: {error}"))
}

#[tauri::command]
fn open_in_cursor(project_path: String) -> Result<(), String> {
    let path = validate_project_path(project_path)?;

    Command::new("cursor")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open Cursor: {error}"))
}

#[tauri::command]
fn open_terminal(project_path: String) -> Result<(), String> {
    let path = validate_project_path(project_path)?;

    if !path.is_dir() {
        return Err("Open Terminal needs a folder path.".into());
    }

    Command::new("powershell")
        .arg("-NoExit")
        .current_dir(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open PowerShell: {error}"))
}

#[tauri::command]
fn run_powershell_command(
    project_path: String,
    command_text: String,
) -> Result<PowerShellOutput, String> {
    let path = validate_project_path(project_path)?;

    if !path.is_dir() {
        return Err("PowerShell Runner needs a folder path.".into());
    }

    if command_text.trim().is_empty() {
        return Err("Enter a PowerShell command first.".into());
    }

    let started_at = Instant::now();
    let mut child = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-Command")
        .arg(command_text)
        .current_dir(path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Could not start PowerShell: {error}"))?;

    let timeout = Duration::from_secs(60);
    let mut timed_out = false;

    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if started_at.elapsed() >= timeout {
                    timed_out = true;
                    child
                        .kill()
                        .map_err(|error| format!("Could not stop timed out PowerShell: {error}"))?;
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }
            Err(error) => return Err(format!("Could not monitor PowerShell: {error}")),
        }
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Could not collect PowerShell output: {error}"))?;

    Ok(PowerShellOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
        duration_ms: started_at.elapsed().as_millis(),
        timed_out,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_folder,
            open_in_cursor,
            open_terminal,
            run_powershell_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running War Room");
}
