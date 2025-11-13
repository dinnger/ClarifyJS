import type { ComponentConfig, RenderConfig } from "../interface";

/**
 * Componente de Textarea
 */
export const TextArea: ComponentConfig = {
  baseClasses: [
    "w-full", "px-3", "py-2", "border-2", "border-gray-300", 
    "rounded-md", "text-sm", "font-inherit", "transition-all",
    "focus:outline-none", "focus:border-blue-500", "focus:ring-2", "focus:ring-blue-100",
    "min-h-[100px]", "resize-y"
  ],
  
  render: (config: RenderConfig) => {
    const textarea = document.createElement("textarea");
    textarea.id = config.fieldPath;
    textarea.name = config.fieldPath;
    textarea.classList.add(...(TextArea.baseClasses || []));

    if (config.properties?.placeholder) {
      textarea.placeholder = config.properties?.placeholder;
    }

    if (config.required) {
      textarea.required = true;
    }

    if (config.properties?.disabled) {
      textarea.disabled = true;
      textarea.classList.add("bg-gray-100", "cursor-not-allowed", "opacity-60");
    }

    if (config.value !== undefined) {
      textarea.value = String(config.value);
    }

    return textarea;
  },

  getValue: (element: HTMLElement) => {
    return (element as HTMLTextAreaElement).value;
  },

  setValue: (element: HTMLElement, value: any) => {
    (element as HTMLTextAreaElement).value = String(value);
  }
};
