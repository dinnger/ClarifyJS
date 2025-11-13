import type { ComponentConfig } from "./components";

/**
 * Componente Toggle Switch personalizado para campos booleanos
 */
export const ToggleSwitch: ComponentConfig = {
  render: (config) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('flex', 'items-center', 'gap-3');

    // Input checkbox oculto
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = config.fieldPath;
    input.name = config.fieldPath;
    input.classList.add('peer', 'sr-only');

    if (config.required) {
      input.required = true;
    }

    if (config.value !== undefined) {
      input.checked = Boolean(config.value);
    }

    // Toggle visual
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.classList.add(
      'relative', 'inline-flex', 'h-6', 'w-11', 'items-center', 
      'rounded-full', 'transition-colors', 'focus:outline-none', 
      'focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-2'
    );
    toggle.classList.add(input.checked ? 'bg-blue-600' : 'bg-gray-300');

    // Circle slider
    const circle = document.createElement('span');
    circle.classList.add(
      'inline-block', 'h-4', 'w-4', 'transform', 'rounded-full',
      'bg-white', 'transition-transform'
    );
    circle.classList.add(input.checked ? 'translate-x-6' : 'translate-x-1');

    toggle.appendChild(circle);

    // Label para el estado
    const statusLabel = document.createElement('span');
    statusLabel.classList.add('text-sm', 'font-medium', 'text-gray-700');
    statusLabel.textContent = input.checked ? 'Activado' : 'Desactivado';

    // Toggle handler
    toggle.addEventListener('click', () => {
      input.checked = !input.checked;
      statusLabel.textContent = input.checked ? 'Activado' : 'Desactivado';
      
      if (input.checked) {
        toggle.classList.remove('bg-gray-300');
        toggle.classList.add('bg-blue-600');
        circle.classList.remove('translate-x-1');
        circle.classList.add('translate-x-6');
      } else {
        toggle.classList.remove('bg-blue-600');
        toggle.classList.add('bg-gray-300');
        circle.classList.remove('translate-x-6');
        circle.classList.add('translate-x-1');
      }

      // Disparar evento change para que ClarifyJS detecte el cambio
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Actualizar label cuando cambia
    input.addEventListener('change', () => {
      statusLabel.textContent = input.checked ? 'Activado' : 'Desactivado';
    });

    wrapper.appendChild(input);
    wrapper.appendChild(toggle);
    wrapper.appendChild(statusLabel);

    return wrapper;
  },

  getValue: (element: HTMLElement) => {
    const input = element.querySelector('input');
    return input ? input.checked : false;
  },

  setValue: (element: HTMLElement, value: any) => {
    const input = element.querySelector('input');
    if (input) {
      input.checked = Boolean(value);
    }
  }
};

/**
 * Componente Checkbox estilizado con icono
 */
export const StyledCheckbox: ComponentConfig = {
  render: (config) => {
    const wrapper = document.createElement('label');
    wrapper.classList.add('flex', 'items-center', 'gap-3', 'cursor-pointer', 'group');

    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('relative', 'flex', 'items-center', 'justify-center');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = config.fieldPath;
    input.name = config.fieldPath;
    input.classList.add('peer', 'sr-only');

    if (config.required) {
      input.required = true;
    }

    if (config.value !== undefined) {
      input.checked = Boolean(config.value);
    }

    // Box visual
    const box = document.createElement('div');
    box.classList.add(
      'w-6', 'h-6', 'border-2', 'rounded', 'border-gray-300',
      'peer-checked:bg-blue-600', 'peer-checked:border-blue-600',
      'peer-focus:ring-2', 'peer-focus:ring-blue-500', 'peer-focus:ring-offset-2',
      'transition-all', 'duration-200',
      'group-hover:border-blue-400'
    );

    // Check icon (SVG)
    const checkIcon = document.createElement('svg');
    checkIcon.classList.add(
      'absolute', 'w-4', 'h-4', 'text-white', 'opacity-0',
      'peer-checked:opacity-100', 'transition-opacity', 'pointer-events-none'
    );
    checkIcon.setAttribute('fill', 'none');
    checkIcon.setAttribute('stroke', 'currentColor');
    checkIcon.setAttribute('viewBox', '0 0 24 24');
    checkIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>';

    checkboxContainer.appendChild(input);
    checkboxContainer.appendChild(box);
    checkboxContainer.appendChild(checkIcon);

    const textLabel = document.createElement('span');
    textLabel.classList.add('text-sm', 'font-medium', 'text-gray-700', 'group-hover:text-blue-600', 'transition-colors');
    textLabel.textContent = config.placeholder || 'Checkbox';

    wrapper.appendChild(checkboxContainer);
    wrapper.appendChild(textLabel);

    return wrapper;
  },

  getValue: (element: HTMLElement) => {
    const input = element.querySelector('input');
    return input ? input.checked : false;
  },

  setValue: (element: HTMLElement, value: any) => {
    const input = element.querySelector('input');
    if (input) {
      input.checked = Boolean(value);
    }
  }
};
