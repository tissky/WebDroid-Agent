import { KeyRound } from 'lucide-react'
import type { AppCopy } from '../lib/appCopy'
import type { ModelConfig } from '../lib/openAiTypes'

export type ModelPanelProps = {
  copy: AppCopy
  modelConfig: ModelConfig
  onModelConfigChange: <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => void
  onStreamResponsesChange: (value: boolean) => void
  streamResponses: boolean
}

export function ModelPanel({
  copy,
  modelConfig,
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
