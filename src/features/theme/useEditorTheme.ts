import { useEffect } from 'react'

export function useEditorTheme(theme: string) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
  }, [theme])
}
