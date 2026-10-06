use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub author: String,
    pub os: String,
    pub app_data_dir: String,
    pub dev_mode: bool,
    pub database_mode: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PythonInterpreterInfo {
    pub installed: bool,
    pub version: String,
    pub executable: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestCase {
    pub input: String,
    pub expected: String,
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    let is_dev = cfg!(debug_assertions);
    let app_data_dir = dirs::data_dir()
        .map(|p| {
            if is_dev {
                p.join("Ap-dev")
            } else {
                p.join("Ap")
            }
        })
        .unwrap_or_else(|| PathBuf::from("AppData"))
        .to_string_lossy()
        .to_string();

    AppInfo {
        name: "Ap Desktop".to_string(),
        version: "1.0.0".to_string(),
        author: "Arun Pandian".to_string(),
        os: std::env::consts::OS.to_string(),
        app_data_dir,
        dev_mode: is_dev,
        database_mode: "rusqlite (Native C/SQLite)".to_string(),
    }
}

fn resolve_python_path() -> PathBuf {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let bundled_py = exe_dir.join("runtime").join("python").join("python.exe");
            if bundled_py.exists() {
                return bundled_py;
            }
        }
    }
    let local_py = PathBuf::from("runtime").join("python").join("python.exe");
    if local_py.exists() {
        return local_py;
    }
    PathBuf::from("python")
}

fn resolve_worker_path(relative: &str) -> PathBuf {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let bundled_worker = exe_dir.join(relative);
            if bundled_worker.exists() {
                return bundled_worker;
            }
        }
    }
    PathBuf::from(relative)
}

#[tauri::command]
pub fn python_info() -> PythonInterpreterInfo {
    let py_path = resolve_python_path();
    let output = Command::new(&py_path).arg("--version").output();
    match output {
        Ok(out) if out.status.success() => {
            let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let which = Command::new("where").arg(&py_path).output();
            let exe = which
                .map(|w| String::from_utf8_lossy(&w.stdout).lines().next().unwrap_or("").to_string())
                .unwrap_or_else(|_| py_path.to_string_lossy().to_string());
            PythonInterpreterInfo {
                installed: true,
                version: if ver.is_empty() { String::from_utf8_lossy(&out.stderr).trim().to_string() } else { ver },
                executable: if exe.is_empty() { py_path.to_string_lossy().to_string() } else { exe },
                status: "Ready".to_string(),
            }
        }
        _ => PythonInterpreterInfo {
            installed: false,
            version: "Python Not Detected".to_string(),
            executable: String::new(),
            status: "Unavailable".to_string(),
        },
    }
}

#[tauri::command]
pub fn execute_python(code: String, test_cases: Vec<TestCase>) -> Result<serde_json::Value, String> {
    let py_path = resolve_python_path();
    let worker_script = resolve_worker_path("workers/python/worker.py");

    let mut child = Command::new(py_path)
        .arg(worker_script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn python worker: {}", e))?;

    let payload = serde_json::json!({
        "code": code,
        "test_cases": test_cases
    });

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(payload.to_string().as_bytes())
            .map_err(|e| format!("Failed to write to python worker: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for python worker: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout_str).map_err(|e| format!("Invalid worker JSON response: {} - Raw: {}", e, stdout_str))
}

#[tauri::command]
pub fn postgres_test(config: serde_json::Value) -> Result<serde_json::Value, String> {
    run_postgres_bridge("test", config)
}

#[tauri::command]
pub fn postgres_tables(config: serde_json::Value) -> Result<serde_json::Value, String> {
    run_postgres_bridge("tables", config)
}

#[tauri::command]
pub fn postgres_query(config: serde_json::Value, query: String) -> Result<serde_json::Value, String> {
    let payload = serde_json::json!({
        "config": config,
        "query": query
    });
    run_postgres_bridge("query", payload)
}

fn run_postgres_bridge(action: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let py_path = resolve_python_path();
    let bridge_script = resolve_worker_path("workers/postgres/bridge.py");

    let mut child = Command::new(py_path)
        .arg(bridge_script)
        .arg(action)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn postgres bridge: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(payload.to_string().as_bytes())
            .map_err(|e| format!("Failed to write to postgres bridge: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for postgres bridge: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout_str).map_err(|e| format!("Invalid bridge JSON response: {} - Raw: {}", e, stdout_str))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .invoke_handler(tauri::generate_handler![
            app_info,
            python_info,
            execute_python,
            postgres_test,
            postgres_tables,
            postgres_query
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
