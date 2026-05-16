use std::{path::PathBuf, process::Command};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_folder,
            open_in_cursor,
            open_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running War Room");
}
