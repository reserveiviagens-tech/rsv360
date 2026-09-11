'use client';

/** Mirrors server IDIOMAS_CATALOG / summarizeIdiomas (turismo does not import server utils). */
export const IDIOMAS_CATALOG_CLIENT = [
  'Português',
  'English',
  'Español',
  'Français',
  'Italiano',
  'Deutsch',
  '日本語',
  '中文',
  '한국어',
  'العربية',
  'Русский',
  'Nederlands',
] as const;

export const IDIOMAS_MAX_CLIENT = 8;

/** Card preview — mirrors server summarizeIdiomas. */
export function summarizeIdiomasClient(idiomas: string[] | null | undefined): string {
  const list = Array.isArray(idiomas) && idiomas.length > 0 ? idiomas : ['Português'];
  if (list.length === 1 && list[0]?.toLowerCase() === 'português') {
    return 'Português';
  }
  return `${list.length} idiomas`;
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export function IdiomasEditor({ value, onChange }: Props) {
  const selected = new Set(value.map((v) => v.toLowerCase()));
  const atMax = value.length >= IDIOMAS_MAX_CLIENT;

  function toggle(label: string) {
    const key = label.toLowerCase();
    const isOn = selected.has(key);
    if (isOn) {
      const next = value.filter((v) => v.toLowerCase() !== key);
      onChange(next.length ? next : ['Português']);
      return;
    }
    if (atMax) return;
    onChange([...value, label]);
  }

  return (
    <div>
      <PanelTitle
        title="Idiomas"
        hint={`Selecione até ${IDIOMAS_MAX_CLIENT} idiomas que você fala com hóspedes.`}
      />
      <ul className="space-y-2">
        {IDIOMAS_CATALOG_CLIENT.map((label) => {
          const checked = selected.has(label.toLowerCase());
          const disabled = !checked && atMax;
          return (
            <li key={label}>
              <label
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm ${
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${checked ? 'border-slate-900' : 'border-slate-200'}`}
              >
                <input
                  type="checkbox"
                  className="shrink-0"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(label)}
                />
                <span>{label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        {value.length}/{IDIOMAS_MAX_CLIENT} selecionados. Hóspedes podem ver traduções
        automáticas de outros campos.
      </p>
    </div>
  );
}
