# Mermaid sample

This note is for manual testing of Live Preview diagram rendering.

```mermaid
flowchart TD
  A[Start] --> B{Render diagrams?}
  B -- Yes --> C[Show SVG]
  B -- No --> D[Show raw markdown]
  C --> E[Edit with cursor]
  D --> E
```

```mermaid
sequenceDiagram
  participant User
  participant Editor
  User->>Editor: Toggle Live Preview
  Editor->>Editor: Render visible diagrams
  User->>Editor: Switch theme
  Editor-->>User: Re-render with theme
```

```mermaid
flowchart LR
  A[Broken syntax example
  B -->
```

Use this broken block to confirm error rendering.
