import { describe, expect, it } from 'vitest'
import { modelScreenshotView } from './coordinates'
import { compactScreenshotForMemory } from './retention'

describe('compactScreenshotForMemory', () => {
  it('keeps the model image and native screen while dropping capture bytes and duplicate raw image', () => {
    const compacted = compactScreenshotForMemory({
      bytes: new Uint8Array([1, 2, 3]),
      dataUrl: 'data:image/png;base64,raw',
      modelDataUrl: 'data:image/png;base64,model',
      modelGridDivisions: 10,
      modelScreen: { width: 540, height: 1200 },
      screen: { width: 1080, height: 2400 },
    })

    expect(compacted).toEqual({
      dataUrl: 'data:image/png;base64,model',
      modelGridDivisions: 10,
      modelScreen: { width: 540, height: 1200 },
      screen: { width: 1080, height: 2400 },
    })
    expect(compacted.bytes).toBeUndefined()
    expect(compacted.modelDataUrl).toBeUndefined()
    expect(modelScreenshotView(compacted)).toEqual({
      dataUrl: 'data:image/png;base64,model',
      screen: { width: 540, height: 1200 },
    })
    expect(compactScreenshotForMemory(compacted)).toEqual(compacted)
  })
})
