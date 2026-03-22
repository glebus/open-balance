// Ambient types for Google Picker API (loaded via gapi script)

declare namespace google.picker {
  class PickerBuilder {
    constructor()
    addView(view: DocsView): PickerBuilder
    setOAuthToken(token: string): PickerBuilder
    setDeveloperKey(key: string): PickerBuilder
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder
    build(): Picker
  }

  class DocsView {
    constructor(viewId?: ViewId)
    setMimeTypes(mimeTypes: string): DocsView
  }

  interface Picker {
    setVisible(visible: boolean): void
    dispose(): void
  }

  interface ResponseObject {
    action: string
    docs?: Document[]
  }

  interface Document {
    id: string
    name: string
    mimeType: string
    url: string
  }

  enum Action {
    PICKED = 'picked',
    CANCEL = 'cancel',
  }

  enum ViewId {
    DOCS = 'all',
    SPREADSHEETS = 'spreadsheets',
  }
}

interface Window {
  gapi?: {
    load(api: string, callback: () => void): void
    client: {
      init(config: Record<string, unknown>): Promise<void>
    }
  }
}
