'use client';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  available: boolean;
}

interface AvailableModels {
  vision: ModelInfo[];
  codegen: ModelInfo[];
  imagegen: ModelInfo[];
}

interface Config {
  visionModels: string[];
  codegenModels: string[];
  imagegenModels: string[];
}

interface Props {
  config: Config;
  onChange: (config: Config) => void;
  availableModels: AvailableModels | null;
}

function StatusDot({ available }: { available: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`} />
  );
}

function ModelCheckboxGroup({
  title,
  models,
  selected,
  onToggle,
}: {
  title: string;
  models: ModelInfo[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {models.map(m => (
          <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800 ${!m.available ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => onToggle(m.id)}
              disabled={!m.available}
              className="accent-blue-500"
            />
            <StatusDot available={m.available} />
            <span className="text-sm">{m.name}</span>
            <span className="text-xs text-gray-500">{m.provider}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function PipelineConfig({ config, onChange, availableModels }: Props) {
  if (!availableModels) {
    return <div className="bg-gray-900 rounded-xl p-6 animate-pulse h-48" />;
  }

  const toggle = (field: 'visionModels' | 'codegenModels' | 'imagegenModels', id: string) => {
    const current = config[field];
    const updated = current.includes(id) ? current.filter(m => m !== id) : [...current, id];
    onChange({ ...config, [field]: updated });
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-6">
      <ModelCheckboxGroup
        title="Vision Models"
        models={availableModels.vision}
        selected={config.visionModels}
        onToggle={(id) => toggle('visionModels', id)}
      />
      <ModelCheckboxGroup
        title="Code Generation"
        models={availableModels.codegen}
        selected={config.codegenModels}
        onToggle={(id) => toggle('codegenModels', id)}
      />
      <ModelCheckboxGroup
        title="Image Generation"
        models={availableModels.imagegen}
        selected={config.imagegenModels}
        onToggle={(id) => toggle('imagegenModels', id)}
      />
    </div>
  );
}
