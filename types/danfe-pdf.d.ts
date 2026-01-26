declare module 'danfe-pdf' {
  interface DanfeOptions {
    orientation?: 'portrait' | 'landscape'
    size?: string
    margins?: {
      top?: number
      bottom?: number
      left?: number
      right?: number
    }
  }

  export default class Danfe {
    constructor(xml: string, options?: DanfeOptions)
    generatePDF(): Promise<Buffer>
  }
}
