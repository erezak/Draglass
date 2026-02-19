import { useEffect } from 'react'

export function useSurrealTheme(intensity: 'off' | 'subtle' | 'full') {
  useEffect(() => {
    const root = document.documentElement
    
    // Enable surrealism when intensity is not 'off'
    const enabled = intensity !== 'off'
    root.dataset.surrealEnabled = enabled ? 'true' : 'false'
    root.dataset.surrealIntensity = intensity
  }, [intensity])
}
