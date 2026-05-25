import type { DeviceState } from '../adapters/deviceTypes'

export const UNKNOWN_APP_NAME = 'Unknown'

export function createUnknownDeviceState(): DeviceState {
  return { app: UNKNOWN_APP_NAME }
}

export function formatDeviceState(state: DeviceState) {
  return [
    `Current app: ${state.app}`,
    state.packageName ? `Package: ${state.packageName}` : null,
    state.activity ? `Activity: ${state.activity}` : null,
    state.orientation ? `Orientation: ${state.orientation}` : null,
    state.keyboard ? `Keyboard: ${state.keyboard}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}
