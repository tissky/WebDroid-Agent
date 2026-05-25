import {
  Grid2x2,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  SquareTerminal,
  Stethoscope,
  Usb,
} from 'lucide-react'
import type { AppCopy } from '../lib/appCopy'
import type { ActionProtocol } from '../lib/actionProtocol'
import type { ModelConfig } from '../lib/openAiTypes'
import { ConfigRail } from './ConfigRail'
import { CONFIG_TARGET_IDS, type ConfigTarget } from './configTargets'
import {
  DevicePanel,
  type DevicePanelActions,
  type DevicePanelOptions,
  type DevicePanelState,
} from './DevicePanel'
import { ModelPanel } from './ModelPanel'

export type ConfigSidebarProps = {
  copy: AppCopy
  devicePanelActions: DevicePanelActions
  devicePanelOptions: DevicePanelOptions
  devicePanelState: DevicePanelState
  isOpen: boolean
  modelConfig: ModelConfig
  actionProtocol: ActionProtocol
  onActionProtocolChange: (value: ActionProtocol) => void
  onModelConfigChange: <Key extends keyof ModelConfig>(
    key: Key,
    value: ModelConfig[Key],
  ) => void
  onSelectTarget: (target: ConfigTarget) => void
  onStreamResponsesChange: (value: boolean) => void
  onToggleOpen: () => void
  streamResponses: boolean
}

export function ConfigSidebar({
  copy,
  devicePanelActions,
  devicePanelOptions,
  devicePanelState,
  isOpen,
  modelConfig,
  actionProtocol,
  onActionProtocolChange,
  onModelConfigChange,
  onSelectTarget,
  onStreamResponsesChange,
  onToggleOpen,
  streamResponses,
}: ConfigSidebarProps) {
  return (
    <aside
      aria-label={copy.configurationPanel}
      className={
        isOpen
          ? 'panel config-panel config-panel-expanded'
          : 'panel config-panel config-panel-collapsed'
      }
    >
      <div className="config-sidebar-header">
        {isOpen ? <span className="config-sidebar-title">{copy.configurationPanel}</span> : null}
        <button
          type="button"
          className="icon-button config-sidebar-toggle"
          aria-expanded={isOpen}
          aria-label={isOpen ? copy.collapseConfigurationPanel : copy.expandConfigurationPanel}
          title={isOpen ? copy.collapseConfigurationPanel : copy.expandConfigurationPanel}
          onClick={onToggleOpen}
        >
          {isOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>
      </div>

      {isOpen ? (
        <div className="config-panel-content">
          <section
            className="config-panel-group"
            id={CONFIG_TARGET_IDS.model}
            aria-label={copy.model}
          >
            <ModelPanel
              copy={copy}
              actionProtocol={actionProtocol}
              modelConfig={modelConfig}
              onActionProtocolChange={onActionProtocolChange}
              onModelConfigChange={onModelConfigChange}
              onStreamResponsesChange={onStreamResponsesChange}
              streamResponses={streamResponses}
            />
          </section>

          <DevicePanel
            actions={devicePanelActions}
            copy={copy}
            options={devicePanelOptions}
            sectionIds={{
              device: CONFIG_TARGET_IDS.device,
              deviceOptions: CONFIG_TARGET_IDS.options,
              directCommands: CONFIG_TARGET_IDS.commands,
              doctor: CONFIG_TARGET_IDS.doctor,
              installedApps: CONFIG_TARGET_IDS.apps,
            }}
            state={devicePanelState}
          />
        </div>
      ) : (
        <ConfigRail
          copy={copy}
          items={[
            { icon: KeyRound, label: copy.model, target: 'model' },
            { icon: Usb, label: copy.device, target: 'device' },
            { icon: Grid2x2, label: copy.installedApps, target: 'apps' },
            { icon: SquareTerminal, label: copy.directCommands, target: 'commands' },
            { icon: Stethoscope, label: copy.runDoctor, target: 'doctor' },
            { icon: Settings2, label: copy.deviceOptions, target: 'options' },
          ]}
          onSelect={onSelectTarget}
        />
      )}
    </aside>
  )
}
