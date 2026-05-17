use std::{
    collections::{BTreeMap, HashSet},
    fs,
    path::{Path, PathBuf},
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

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectInspectionResult {
    project_type: String,
    important_files: Vec<String>,
    package_scripts: BTreeMap<String, String>,
    git_summary: String,
    top_level_entries: Vec<String>,
    suggested_verification_commands: Vec<String>,
    scanned_file_count: usize,
    max_depth: usize,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalMemoryFile {
    name: String,
    path: String,
    size_bytes: u64,
    content: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalMemoryResult {
    root_path: String,
    memory_context: String,
    active_memory_context: String,
    reference_memory_context: String,
    direct_answer: Option<String>,
    loaded_projects: Vec<String>,
    files: Vec<LocalMemoryFile>,
    warning: Option<String>,
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

fn read_markdown_memory_file(path: &Path, root: &Path) -> Result<Option<LocalMemoryFile>, String> {
    const MAX_MEMORY_FILE_BYTES: u64 = 32 * 1024;

    if !path.exists() || !path.is_file() {
        return Ok(None);
    }

    let metadata = fs::metadata(path)
        .map_err(|error| format!("Could not read memory file metadata {}: {error}", path.display()))?;

    if metadata.len() > MAX_MEMORY_FILE_BYTES {
        return Ok(Some(LocalMemoryFile {
            name: path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_else(|| "memory.md".into()),
            path: display_relative(path, root),
            size_bytes: metadata.len(),
            content: format!(
                "Skipped because this memory file is larger than {} KB.",
                MAX_MEMORY_FILE_BYTES / 1024
            ),
        }));
    }

    let content = fs::read_to_string(path)
        .map_err(|error| format!("Could not read memory file {}: {error}", path.display()))?;

    Ok(Some(LocalMemoryFile {
        name: path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| "memory.md".into()),
        path: display_relative(path, root),
        size_bytes: metadata.len(),
        content,
    }))
}

fn normalize_memory_name(name: &str) -> String {
    name.to_lowercase()
        .replace(['-', '_'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn is_basic_status_question(message: &str) -> bool {
    let normalized = message.to_lowercase();
    let has_status_word = ["status", "progress", "todo", "next", "done", "changed", "decision"]
        .iter()
        .any(|word| normalized.contains(word));
    let is_question = normalized.contains('?')
        || normalized.starts_with("what")
        || normalized.starts_with("where")
        || normalized.starts_with("how")
        || normalized.starts_with("show")
        || normalized.starts_with("tell");

    has_status_word && is_question
}

fn memory_file_matches_project(path: &Path, project_name: &str) -> bool {
    let normalized_project = normalize_memory_name(project_name);

    if normalized_project.is_empty() {
        return false;
    }

    path.file_stem()
        .map(|stem| normalize_memory_name(&stem.to_string_lossy()))
        .is_some_and(|stem| {
            stem == normalized_project
                || stem.contains(&normalized_project)
                || normalized_project.contains(&stem)
        })
}

fn format_memory_context(files: &[LocalMemoryFile]) -> String {
    files
        .iter()
        .map(|file| format!("## {}\n{}", file.path, file.content.trim()))
        .collect::<Vec<_>>()
        .join("\n\n")
}

#[tauri::command]
fn load_war_room_memory(
    root_path: String,
    message: String,
    active_project_name: String,
    reference_project_name: Option<String>,
) -> Result<LocalMemoryResult, String> {
    let trimmed_root = if root_path.trim().is_empty() {
        "D:\\dev\\war-room"
    } else {
        root_path.trim()
    };
    let root = PathBuf::from(trimmed_root);
    let memory_dir = root.join("memory");

    if !memory_dir.exists() {
        return Ok(LocalMemoryResult {
            root_path: trimmed_root.into(),
            memory_context: String::new(),
            active_memory_context: String::new(),
            reference_memory_context: String::new(),
            direct_answer: None,
            loaded_projects: Vec::new(),
            files: Vec::new(),
            warning: Some("No local memory folder found yet.".into()),
        });
    }

    if !memory_dir.is_dir() {
        return Err("Configured War Room memory path is not a folder.".into());
    }

    let fixed_memory_names = ["project-status.md", "war-room-rules.md"];
    let mut core_files = Vec::new();
    let mut active_files = Vec::new();
    let mut reference_files = Vec::new();
    let mut loaded_projects = Vec::new();

    // Always load only the core operating memory. Project files are scoped below.
    for file_name in fixed_memory_names {
        if let Some(memory_file) = read_markdown_memory_file(&memory_dir.join(file_name), &root)? {
            core_files.push(memory_file);
        }
    }

    let mut project_memory_files = fs::read_dir(&memory_dir)
        .map_err(|error| format!("Could not read War Room memory folder: {error}"))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.is_file()
                && path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
                && !fixed_memory_names.iter().any(|fixed| {
                    path.file_name()
                        .is_some_and(|name| name.to_string_lossy().eq_ignore_ascii_case(fixed))
                })
        })
        .collect::<Vec<_>>();
    project_memory_files.sort();

    for path in project_memory_files.into_iter().take(24) {
        if memory_file_matches_project(&path, &active_project_name) {
            loaded_projects.push(active_project_name.clone());
            if let Some(memory_file) = read_markdown_memory_file(&path, &root)? {
                active_files.push(memory_file);
            }
            continue;
        }

        if let Some(reference_project) = reference_project_name.as_deref() {
            if memory_file_matches_project(&path, reference_project) {
                loaded_projects.push(reference_project.into());
                if let Some(memory_file) = read_markdown_memory_file(&path, &root)? {
                    reference_files.push(memory_file);
                }
            }
        }
    }

    loaded_projects.sort();
    loaded_projects.dedup();

    let core_context = format_memory_context(&core_files);
    let active_memory_context = format_memory_context(&active_files);
    let reference_memory_context = format_memory_context(&reference_files);
    let mut context_sections = Vec::new();

    if !core_context.trim().is_empty() {
        context_sections.push(format!("## Core War Room Memory\n{}", core_context));
    }

    if !active_memory_context.trim().is_empty() {
        context_sections.push(format!(
            "## Active Project Memory: {}\n{}",
            active_project_name, active_memory_context
        ));
    }

    if let Some(reference_project) = reference_project_name.as_deref() {
        if !reference_memory_context.trim().is_empty() {
            context_sections.push(format!(
                "## Reference Project Memory: {}\n{}",
                reference_project, reference_memory_context
            ));
        }
    }

    let memory_context = context_sections
        .into_iter()
        .filter(|section| !section.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n\n");

    let direct_answer = if is_basic_status_question(&message) && !memory_context.trim().is_empty() {
        Some(format!(
            "Local memory may already answer this for active focus {}:\n\n{}",
            active_project_name, memory_context
        ))
    } else {
        None
    };
    let files = core_files
        .into_iter()
        .chain(active_files)
        .chain(reference_files)
        .collect();

    Ok(LocalMemoryResult {
        root_path: trimmed_root.into(),
        memory_context,
        active_memory_context,
        reference_memory_context,
        direct_answer,
        loaded_projects,
        files,
        warning: None,
    })
}

fn should_ignore_path(path: &Path, root: &Path) -> bool {
    let Ok(relative) = path.strip_prefix(root) else {
        return false;
    };

    let parts: Vec<String> = relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .collect();

    parts.iter().any(|part| {
        matches!(
            part.as_str(),
            "node_modules" | ".git" | "dist" | "build" | "target" | ".dart_tool" | ".next"
        )
    }) || parts.windows(2).any(|window| {
        matches!(
            (window[0].as_str(), window[1].as_str()),
            ("android", ".gradle") | ("ios", "Pods")
        )
    })
}

fn display_relative(path: &Path, root: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn collect_project_files(
    root: &Path,
    current: &Path,
    depth: usize,
    max_depth: usize,
    max_entries: usize,
    found: &mut Vec<PathBuf>,
) -> Result<(), String> {
    if depth > max_depth || found.len() >= max_entries || should_ignore_path(current, root) {
        return Ok(());
    }

    let entries = fs::read_dir(current)
        .map_err(|error| format!("Could not read folder {}: {error}", current.display()))?;

    for entry in entries {
        if found.len() >= max_entries {
            break;
        }

        let entry = entry.map_err(|error| format!("Could not read a project entry: {error}"))?;
        let path = entry.path();

        if should_ignore_path(&path, root) {
            continue;
        }

        found.push(path.clone());

        if path.is_dir() {
            collect_project_files(root, &path, depth + 1, max_depth, max_entries, found)?;
        }
    }

    Ok(())
}

fn read_package_scripts(package_json_path: &Path) -> Result<BTreeMap<String, String>, String> {
    if !package_json_path.exists() {
        return Ok(BTreeMap::new());
    }

    let package_text = fs::read_to_string(package_json_path)
        .map_err(|error| format!("Could not read package.json: {error}"))?;
    let package_json: serde_json::Value = serde_json::from_str(&package_text)
        .map_err(|error| format!("Could not parse package.json: {error}"))?;
    let scripts = package_json
        .get("scripts")
        .and_then(|scripts| scripts.as_object())
        .map(|scripts| {
            scripts
                .iter()
                .filter_map(|(name, command)| {
                    command
                        .as_str()
                        .map(|command| (name.to_string(), command.to_string()))
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(scripts)
}

fn read_package_dependency_names(package_json_path: &Path) -> Vec<String> {
    let Ok(package_text) = fs::read_to_string(package_json_path) else {
        return Vec::new();
    };
    let Ok(package_json) = serde_json::from_str::<serde_json::Value>(&package_text) else {
        return Vec::new();
    };

    ["dependencies", "devDependencies"]
        .iter()
        .filter_map(|section| package_json.get(section).and_then(|value| value.as_object()))
        .flat_map(|dependencies| dependencies.keys().cloned())
        .collect()
}

fn read_git_summary(root: &Path) -> String {
    let head_path = root.join(".git").join("HEAD");

    if !head_path.exists() {
        return "No git repository detected.".into();
    }

    match fs::read_to_string(head_path) {
        Ok(head) => {
            let trimmed = head.trim();
            let branch = trimmed
                .strip_prefix("ref: refs/heads/")
                .unwrap_or(trimmed)
                .to_string();
            format!(
                "Repository detected. Branch: {branch}. Working tree status was not checked because this scanner is read-only and does not run git commands."
            )
        }
        Err(error) => format!("Git repository detected, but branch could not be read: {error}"),
    }
}

fn detect_project_type(root: &Path, relative_files: &HashSet<String>) -> String {
    let package_json_path = root.join("package.json");
    let dependencies = read_package_dependency_names(&package_json_path);
    let has_dependency = |name: &str| dependencies.iter().any(|dependency| dependency == name);
    let has_file = |name: &str| relative_files.contains(name);
    let has_prefix = |prefix: &str| relative_files.iter().any(|file| file.starts_with(prefix));

    if has_file("src-tauri/tauri.conf.json") || has_file("src-tauri/Cargo.toml") {
        "Tauri".into()
    } else if has_file("pubspec.yaml") {
        "Flutter".into()
    } else if has_file("next.config.js")
        || has_file("next.config.mjs")
        || has_file("next.config.ts")
        || has_dependency("next")
    {
        "Next.js".into()
    } else if has_file("vite.config.ts")
        || has_file("vite.config.js")
        || has_file("vite.config.mjs")
        || (has_file("package.json") && (has_dependency("vite") || has_dependency("react")))
    {
        "React/Vite".into()
    } else if has_file("package.json") {
        "Node".into()
    } else if has_file("Cargo.toml") || has_prefix("src/") {
        "Rust".into()
    } else {
        "unknown".into()
    }
}

fn suggested_commands(
    project_type: &str,
    package_scripts: &BTreeMap<String, String>,
    relative_files: &HashSet<String>,
) -> Vec<String> {
    let mut commands = Vec::new();

    match project_type {
        "Tauri" => {
            if package_scripts.contains_key("build") {
                commands.push("npm.cmd run build".into());
            }
            commands.push("cargo check".into());
            if package_scripts.contains_key("tauri") {
                commands.push("npm.cmd run tauri dev".into());
            }
        }
        "React/Vite" | "Next.js" | "Node" => {
            if package_scripts.contains_key("build") {
                commands.push("npm.cmd run build".into());
            }
            if package_scripts.contains_key("test") {
                commands.push("npm.cmd run test".into());
            }
            if package_scripts.contains_key("lint") {
                commands.push("npm.cmd run lint".into());
            }
        }
        "Flutter" => {
            commands.push("flutter analyze".into());
            commands.push("flutter test".into());
        }
        "Rust" => {
            commands.push("cargo check".into());
            commands.push("cargo test".into());
        }
        _ => {}
    }

    if relative_files.contains("src-tauri/Cargo.toml") && !commands.iter().any(|cmd| cmd == "cargo check") {
        commands.push("cargo check".into());
    }

    commands
}

#[tauri::command]
fn inspect_project_files(project_path: String) -> Result<ProjectInspectionResult, String> {
    let path = validate_project_path(project_path)?;

    if !path.is_dir() {
        return Err("Carlos needs a folder path to inspect project files.".into());
    }

    let max_depth = 3;
    let max_entries = 500;
    let mut found_paths = Vec::new();

    collect_project_files(&path, &path, 0, max_depth, max_entries, &mut found_paths)?;

    let mut top_level_entries = fs::read_dir(&path)
        .map_err(|error| format!("Could not read top-level project folder: {error}"))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|entry_path| !should_ignore_path(entry_path, &path))
        .map(|entry_path| {
            let name = entry_path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_else(|| display_relative(&entry_path, &path));
            if entry_path.is_dir() {
                format!("{name}/")
            } else {
                name
            }
        })
        .collect::<Vec<_>>();
    top_level_entries.sort();

    let relative_files = found_paths
        .iter()
        .filter(|entry_path| entry_path.is_file())
        .map(|entry_path| display_relative(entry_path, &path))
        .collect::<HashSet<_>>();

    let important_names = [
        "README.md",
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "vite.config.ts",
        "vite.config.js",
        "vite.config.mjs",
        "next.config.ts",
        "next.config.js",
        "next.config.mjs",
        "tsconfig.json",
        "Cargo.toml",
        "Cargo.lock",
        "src-tauri/tauri.conf.json",
        "src-tauri/Cargo.toml",
        "pubspec.yaml",
        ".env.example",
    ];
    let mut important_files = important_names
        .iter()
        .filter(|name| relative_files.contains(**name))
        .map(|name| (*name).to_string())
        .collect::<Vec<_>>();
    important_files.sort();

    let package_scripts = read_package_scripts(&path.join("package.json"))?;
    let project_type = detect_project_type(&path, &relative_files);
    let git_summary = read_git_summary(&path);
    let suggested_verification_commands =
        suggested_commands(&project_type, &package_scripts, &relative_files);

    Ok(ProjectInspectionResult {
        project_type,
        important_files,
        package_scripts,
        git_summary,
        top_level_entries,
        suggested_verification_commands,
        scanned_file_count: found_paths.len(),
        max_depth,
    })
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
            inspect_project_files,
            load_war_room_memory,
            run_powershell_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running War Room");
}
