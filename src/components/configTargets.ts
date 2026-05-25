export type ConfigTarget = 'model' | 'device' | 'apps' | 'commands' | 'doctor' | 'options'

export const CONFIG_TARGET_IDS: Record<ConfigTarget, string> = {
  apps: 'config-installed-apps',
  commands: 'config-direct-commands',
  device: 'config-device',
  doctor: 'config-doctor',
  model: 'config-model',
  options: 'config-device-options',
}
