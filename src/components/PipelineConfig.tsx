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
  codegenModel: string;
  imagegenModel: string;
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

export default function PipelineConfig({ config, onChange, availableModels }: Props) {
  if (!availableModels) {
    return <div className="bg-gray-900 rounded-xl p-6 animate-pulse h-48" />;
  }

  const toggleVision = (id: string) => {
    const models = config.visionModels.includes(id)
      ? config.visionModels.filter(m => m !== id)
      : [...config.visionModels, id];
    onChange({ ...config, visionModels: models });
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Vision Models</h3>
        <div className="space-y-2">
          {availableModels.vision.map(m => (
            <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800 ${!m.available ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={config.visionModels.includes(m.id)}
                onChange={() => toggleVision(m.id)}
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

      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Code Generation</h3>
        <div className="space-y-2">
          {availableModels.codegen.map(m => (
            <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800 ${!m.available ? 'opacity-50' : ''}`}>
              <input
                type="radio"
                name="codegen"
                checked={config.codegenModel === m.id}
                onChange={() => onChange({ ...config, codegenModel: m.id })}
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

      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Image Generation</h3>
        <div className="space-y-2">
          {availableModels.imagegen.map(m => (
            <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800 ${!m.available ? 'opacity-50' : ''}`}>
              <input
                type="radio"
                name="imagegen"
                checked={config.imagegenModel === m.id}
                onChange={() => onChange({ ...config, imagegenModel: m.id })}
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
    </div>
  );
}
