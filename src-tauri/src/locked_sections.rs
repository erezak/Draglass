/// Locked Sections parser for Markdown.
/// Mirrors the TypeScript implementation in src/lockedSections.ts.

pub struct HeadingSection {
    #[allow(dead_code)] // Used in tests
    pub level: usize,
    pub start_line: usize, // 1-based
    pub end_line: usize,   // 1-based, inclusive
    pub is_explicitly_locked: bool,
    pub is_locked_by_parent: bool,
}

impl HeadingSection {
    pub fn is_locked(&self) -> bool {
        self.is_explicitly_locked || self.is_locked_by_parent
    }
}

/// Range of lines that are locked body content (excludes the heading line itself).
/// These lines should be filtered from link extraction when vault is locked.
#[derive(Debug, Clone)]
pub struct LockedBodyRange {
    pub start_line: usize, // 1-based, inclusive
    pub end_line: usize,   // 1-based, inclusive
}

/// Parse a Markdown heading line, returning (level, title_text, is_locked).
/// Only handles ATX headings (# style).
fn parse_heading_line(line: &str) -> Option<(usize, String, bool)> {
    let trimmed = line.trim_start();
    if !trimmed.starts_with('#') {
        return None;
    }

    let mut level = 0;
    for ch in trimmed.chars() {
        if ch == '#' {
            level += 1;
        } else {
            break;
        }
    }

    if level == 0 || level > 6 {
        return None;
    }

    // Must have space after #
    let rest = &trimmed[level..];
    if !rest.starts_with(char::is_whitespace) {
        return None;
    }

    let title_part = rest.trim();

    // Check for {locked} attribute
    let (title_text, is_locked) = if let Some(idx) = title_part.find("{locked}") {
        let before = title_part[..idx].trim();
        let after = title_part[idx + 8..].trim();
        let combined = format!("{} {}", before, after).trim().to_string();
        (combined, true)
    } else {
        (title_part.to_string(), false)
    };

    Some((level, title_text, is_locked))
}

/// Parse all heading sections from Markdown text.
pub fn parse_heading_sections(text: &str) -> Vec<HeadingSection> {
    let lines: Vec<&str> = text.lines().collect();
    let line_count = lines.len();

    // First pass: collect raw headings
    struct RawHeading {
        level: usize,
        line: usize, // 1-based
        is_locked: bool,
    }

    let mut headings: Vec<RawHeading> = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        if let Some((level, _, is_locked)) = parse_heading_line(line) {
            headings.push(RawHeading {
                level,
                line: i + 1, // 1-based
                is_locked,
            });
        }
    }

    // Second pass: compute sections with end lines and parent locking
    let mut sections: Vec<HeadingSection> = Vec::new();

    for (i, h) in headings.iter().enumerate() {
        // Find end line: next heading of same or higher level, or end of file
        let end_line = if i + 1 < headings.len() {
            // Find next heading with level <= this one
            let mut end = line_count;
            for j in (i + 1)..headings.len() {
                if headings[j].level <= h.level {
                    end = headings[j].line - 1;
                    break;
                }
            }
            end
        } else {
            line_count
        };

        // Check parent locking
        let is_locked_by_parent = headings[..i]
            .iter()
            .rev()
            .take_while(|prev| prev.level < h.level)
            .any(|prev| prev.is_locked);

        sections.push(HeadingSection {
            level: h.level,
            start_line: h.line,
            end_line,
            is_explicitly_locked: h.is_locked,
            is_locked_by_parent,
        });
    }

    sections
}

/// Get locked body ranges (excludes heading lines themselves).
/// These ranges should be filtered from link extraction when vault is locked.
pub fn get_locked_body_ranges(sections: &[HeadingSection]) -> Vec<LockedBodyRange> {
    sections
        .iter()
        .filter(|s| s.is_locked())
        .filter_map(|s| {
            let body_start = s.start_line + 1;
            if body_start <= s.end_line {
                Some(LockedBodyRange {
                    start_line: body_start,
                    end_line: s.end_line,
                })
            } else {
                None
            }
        })
        .collect()
}

/// Check if a line number (1-based) falls within any locked body range.
pub fn is_line_in_locked_range(line: usize, ranges: &[LockedBodyRange]) -> bool {
    ranges
        .iter()
        .any(|r| line >= r.start_line && line <= r.end_line)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_heading_line_basic() {
        let (level, title, is_locked) = parse_heading_line("## Hello World").unwrap();
        assert_eq!(level, 2);
        assert_eq!(title, "Hello World");
        assert!(!is_locked);
    }

    #[test]
    fn test_parse_heading_line_locked() {
        let (level, title, is_locked) = parse_heading_line("## {locked} Secret").unwrap();
        assert_eq!(level, 2);
        assert_eq!(title, "Secret");
        assert!(is_locked);

        let (level2, title2, is_locked2) = parse_heading_line("# Title {locked}").unwrap();
        assert_eq!(level2, 1);
        assert_eq!(title2, "Title");
        assert!(is_locked2);
    }

    #[test]
    fn test_parse_heading_line_not_heading() {
        assert!(parse_heading_line("Not a heading").is_none());
        assert!(parse_heading_line("#NoSpace").is_none());
        assert!(parse_heading_line("####### Too many").is_none());
    }

    #[test]
    fn test_parse_heading_sections() {
        let text = "# Top\nSome text\n## Child {locked}\nSecret content\n### Grandchild\nMore secret\n## Another\nPublic";
        let sections = parse_heading_sections(text);

        assert_eq!(sections.len(), 4);

        // # Top - not locked
        assert_eq!(sections[0].level, 1);
        assert!(!sections[0].is_locked());

        // ## Child {locked} - explicitly locked
        assert_eq!(sections[1].level, 2);
        assert!(sections[1].is_explicitly_locked);
        assert!(sections[1].is_locked());

        // ### Grandchild - locked by parent
        assert_eq!(sections[2].level, 3);
        assert!(!sections[2].is_explicitly_locked);
        assert!(sections[2].is_locked_by_parent);
        assert!(sections[2].is_locked());

        // ## Another - not locked
        assert_eq!(sections[3].level, 2);
        assert!(!sections[3].is_locked());
    }

    #[test]
    fn test_get_locked_body_ranges() {
        let text = "# Top\nPublic\n## Secret {locked}\nHidden1\nHidden2\n## Public again\nSafe";
        let sections = parse_heading_sections(text);
        let ranges = get_locked_body_ranges(&sections);

        assert_eq!(ranges.len(), 1);
        assert_eq!(ranges[0].start_line, 4); // Line after "## Secret {locked}"
        assert_eq!(ranges[0].end_line, 5);   // Hidden1, Hidden2
    }
}
