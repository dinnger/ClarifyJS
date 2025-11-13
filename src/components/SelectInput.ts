import type { ComponentConfig, RenderConfig } from './types';

/**
 * Componente de Select (dropdown)
 */
export const SelectInput: ComponentConfig = {
  baseClasses: [
    "w-full", "px-3", "py-2", "border-2", "border-gray-300", 
    "rounded-md", "text-sm", "font-inherit", "transition-all",
    "focus:outline-none", "focus:border-blue-500", "focus:ring-2", "focus:ring-blue-100",
    "cursor-pointer"
  ],
  
  render: (config: RenderConfig) => {
    const select = document.createElement("select");
    select.id = config.fieldPath;
    select.name = config.fieldPath;
    select.classList.add(...(SelectInput.baseClasses || []));

    if (config.required) {
      select.required = true;
    }

    if (config.properties?.disabled) {
      select.disabled = true;
      select.classList.add("bg-gray-100", "cursor-not-allowed", "opacity-60");
    }

    if (config.properties?.options) {
      config.properties.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = String(opt.value);
        option.textContent = opt.label;
        select.appendChild(option);
      });
    }

    if (config.value !== undefined) {
      select.value = String(config.value);
    }else{
      (select as any).value = undefined;
    }


    return select;
  },

  getValue: (element: HTMLElement) => {
    return (element as HTMLSelectElement).value;
  },

  setValue: (element: HTMLElement, value: any) => {
    (element as HTMLSelectElement).value = String(value);
  }
};
