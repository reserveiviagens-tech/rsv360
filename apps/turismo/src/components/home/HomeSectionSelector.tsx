'use client';

import React from 'react';
import { HOME_SECTIONS, type HomeSectionId } from '../../lib/home-sections';

type Props = {
  value: HomeSectionId[];
  onChange: (next: HomeSectionId[]) => void;
  disabled?: boolean;
  label?: string;
};

/** Multi-seleção: um item pode aparecer em várias seções da home S1. */
export function HomeSectionSelector({
  value,
  onChange,
  disabled = false,
  label = 'Seções da home (www)',
}: Props) {
  const toggle = (id: HomeSectionId) => {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <fieldset className="space-y-2" data-testid="home-section-selector">
      <legend className="text-sm font-medium text-gray-700">{label}</legend>
      <p className="text-xs text-gray-500">
        Marque onde este item deve aparecer na landing. Pode selecionar mais de uma seção.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {HOME_SECTIONS.map((section) => {
          const checked = value.includes(section.id);
          return (
            <label
              key={section.id}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer ${
                checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(section.id)}
                data-testid={`home-section-${section.id}`}
              />
              <span>
                <span className="font-medium text-gray-900 block">{section.label}</span>
                <span className="text-xs text-gray-500">{section.defaultPath}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
