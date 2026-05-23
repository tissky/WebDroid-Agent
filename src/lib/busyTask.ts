export type BusyTaskId =
  | 'capture-screen'
  | 'connect-device'
  | 'direct-command'
  | 'disconnect-device'
  | 'enable-adb-keyboard'
  | 'execute-action'
  | 'install-adb-keyboard'
  | 'plan-next-step'
  | 'run-agent'
  | 'run-doctor'

export type BusyTask = {
  id: BusyTaskId
}
