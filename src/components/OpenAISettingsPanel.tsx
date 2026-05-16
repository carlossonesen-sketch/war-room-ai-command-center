import { useState } from "react";
import type { OpenAISettings } from "../types";

interface OpenAISettingsPanelProps {
  settings: OpenAISettings;
  onUpdateSettings: (updates: Partial<OpenAISettings>) => void;
}

export function OpenAISettingsPanel({ settings, onUpdateSettings }: OpenAISettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <section className="openai-settings" aria-label="OpenAI settings">
      <div>
        <h2>OpenAI Lane</h2>
        <p>Optional real responses for the four individual AI panels</p>
      </div>

      <div className="openai-settings__key">
        <label>
          <span>OpenAI API Key</span>
          <input
            type={showApiKey ? "text" : "password"}
            value={settings.apiKey}
            placeholder="sk-..."
            autoComplete="off"
            onChange={(event) => onUpdateSettings({ apiKey: event.target.value })}
          />
        </label>
        <button type="button" onClick={() => setShowApiKey((current) => !current)}>
          {showApiKey ? "Hide" : "Show"}
        </button>
      </div>

      <label>
        <span>Model</span>
        <input
          type="text"
          value={settings.model}
          placeholder="gpt-4o-mini"
          onChange={(event) => onUpdateSettings({ model: event.target.value })}
        />
      </label>

      <label className="openai-settings__toggle">
        <input
          type="checkbox"
          checked={settings.useRealAi}
          onChange={(event) => onUpdateSettings({ useRealAi: event.target.checked })}
        />
        <span>Use real AI responses</span>
      </label>
    </section>
  );
}
