use std::io::{Read, Write};
use std::net::TcpListener;
use std::process::Command;
use serde::Serialize;

#[derive(Serialize)]
struct FontInfo {
    name: String,
    path: String,
}

#[tauri::command]
fn scan_system_fonts() -> Result<Vec<FontInfo>, String> {
    let fonts = scan_fonts()?;
    Ok(fonts)
}

fn scan_fonts() -> Result<Vec<FontInfo>, String> {
    #[cfg(target_os = "linux")]
    {
        scan_fonts_linux()
    }

    #[cfg(target_os = "macos")]
    {
        scan_fonts_macos()
    }

    #[cfg(target_os = "windows")]
    {
        scan_fonts_windows()
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Ok(vec![])
    }
}

#[cfg(target_os = "linux")]
fn scan_fonts_linux() -> Result<Vec<FontInfo>, String> {
    let output = Command::new("fc-list")
        .arg("--format=%{family}\t%{file}\n")
        .output()
        .map_err(|e| format!("Failed to run fc-list: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut fonts = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(2, '\t').collect();
        if parts.len() == 2 {
            let name = parts[0].trim().to_string();
            let path = parts[1].trim().to_string();

            if path.ends_with(".ttf") || path.ends_with(".otf") || path.ends_with(".ttc") {
                let key = format!("{}:{}", name, path);
                if !seen.contains(&key) {
                    seen.insert(key);
                    fonts.push(FontInfo { name, path });
                }
            }
        }
    }

    Ok(fonts)
}

#[cfg(target_os = "macos")]
fn scan_fonts_macos() -> Result<Vec<FontInfo>, String> {
    let dirs = vec![
        "/Library/Fonts",
        "/System/Library/Fonts",
        &format!("{}/Library/Fonts", std::env::var("HOME").unwrap_or_default()),
    ];

    let mut fonts = Vec::new();
    for dir in dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(ext) = path.extension() {
                    let ext = ext.to_string_lossy().to_lowercase();
                    if ext == "ttf" || ext == "otf" || ext == "ttc" {
                        let name = path.file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default();
                        fonts.push(FontInfo {
                            name,
                            path: path.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    Ok(fonts)
}

#[cfg(target_os = "windows")]
fn scan_fonts_windows() -> Result<Vec<FontInfo>, String> {
    let fonts_dir = std::path::PathBuf::from("C:\\Windows\\Fonts");
    let mut fonts = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&fonts_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                if ext == "ttf" || ext == "otf" || ext == "ttc" {
                    let name = path.file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    fonts.push(FontInfo {
                        name,
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    Ok(fonts)
}

fn guess_content_type(path: &str) -> &'static str {
    let lower = path.to_lowercase();
    if lower.ends_with(".mp4") { "video/mp4" }
    else if lower.ends_with(".webm") { "video/webm" }
    else if lower.ends_with(".ogg") || lower.ends_with(".ogv") { "video/ogg" }
    else if lower.ends_with(".mov") { "video/quicktime" }
    else if lower.ends_with(".mp3") { "audio/mpeg" }
    else if lower.ends_with(".wav") { "audio/wav" }
    else if lower.ends_with(".aac") { "audio/aac" }
    else if lower.ends_with(".flac") { "audio/flac" }
    else if lower.ends_with(".m4a") { "audio/mp4" }
    else if lower.ends_with(".png") { "image/png" }
    else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") { "image/jpeg" }
    else if lower.ends_with(".gif") { "image/gif" }
    else if lower.ends_with(".svg") { "image/svg+xml" }
    else if lower.ends_with(".webp") { "image/webp" }
    else { "application/octet-stream" }
}

#[tauri::command]
fn start_present_server(html: String, media_dir: Option<String>) -> Result<u16, String> {
    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind: {}", e))?;
    let port = listener.local_addr().map_err(|e| format!("{}", e))?.port();
    let media_dir = media_dir.map(std::path::PathBuf::from);

    std::thread::spawn(move || {
        listener.set_nonblocking(false).ok();
        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    let mut buf = vec![0u8; 8192];
                    let n = stream.read(&mut buf).unwrap_or(0);
                    let request = String::from_utf8_lossy(&buf[..n]);
                    let request_path = request.lines().next()
                        .and_then(|line| line.split_whitespace().nth(1))
                        .unwrap_or("/");

                    if request_path == "/" {
                        let body = html.clone();
                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n\r\n{}",
                            body
                        );
                        let _ = stream.write_all(response.as_bytes());
                    } else if request_path.starts_with("/media/") {
                        let file_name = &request_path[7..];
                        if let Some(ref dir) = media_dir {
                            let decoded = percent_decode(file_name);
                            let file_path = dir.join(&decoded);
                            if file_path.starts_with(dir) && file_path.exists() {
                                match std::fs::read(&file_path) {
                                    Ok(data) => {
                                        let ct = guess_content_type(&decoded);
                                        let total_len = data.len();

                                        let range_header = request.lines()
                                            .find(|line| line.to_lowercase().starts_with("range:"));

                                        if let Some(range_str) = range_header {
                                            let range_val = range_str.split(':').nth(1)
                                                .map(|v| v.trim()).unwrap_or("");
                                            let (start, end) = parse_range(range_val, total_len);
                                            if start < total_len {
                                                let end = end.min(total_len - 1);
                                                let content_len = end - start + 1;
                                                let header = format!(
                                                    "HTTP/1.1 206 Partial Content\r\nContent-Type: {}\r\nContent-Length: {}\r\nContent-Range: bytes {}-{}/{}\r\nAccept-Ranges: bytes\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                                                    ct, content_len, start, end, total_len
                                                );
                                                let _ = stream.write_all(header.as_bytes());
                                                let _ = stream.write_all(&data[start..=end]);
                                            } else {
                                                let resp = format!("HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */{}\r\nConnection: close\r\n\r\n", total_len);
                                                let _ = stream.write_all(resp.as_bytes());
                                            }
                                        } else {
                                            let header = format!(
                                                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccept-Ranges: bytes\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                                                ct, total_len
                                            );
                                            let _ = stream.write_all(header.as_bytes());
                                            let _ = stream.write_all(&data);
                                        }
                                    }
                                    Err(_) => {
                                        let resp = "HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n";
                                        let _ = stream.write_all(resp.as_bytes());
                                    }
                                }
                            } else {
                                let resp = "HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n";
                                let _ = stream.write_all(resp.as_bytes());
                            }
                        } else {
                            let resp = "HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n";
                            let _ = stream.write_all(resp.as_bytes());
                        }
                    } else {
                        let resp = "HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(resp.as_bytes());
                    }
                    let _ = stream.flush();
                }
                Err(_) => break,
            }
        }
    });

    Ok(port)
}

fn percent_decode(input: &str) -> String {
    let mut result = Vec::new();
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(hi), Some(lo)) = (
                char::from(bytes[i + 1]).to_digit(16),
                char::from(bytes[i + 2]).to_digit(16),
            ) {
                result.push((hi * 16 + lo) as u8);
                i += 3;
                continue;
            }
        }
        result.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&result).to_string()
}

fn parse_range(range: &str, total: usize) -> (usize, usize) {
    let range = range.trim();
    if !range.starts_with("bytes=") {
        return (0, total - 1);
    }
    let spec = &range[6..];
    let parts: Vec<&str> = spec.split('-').collect();
    if parts.len() != 2 {
        return (0, total - 1);
    }
    let start = parts[0].trim().parse::<usize>().unwrap_or(0);
    let end = if parts[1].trim().is_empty() {
        total - 1
    } else {
        parts[1].trim().parse::<usize>().unwrap_or(total - 1)
    };
    (start, end)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![start_present_server, scan_system_fonts])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
