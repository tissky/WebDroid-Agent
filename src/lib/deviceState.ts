import type { DeviceState } from '../adapters/deviceTypes'

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
