import type { ComponentConfig, RenderConfig } from "../interface";
/**
 * Componente de Input de texto estándar
 */
export const TextInput: ComponentConfig = {
  baseClasses: [
    "w-full", "px-3", "py-2", "border-2", "border-gray-300", 
    "rounded-md", "text-sm", "font-inherit", "transition-all",
    "focus:outline-none", "focus:border-blue-500", "focus:ring-2", "focus:ring-blue-100"
  ],
  
  render: (config: RenderConfig) => {
    const input = document.createElement("input");
    input.type = config.type;
    input.id = config.fieldPath;
    input.name = config.fieldPath;
    input.classList.add(...(TextInput.baseClasses || []));

    if (config.properties?.placeholder) {
      input.placeholder = config.properties?.placeholder;
    }

    if (config.required) {
      input.required = true;
    }

    if (config.properties?.disabled) {
      input.disabled = true;
      input.classList.add("bg-gray-100", "cursor-not-allowed", "opacity-60");
    }

    if (config.properties?.min !== undefined) {
      input.min = String(config.properties.min);
    }

    if (config.properties?.max !== undefined) {
      input.max = String(config.properties.max);
    }

    if (config.value !== undefined) {
      input.value = String(config.value);
    }

    return input;
  },

  getValue: (element: HTMLElement) => {
    return (element as HTMLInputElement).value;
  },

  setValue: (element: HTMLElement, value: any) => {
    (element as HTMLInputElement).value = String(value);
  }
};
