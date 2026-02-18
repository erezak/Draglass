use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ClipboardImage {
    pub bytes: Vec<u8>,
    pub mime: String,
}

pub fn read_clipboard_image_impl() -> Result<Option<ClipboardImage>, String> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("failed to access clipboard: {e}"))?;

    let image = match clipboard.get_image() {
        Ok(image) => image,
        Err(arboard::Error::ContentNotAvailable) => return Ok(None),
        Err(e) => return Err(format!("failed to read clipboard image: {e}")),
    };

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

    Ok(Some(ClipboardImage {
        bytes: encoded,
        mime: "image/png".to_string(),
    }))
}
