import type { DeviceScreenshot } from '../../adapters/deviceTypes'

export function compactScreenshotForMemory(screenshot: DeviceScreenshot): DeviceScreenshot {
  const modelDataUrl = screenshot.modelDataUrl ?? (screenshot.modelScreen ? screenshot.dataUrl : undefined)

  if (modelDataUrl && screenshot.modelScreen) {
    return {
      dataUrl: modelDataUrl,
      screen: screenshot.screen,
      modelScreen: screenshot.modelScreen,
      ...(screenshot.modelGridDivisions !== undefined
        ? { modelGridDivisions: screenshot.modelGridDivisions }
        : {}),
    }
  }

  return {
    dataUrl: screenshot.dataUrl,
    screen: screenshot.screen,
  }
}
