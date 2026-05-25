import { KeyRound } from 'lucide-react'
import type { AppCopy } from '../lib/appCopy'
import type { ActionProtocol } from '../lib/actionProtocol'
import type { ModelConfig } from '../lib/openAiTypes'

export type ModelPanelProps = {
  actionProtocol: ActionProtocol
  copy: AppCopy
  modelConfig: ModelConfig
  onActionProtocolChange: (value: ActionProtocol) => void
  onModelConfigChange: <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => void
  onStreamResponsesChange: (value: boolean) => void
  streamResponses: boolean
}

export function ModelPanel({
  actionProtocol,
  copy,
  modelConfig,
  onActionProtocolChange,
  onModelConfigChange,
  onStreamResponsesChange,
  streamResponses,
}: ModelPanelProps) {
  return (
    <>
      <div className="panel-title">
        <KeyRound size={18} />
        <h2>{copy.model}</h2>
      </div>
      <div className="model-box">
        <span>{modelConfig.model || copy.noModel}</span>
        <details className="model-details">
          <summary>{copy.modelSettings}</summary>
          <label>
            {copy.baseUrl}
            <input
              value={modelConfig.baseUrl}
              onChange={(event) => onModelConfigChange('baseUrl', event.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </label>
          <label>
            {copy.apiKey}
            <input
              value={modelConfig.apiKey}
              onChange={(event) => onModelConfigChange('apiKey', event.target.value)}
              placeholder="sk-..."
              type="password"
            />
          </label>
          <label>
            {copy.model}
            <input
              value={modelConfig.model}
              onChange={(event) => onModelConfigChange('model', event.target.value)}
              placeholder="vision-model"
            />
          </label>
          <label>
            {copy.actionProtocol}
            <select
              value={actionProtocol}
              onChange={(event) => onActionProtocolChange(event.target.value as ActionProtocol)}
            >
              <option value="webdroid_json">{copy.actionProtocolWebDroidJson}</option>
              <option value="open_autoglm_function">
                {copy.actionProtocolOpenAutoGlm}
              </option>
              <option value="mobilerun_xml">{copy.actionProtocolMobilerunXml}</option>
            </select>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={streamResponses}
              onChange={(event) => onStreamResponsesChange(event.target.checked)}
            />
            <span>{copy.streamModelResponses}</span>
          </label>
        </details>
      </div>
    </>
  )
}
