# Feature: Wikilink CLI Converter (ContextUP)

Motivation:
Provide a small utility to convert Obsidian-style wikilinks [[Note|Alias]] into standard markdown links. Useful for exports and interoperability.

Change summary:
- Added scripts/convert-wikilinks.mjs: a small CLI that converts wikilinks in a markdown file to standard markdown links.

Test steps:
- Run: node scripts/convert-wikilinks.mjs path/to/file.md
- Verify wikilinks are converted.

Risk assessment:
- Low risk: only modifies files explicitly provided by the user. No infra/CI/deploy changes.
