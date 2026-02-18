use base64::Engine;
use serde::Serialize;
use std::path::{Path, PathBuf};

fn mime_for_path(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    match ext.as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "svg" => Some("image/svg+xml"),
        "avif" => Some("image/avif"),
        "bmp" => Some("image/bmp"),
        "tif" | "tiff" => Some("image/tiff"),
        _ => None,
    }
}

fn decode_percent_path(value: &str) -> Option<String> {
    let mut out = String::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if i + 2 >= bytes.len() {
                return None;
            }
            let h = (bytes[i + 1] as char).to_digit(16)?;
            let l = (bytes[i + 2] as char).to_digit(16)?;
            out.push((h * 16 + l) as u8 as char);
            i += 3;
            continue;
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    Some(out)
}

fn path_from_file_uri(uri: &str) -> Option<PathBuf> {
    let raw = uri.trim();
    if !raw.to_ascii_lowercase().starts_with("file://") {
        return None;
    }
    let mut rest = &raw[7..];
    if rest.to_ascii_lowercase().starts_with("localhost/") {
        rest = &rest["localhost".len()..];
    }
    let decoded = decode_percent_path(rest)?;
    Some(PathBuf::from(decoded))
}

fn extract_data_url_image(text: &str) -> Option<ClipboardImage> {
    let re = regex::Regex::new(r"(?is)data:(image/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)").ok()?;
    let captures = re.captures(text)?;
    let mime = captures.get(1)?.as_str().to_ascii_lowercase();
    let payload = captures.get(2)?.as_str().replace(char::is_whitespace, "");
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload.as_bytes())
        .ok()?;
    Some(ClipboardImage { bytes, mime })
}

fn extract_file_uri_image(text: &str) -> Option<ClipboardImage> {
    let mut candidates: Vec<String> = text
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .collect();

    if let Ok(re) = regex::Regex::new(r#"(?is)src=['"]([^'"]+)['"]"#) {
        candidates.extend(
            re.captures_iter(text)
                .filter_map(|cap| cap.get(1).map(|m| m.as_str().trim().to_string())),
        );
    }

    for candidate in candidates {
        let path = if candidate.to_ascii_lowercase().starts_with("file://") {
            match path_from_file_uri(&candidate) {
                Some(path) => path,
                None => continue,
            }
        } else {
            PathBuf::from(candidate)
        };
        let mime = match mime_for_path(&path) {
            Some(mime) => mime,
            None => continue,
        };
        if !path.is_file() {
            continue;
        }
        if let Ok(bytes) = std::fs::read(&path) {
            return Some(ClipboardImage {
                bytes,
                mime: mime.to_string(),
            });
        }
    }
    None
}

#[derive(Debug, Serialize)]
pub struct ClipboardImage {
    pub bytes: Vec<u8>,
    pub mime: String,
}

pub fn read_clipboard_image_impl() -> Result<Option<ClipboardImage>, String> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("failed to access clipboard: {e}"))?;

    if let Ok(image) = clipboard.get_image() {
        let width = u32::try_from(image.width)
            .map_err(|_| "clipboard image width is too large".to_string())?;
        let height = u32::try_from(image.height)
            .map_err(|_| "clipboard image height is too large".to_string())?;
        let rgba = image.bytes.into_owned();

        let mut encoded = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut encoded, width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder
                .write_header()
                .map_err(|e| format!("failed to initialize png encoder: {e}"))?;
            writer
                .write_image_data(&rgba)
                .map_err(|e| format!("failed to encode clipboard image: {e}"))?;
        }

        return Ok(Some(ClipboardImage {
            bytes: encoded,
            mime: "image/png".to_string(),
        }));
    }

    if let Ok(text) = clipboard.get_text() {
        if let Some(image) = extract_data_url_image(&text) {
            return Ok(Some(image));
        }
        if let Some(image) = extract_file_uri_image(&text) {
            return Ok(Some(image));
        }
    }

    Ok(None)
}
