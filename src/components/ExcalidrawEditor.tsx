import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import {
  Excalidraw,
  getCommonBounds,
  getNonDeletedElements,
  serializeAsJSON,
  zoomToFitBounds,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

import {
  buildExcalidrawSource,
  parseExcalidrawSource,
  type ExcalidrawSourceFormat,
} from '../excalidrawFormat'

type ExcalidrawEditorProps = {
  /** Raw file content (JSON or Obsidian markdown wrapper) */
  content: string
  /** App color theme */
  theme?: 'dark' | 'light'
  /** Persist changes to note text */
  onChange: (next: string) => void
}

export function ExcalidrawEditor({ content, theme = 'dark', onChange }: ExcalidrawEditorProps) {
  type ExcalidrawComponentProps = ComponentProps<typeof Excalidraw>
  type ExcalidrawApi = Parameters<NonNullable<ExcalidrawComponentProps['excalidrawAPI']>>[0]
  type ExcalidrawUpdateScene = Parameters<ExcalidrawApi['updateScene']>[0]
  const initialContentRef = useRef(content)
  const lastSerializedRef = useRef(content)
  const pendingLocalChangeRef = useRef<string | null>(null)
  const apiRef = useRef<ExcalidrawApi | null>(null)
  const [apiReady, setApiReady] = useState(false)

  const parseResult = useMemo(
    () => parseExcalidrawSource(initialContentRef.current),
    [],
  )

  const formatRef = useRef<ExcalidrawSourceFormat>(
    parseResult.ok ? parseResult.format : { kind: 'json' },
  )

  useEffect(() => {
    lastSerializedRef.current = content
  }, [content])

  type ExcalidrawOnChangeArgs = Parameters<NonNullable<ExcalidrawComponentProps['onChange']>>

  const handleChange: NonNullable<ExcalidrawComponentProps['onChange']> = useCallback(
    (
      elements: ExcalidrawOnChangeArgs[0],
      appState: ExcalidrawOnChangeArgs[1],
      files: ExcalidrawOnChangeArgs[2],
    ) => {
      const json = serializeAsJSON(elements, appState, files, 'local')
      const next = buildExcalidrawSource(json, formatRef.current)
      if (next === lastSerializedRef.current) return
      lastSerializedRef.current = next
      pendingLocalChangeRef.current = next
      onChange(next)
    },
    [onChange],
  )

  const normalizeSceneData = useCallback((data: Record<string, unknown>) => {
    const elements = Array.isArray(data.elements) ? data.elements : []
    const appState = data.appState && typeof data.appState === 'object' ? data.appState : {}
    const files = data.files && typeof data.files === 'object' ? data.files : {}
    return { elements, appState, files }
  }, [])

  const fitToContent = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    const elements = getNonDeletedElements(api.getSceneElements())
    if (elements.length === 0) return

    const appState = api.getAppState()
    const { appState: nextAppState } = zoomToFitBounds({
      bounds: getCommonBounds(elements) as never,
      appState,
      fitToViewport: true,
      viewportZoomFactor: 0.9,
    })

    api.updateScene({ appState: { ...nextAppState, isLoading: false } })
  }, [])

  const handleExcalidrawApi = useCallback<NonNullable<ExcalidrawComponentProps['excalidrawAPI']>>(
    (api) => {
      apiRef.current = api
      setApiReady(true)
    },
    [],
  )

  useEffect(() => {
    if (!apiReady) return
    fitToContent()

    let resizeTimer: number | null = null
    const onResize = () => {
      if (resizeTimer != null) window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        fitToContent()
      }, 120)
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (resizeTimer != null) window.clearTimeout(resizeTimer)
    }
  }, [apiReady, fitToContent])

  useEffect(() => {
    if (!apiReady) return
    if (pendingLocalChangeRef.current === content) {
      pendingLocalChangeRef.current = null
      return
    }
    const frame = window.requestAnimationFrame(() => {
      fitToContent()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [apiReady, content, fitToContent])

  useEffect(() => {
    if (!apiReady) return
    if (content === lastSerializedRef.current) return

    const parsed = parseExcalidrawSource(content)
    if (!parsed.ok) return

    pendingLocalChangeRef.current = null

    formatRef.current = parsed.format
    const { elements, appState, files } = normalizeSceneData(parsed.data)
    const normalizedAppState = {
      ...(appState as ExcalidrawUpdateScene['appState']),
      name: (appState as { name?: string | null }).name ?? null,
      isLoading: false,
      theme,
    } as ExcalidrawUpdateScene['appState']

    const nextScene: ExcalidrawUpdateScene = {
      elements: elements as ExcalidrawUpdateScene['elements'],
      appState: normalizedAppState,
    }

    apiRef.current?.updateScene(nextScene)

    const fileValues = Object.values(files)
    if (fileValues.length > 0) {
      apiRef.current?.addFiles(fileValues as Parameters<ExcalidrawApi['addFiles']>[0])
    }
    requestAnimationFrame(() => fitToContent())
  }, [apiReady, content, fitToContent, normalizeSceneData, theme])

  if (!parseResult.ok) {
    return <div className="panelEmpty">{parseResult.error}</div>
  }

  return (
    <div className="excalidrawEditor">
      <Excalidraw
        initialData={parseResult.data as ExcalidrawComponentProps['initialData']}
        theme={theme}
        onChange={handleChange}
        excalidrawAPI={handleExcalidrawApi}
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
      />
    </div>
  )
}

export default ExcalidrawEditor
