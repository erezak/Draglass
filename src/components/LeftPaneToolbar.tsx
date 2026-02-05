type LeftPaneToolbarProps = {
  onNewNote: () => void
  onNewFolder: () => void
  actionsDisabled?: boolean
}

export function LeftPaneToolbar({
  onNewNote,
  onNewFolder,
  actionsDisabled = false,
}: LeftPaneToolbarProps) {
  return (
    <div className="leftPaneToolbar" aria-label="Files toolbar">
      <div className="leftPaneActions" aria-label="File actions">
        <button
          type="button"
          className="leftPaneActionButton"
          onClick={onNewNote}
          disabled={actionsDisabled}
          aria-label="New note"
          title="New note"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="leftPaneActionIcon" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 4h7l4 4v12H7z"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              d="M12 11v6m-3-3h6"
            />
          </svg>
        </button>
        <button
          type="button"
          className="leftPaneActionButton"
          onClick={onNewFolder}
          disabled={actionsDisabled}
          aria-label="New folder"
          title="New folder"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="leftPaneActionIcon" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 7h6l2 2h8v8a2 2 0 0 1-2 2H4z"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              d="M12 12v5m-2.5-2.5h5"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default LeftPaneToolbar
