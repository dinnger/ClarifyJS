import type { ComponentConfig, RenderConfig } from "../interface";

/**
 * Componente de Checkbox personalizado
 */
export const CheckboxInput: ComponentConfig = {
  baseClasses: [
    "w-[18px]", "h-[18px]", "cursor-pointer", "rounded", 
    "border-red-300", "text-blue-600", 
    "focus:ring-2", "focus:ring-blue-500"
  ],
  
  render: (config: RenderConfig) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('relative', 'flex', 'items-center','w-full');

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = config.fieldPath;
    input.name = config.fieldPath;
    input.classList.add(...(CheckboxInput.baseClasses || []));
    
    if (!config.label){
      wrapper.classList.add('m-auto');
    }

    if (config.required) {
      input.required = true;
    }

    if (config.properties?.disabled) {
      input.disabled = true;
      input.classList.add("cursor-not-allowed", "opacity-60");
    }

    if (config.value !== undefined) {
      input.checked = Boolean(config.value);
    }
   
    wrapper.appendChild(input);

     if (config.properties?.placeholder) {
      const textLabel = document.createElement('span');
      textLabel.classList.add('text-sm', 'font-medium', 'text-gray-700', 'group-hover:text-blue-600', 'transition-colors','ml-2');
      textLabel.textContent = config.properties.placeholder ;
      wrapper.appendChild(textLabel);
    }


    return wrapper;
  },

  getValue: (element: HTMLElement) => {
    return (element as HTMLInputElement).checked;
  },

  setValue: (element: HTMLElement, value: any) => {
    (element as HTMLInputElement).checked = Boolean(value);
  }
};
