import { useEffect, useRef } from 'react'

/** Subscribes to an SSE `scan` event stream, falling back to polling if EventSource
 * is unavailable (matches the old card-view.html kiosk behavior). */
export function useSSE(url: string, onScan: (data: unknown) => void, pollFallback: () => void) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      const interval = setInterval(pollFallback, 3000)
      return () => clearInterval(interval)
    }

    const source = new EventSource(url)
    source.addEventListener('scan', (event) => {
      try {
        onScanRef.current(JSON.parse((event as MessageEvent).data))
      } catch {
        // ignore malformed payloads
      }
    })
    source.onerror = () => {
      // EventSource auto-reconnects; nothing to do here.
    }
    return () => source.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
}
