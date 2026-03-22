import { useCallback, useRef } from 'react'

const PICKER_SCRIPT = 'https://apis.google.com/js/api.js'

export function useGooglePicker(
  accessToken: string,
  apiKey: string,
  onPicked: (id: string, name: string) => void,
) {
  const scriptLoaded = useRef(false)

  const loadScript = useCallback((): Promise<void> => {
    if (scriptLoaded.current && window.gapi) return Promise.resolve()

    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${PICKER_SCRIPT}"]`)) {
        // Script tag exists but may still be loading
        const check = () => {
          if (window.gapi) {
            scriptLoaded.current = true
            resolve()
          } else {
            setTimeout(check, 100)
          }
        }
        check()
        return
      }

      const script = document.createElement('script')
      script.src = PICKER_SCRIPT
      script.onload = () => {
        scriptLoaded.current = true
        resolve()
      }
      script.onerror = () => reject(new Error('Failed to load Google Picker'))
      document.body.appendChild(script)
    })
  }, [])

  const openPicker = useCallback(async () => {
    await loadScript()

    return new Promise<void>((resolve, reject) => {
      window.gapi!.load('picker', () => {
        try {
          const view = new google.picker.DocsView()
          view.setMimeTypes('application/vnd.google-apps.spreadsheet')

          const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setDeveloperKey(apiKey)
            .setCallback((data: google.picker.ResponseObject) => {
              if (data.action === 'picked' && data.docs?.[0]) {
                onPicked(data.docs[0].id, data.docs[0].name)
              }
              resolve()
            })
            .build()

          picker.setVisible(true)
        } catch (err) {
          reject(err)
        }
      })
    })
  }, [accessToken, apiKey, onPicked, loadScript])

  return openPicker
}
