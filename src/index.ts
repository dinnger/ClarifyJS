import { z as zodOriginal, ZodType, type ZodTypeAny, type ZodError } from "zod";

// Crear una versión extendida de z que soporte enum con objetos
const createExtendedZ = () => {
  // Copiar todas las propiedades de z
  const extendedZ = { ...zodOriginal } as typeof zodOriginal;
  
  // Wrapper para z.enum que soporta objetos {key: label}
  const originalEnum = zodOriginal.enum.bind(zodOriginal);
  (extendedZ as any).enum = function(values: any) {
    // Si es un objeto (no array), extraer las claves para validación
    if (typeof values === 'object' && !Array.isArray(values)) {
      const keys = Object.keys(values) as [string, ...string[]];
      const enumSchema = originalEnum(keys);
      // Guardar el mapa de valores para el extractor
      (enumSchema as any)._def.valuesMap = values;
      return enumSchema;
    }
    // Comportamiento original para arrays
    return originalEnum(values);
  };
  
  return extendedZ;
};

const z = createExtendedZ();

// ==================== TIPOS ====================
type Structure = {
  [key: string]: StructureItem;
};

interface StructureItem {
  type: "text" | "number" | "email" | "password" | "textarea" | "select" | "boolean" |  "section" | "box";
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  properties?: {
    disabled?: boolean;
    min?: number;
    max?: number;
    options?: Array<{ value: string | number; label: string }>;
  };
  style?: { size: number; className: string };
  mask?: string | RegExp;
  isPassword?: boolean;
  children?: Structure;
  validation?: ZodTypeAny;
}

interface FormConfig {
  structure: Structure;
  schema?: zodOriginal.ZodObject<any> | undefined;
  onSubmit?: ((data: any) => void) | undefined;
  onChange?: ((data: any, errors: any) => void) | undefined;
  onValidate?: ((isValid: boolean, data: any, errors: any) => void) | undefined;
}


// ==================== ZOD  ====================
ZodType.prototype.label = function(label: string) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    label, // Aquí guardamos nuestro label
  });
};

ZodType.prototype.style = function({ size, className }: { size: number, className?: string }) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    style: { size, className },
  });
};

ZodType.prototype.mask = function(mask: string | RegExp) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    mask,
  });
};

ZodType.prototype.password = function(withToggle: boolean = true) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    isPassword: withToggle,
  });
};

declare module 'zod' {
  // Añadimos 'label' a la definición base que todos los esquemas usan
  interface ZodTypeDef {
    label?: string;
    style?:{size:number, className:string};
    valuesMap?: Record<string, string>;
    mask?: string | RegExp;
    isPassword?: boolean;
  }

  // Añadimos el método .label() a la clase base ZodType
  // 'this' asegura que el encadenamiento (chaining) siga funcionando
  interface ZodType {
    /** Define a label for the schema */
    label(label: string): this;
    style({size, className}:{size:number, className?:string}):this;
    /** Define a mask for input formatting (e.g., "###-#####" or /^[1-6]\d{0,5}$/) */
    mask(mask: string | RegExp): this;
    /** Mark as password field with optional show/hide toggle */
    password(withToggle?: boolean): this;
  }
}



// ==================== UTILIDADES ZOD ====================
class ZodExtractor {
  /**
   * Extrae información de validación desde un esquema Zod
   */
  static extractValidationInfo(zodSchema: ZodTypeAny): any {
    
    const _def = (zodSchema as any)._def

    if (zodSchema instanceof zodOriginal.ZodOptional) {
      (zodSchema as any)._def.innerType._def.optional = true;
      return this.extractValidationInfo(_def.innerType);
    }

    const info: any = {
      required: !_def.optional,
      type: _def.type,
      label: _def.label,
      style: _def.style,
      mask: _def.mask,
      isPassword: _def.isPassword,
    };

    // ZodString
    if (zodSchema instanceof zodOriginal.ZodString) {
      const checks = _def.checks || [];
      checks.forEach((check: any) => {
        switch (check.kind) {
          case "min":
            info.minLength = check.value;
            break;
          case "max":
            info.maxLength = check.value;
            break;
          case "email":
            info.isEmail = true;
            break;
          case "url":
            info.isUrl = true;
            break;
          case "regex":
            info.pattern = check.regex;
            break;
        }
      });
    }

    // ZodNumber
    if (zodSchema instanceof zodOriginal.ZodNumber) {
      const checks = _def.checks || [];
      checks.forEach((check: any) => {
        switch (check.kind) {
          case "min":
            info.min = check.value;
            info.minInclusive = check.inclusive;
            break;
          case "max":
            info.max = check.value;
            info.maxInclusive = check.inclusive;
            break;
          case "int":
            info.isInt = true;
            break;
        }
      });
    }

    // ZodEnum
    if (zodSchema instanceof zodOriginal.ZodEnum) {
      const values = _def.values;
      // Si hay un valuesMap (objeto {key: label}), usarlo
      const valuesMap = _def.valuesMap;
      if (valuesMap) {
        info.options = valuesMap;
      } else if (Array.isArray(values)) {
        // Comportamiento original: array de valores
        // Convertir array a objeto {value: value}
        info.options = values.reduce((acc: any, val: string) => {
          acc[val] = val;
          return acc;
        }, {});
      } else {
        info.options = values;
      }
    }

    // ZodObject (para objetos anidados)
    if (zodSchema instanceof zodOriginal.ZodObject) {
      info.shape = _def.shape;
    }

    // ZodOptional
    if (zodSchema instanceof zodOriginal.ZodOptional) {
      info.required = false;
      return { ...info, ...this.extractValidationInfo((zodSchema as any)._def.innerType) };
    }

    return info;
  }

  /**
   * Genera estructura de formulario desde un esquema Zod
   */
  static schemaToStructure(
    zodSchema: zodOriginal.ZodObject<any>,
  ): Structure {
    const structure: Structure = {};
    const shape = zodSchema._def.shape;

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as ZodTypeAny;
      const validationInfo = this.extractValidationInfo(zodType);

      const item: StructureItem = {
        type: validationInfo.type,
        label: validationInfo.label || this.formatLabel(key),
        style: validationInfo.style,
        mask: validationInfo.mask,
        isPassword: validationInfo.isPassword,
        required: validationInfo.required,
        validation: zodType,
      };

      // Configurar propiedades según el tipo
      if (validationInfo.minLength) {
        item.properties = { ...item.properties, min: validationInfo.minLength };
      }
      if (validationInfo.maxLength) {
        item.properties = { ...item.properties, max: validationInfo.maxLength };
      }
      if (validationInfo.min !== undefined) {
        item.properties = { ...item.properties, min: validationInfo.min };
      }
      if (validationInfo.max !== undefined) {
        item.properties = { ...item.properties, max: validationInfo.max };
      }
      if (validationInfo.options) {
        item.type = "select";
        item.properties = {
          ...item.properties,
          options: Object.entries(validationInfo.options).map((opt: any) => ({
            value: opt[0],
            label: opt[1],
          })),
        };
      }

      // Objetos anidados
      if (validationInfo.shape) {
        item.type = "box";
        item.children = this.schemaToStructure(
          z.object(validationInfo.shape)
        );
      }

      structure[key] = item;
    }

    return structure;
  }



  private static formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}

// ==================== CLARIFYJS - MOTOR DE FORMULARIOS ====================
class ClarifyJS {
  private container: HTMLElement;
  private structure: Structure;
  private schema: zodOriginal.ZodObject<any> | undefined;
  private formData: Record<string, any> = {};
  private errors: Record<string, string[]> = {};
  private onSubmitCallback: ((data: any) => void) | undefined;
  private onChangeCallback: ((data: any, errors: any) => void) | undefined;
  private onValidateCallback: ((isValid: boolean, data: any, errors: any) => void) | undefined;
  private targetElement: HTMLElement | null = null;

  constructor(config: FormConfig, el?: string | HTMLElement) {
    // Identificar el elemento donde se usará el formulario
    if (el) {
      if (typeof el === 'string') {
        this.targetElement = document.querySelector(el);
        if (!this.targetElement) {
          throw new Error(`ClarifyJS: No se encontró el elemento con el selector "${el}"`);
        }
      } else {
        this.targetElement = el;
      }
    }

    this.container = document.createElement("form");
    this.container.classList.add("clarifyjs-form");
    this.structure = config.structure;
    this.schema = config.schema;
    this.onSubmitCallback = config.onSubmit;
    this.onChangeCallback = config.onChange;
    this.onValidateCallback = config.onValidate;

    this.container.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  /**
   * Renderiza el formulario
   */
  render(): HTMLElement {
    this.container.innerHTML = "";
    this.container.classList.add("clarifyjs-form", "bg-white", "p-8", "rounded-lg", "shadow-lg");
    
    const fieldsContainer = this.renderStructure(this.structure);
    this.container.appendChild(fieldsContainer);

    // Si se especificó un elemento objetivo, montar automáticamente
    if (this.targetElement) {
      this.targetElement.appendChild(this.container);
    }

    return this.container;
  }

  /**
   * Renderiza una estructura de forma recursiva
   */
  private renderStructure(
    structure: Structure,
    parentPath: string = ""
  ): HTMLElement {
    const container = document.createElement("div");
    container.classList.add("clarifyjs-grid", "grid", "grid-cols-12", "gap-5", "mb-5");

    for (const [key, item] of Object.entries(structure)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      const element = this.renderField(key, item, fieldPath);
      const size = item.style?.size || (item.type === 'box'? 12: 3)
      element.style.gridColumn = `span ${size}`;
      container.appendChild(element);
    }

    return container;
  }

  /**
   * Renderiza un campo individual
   */
  private renderField(
    _key: string,
    item: StructureItem,
    fieldPath: string
  ): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.classList.add("clarifyjs-field", "flex", "flex-col", "gap-2");
    wrapper.setAttribute("data-type", item.type);
    wrapper.setAttribute("data-field", fieldPath);

    // Contenedores especiales
    if (item.type === "section" || item.type === "box") {
      if (item.label) {
        const title = document.createElement("h3");
        title.classList.add("clarifyjs-section-title", "text-lg", "font-bold", "text-gray-900", "mb-4", "pb-2", "border-b-2", "border-gray-200");
        title.textContent = item.label;
        wrapper.appendChild(title);
      }

      if (item.children) {
        const childrenContainer = this.renderStructure(item.children, fieldPath);
        wrapper.appendChild(childrenContainer);
      }

      return wrapper;
    }

    // Label
    if (item.label) {
      const label = document.createElement("label");
      label.htmlFor = fieldPath;
      label.classList.add("font-semibold", "text-sm", "text-gray-700");
      label.textContent = item.label;
      if (item.required) {
        const requiredSpan = document.createElement("span");
        requiredSpan.classList.add("required", "text-red-500", "ml-0.5");
        requiredSpan.textContent = "*";
        label.appendChild(requiredSpan);
      }
      wrapper.appendChild(label);
    }

    // Input
    const input = this.createInput(item, fieldPath);
    wrapper.appendChild(input);

    // Descripción
    if (item.description) {
      const desc = document.createElement("small");
      desc.classList.add("clarifyjs-description", "text-xs", "text-gray-600");
      desc.textContent = item.description;
      wrapper.appendChild(desc);
    }

    // Error container
    const errorContainer = document.createElement("div");
    errorContainer.classList.add("clarifyjs-error", "text-xs", "text-red-500", "min-h-[18px]", "opacity-0", "transition-opacity");
    errorContainer.setAttribute("data-error-for", fieldPath);
    wrapper.appendChild(errorContainer);

    return wrapper;
  }

  /**
   * Crea el input apropiado según el tipo
   */
  private createInput(item: StructureItem, fieldPath: string): HTMLElement {
    let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const baseClasses = "w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm font-inherit transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100".split(" ");
    switch (item.type) {
      case "textarea":
        input = document.createElement("textarea");
        input.classList.add(...baseClasses, "min-h-[100px]", "resize-y");
        break;
      case "select":
        input = document.createElement("select");
        input.classList.add(...baseClasses, "cursor-pointer");
        if (item.properties?.options) {
          item.properties.options.forEach((opt) => {
            const option = document.createElement("option");
            option.value = String(opt.value);
            option.textContent = opt.label;
            (input as HTMLSelectElement).appendChild(option);
          });
        }
        break;
      case "boolean":
        input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add("w-auto", "h-[18px]", "cursor-pointer", "rounded", "border-gray-300", "text-blue-600", "focus:ring-2", "focus:ring-blue-500");
        break;
      default:
        input = document.createElement("input");
        input.type = item.type;
        input.classList.add(...baseClasses);
    }

    input.id = fieldPath;
    input.name = fieldPath;

    if (item.placeholder && 'placeholder' in input) {
      input.placeholder = item.placeholder;
    }

    if (item.required) {
      input.required = true;
    }

    if (item.properties?.disabled) {
      input.disabled = true;
      input.classList.add("bg-gray-100", "cursor-not-allowed", "opacity-60");
    }

    if (item.properties?.min !== undefined && input instanceof HTMLInputElement) {
      input.min = String(item.properties.min);
    }

    if (item.properties?.max !== undefined && input instanceof HTMLInputElement) {
      input.max = String(item.properties.max);
    }

    // Event listener para validación en tiempo real
    input.addEventListener("input", () => {
      this.handleFieldChange(fieldPath, input, item);
    });

    input.addEventListener("blur", () => {
      this.validateField(fieldPath, item);
    });

    // Inicializar valor por defecto para select y checkbox
    if (input instanceof HTMLSelectElement || 
        (input instanceof HTMLInputElement && input.type === "checkbox")) {
      // Disparar evento input inicial para capturar valores por defecto
      setTimeout(() => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, 0);
    }

    // Aplicar máscara si existe
    if (item.mask && input instanceof HTMLInputElement) {
      this.applyMask(input, item.mask);
    }

    // Para passwords, añadir botón de toggle show/hide
    if (item.isPassword && input instanceof HTMLInputElement) {
      input.type = "password"; // Cambiar tipo a password
      return this.createPasswordWithToggle(input, fieldPath);
    }

    return input;
  }

  /**
   * Aplica una máscara a un input
   */
  private applyMask(input: HTMLInputElement, mask: string | RegExp) {
    if (typeof mask === 'string') {
      // Máscara de formato tipo "###-#####"
      // Contar cuántos # hay en la máscara para saber el límite de dígitos
      const maxDigits = (mask.match(/#/g) || []).length;
      
      // Usar 'input' con captura para ejecutarse ANTES que otros listeners
      input.addEventListener('input', () => {
        let value = input.value.replace(/\D/g, ''); // Solo números
        
        // Limitar a la cantidad máxima de dígitos permitidos
        if (value.length > maxDigits) {
          value = value.slice(0, maxDigits);
        }
        
        let formatted = '';
        let valueIndex = 0;

        for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
          if (mask[i] === '#') {
            formatted += value[valueIndex];
            valueIndex++;
          } else {
            formatted += mask[i];
          }
        }

        // Guardar el valor sin formato en data-raw-value
        input.setAttribute('data-raw-value', value);
        input.value = formatted;
      }, { capture: true }); // Ejecutar en fase de captura (ANTES de burbujeo)
    } else {
      // Máscara regex
      input.addEventListener('input', () => {
        const value = input.value;
        if (!mask.test(value) && value !== '') {
          // Si no coincide con la regex, revertir al valor anterior
          input.value = input.value.slice(0, -1);
        }
      });
    }
  }

  /**
   * Crea un input de password con botón para mostrar/ocultar
   */
  private createPasswordWithToggle(input: HTMLInputElement, _fieldPath: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.classList.add('relative', 'flex', 'items-center');
    
    input.classList.add('pr-10'); // Espacio para el botón
    wrapper.appendChild(input);

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.classList.add('absolute', 'right-2', 'top-1/2', '-translate-y-1/2', 'p-1', 'text-gray-500', 'hover:text-gray-700', 'focus:outline-none');
    toggleButton.innerHTML = `
      <svg class="w-5 h-5 eye-open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
      </svg>
      <svg class="w-5 h-5 eye-closed hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
      </svg>
    `;

    toggleButton.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      
      const openEye = toggleButton.querySelector('.eye-open');
      const closedEye = toggleButton.querySelector('.eye-closed');
      
      if (isPassword) {
        openEye?.classList.add('hidden');
        closedEye?.classList.remove('hidden');
      } else {
        openEye?.classList.remove('hidden');
        closedEye?.classList.add('hidden');
      }
    });

    wrapper.appendChild(toggleButton);
    return wrapper;
  }

  /**
   * Maneja cambios en un campo
   */
  private handleFieldChange(
    fieldPath: string,
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    item: StructureItem
  ) {
    let value: any;

    if (input instanceof HTMLInputElement && input.type === "checkbox") {
      value = input.checked;
    } else if (item.type === "number") {
      value = input.value ? Number(input.value) : undefined;
    } else {
      // Si el campo tiene máscara de formato, usar el valor sin formato
      if (input instanceof HTMLInputElement && input.hasAttribute('data-raw-value')) {
        value = input.getAttribute('data-raw-value');
      } else {
        value = input.value;
      }
    }

    this.setNestedValue(this.formData, fieldPath, value);
    
    if (this.onChangeCallback) {
      this.onChangeCallback(this.formData, this.errors);
    }

    // Validar el formulario completo para actualizar el estado de validación
    this.validateFormState();
  }

  /**
   * Valida un campo específico
   */
  private validateField(fieldPath: string, item: StructureItem) {
    if (!item.validation) return;

    const value = this.getNestedValue(this.formData, fieldPath);
    const result = item.validation.safeParse(value);

    const errorContainer = this.container.querySelector(
      `[data-error-for="${fieldPath}"]`
    );

    if (!result.success) {
      const errors = JSON.parse(result.error.toString()).map((e: any) => e.message);
      this.errors[fieldPath] = errors;

      if (errorContainer) {
        errorContainer.textContent = errors.join(", ");
        errorContainer.classList.remove("opacity-0");
        errorContainer.classList.add("opacity-100");
      }

      const field = this.container.querySelector(`[data-field="${fieldPath}"]`);
      field?.classList.add("has-error");
      
      // Añadir clases de error al input
      const input = this.container.querySelector(`[name="${fieldPath}"]`);
      if (input) {
        input.classList.remove("border-gray-300", "focus:border-blue-500", "focus:ring-blue-100");
        input.classList.add("border-red-500", "focus:border-red-500", "focus:ring-red-100");
      }
    } else {
      delete this.errors[fieldPath];

      if (errorContainer) {
        errorContainer.textContent = "";
        errorContainer.classList.remove("opacity-100");
        errorContainer.classList.add("opacity-0");
      }

      const field = this.container.querySelector(`[data-field="${fieldPath}"]`);
      field?.classList.remove("has-error");
      
      // Restaurar clases normales al input
      const input = this.container.querySelector(`[name="${fieldPath}"]`);
      if (input && !input.classList.contains("w-auto")) { // No aplicar a checkboxes
        input.classList.remove("border-red-500", "focus:border-red-500", "focus:ring-red-100");
        input.classList.add("border-gray-300", "focus:border-blue-500", "focus:ring-blue-100");
      }
    }
  }

  /**
   * Valida el estado completo del formulario y llama a onValidate
   */
  private validateFormState() {
    // Validar con el schema completo si existe
    if (!this.schema) return;

    const result = this.schema.safeParse(this.formData);
    const isValid = result.success;

    // Invocar callback onValidate si existe
    if (this.onValidateCallback) {
      this.onValidateCallback(isValid, this.formData, this.errors);
    }
  }

  /**
   * Maneja el submit del formulario
   */
  private handleSubmit() {
    // Validar todos los campos
    this.validateAllFields(this.structure);

    // Determinar si hay errores
    const hasErrors = Object.keys(this.errors).length > 0;
    let isValid = !hasErrors;

    // Validar con el schema completo si existe
    if (this.schema && !hasErrors) {
      const result = this.schema.safeParse(this.formData);

      if (!result.success) {
        console.error("Errores de validación del schema:", result.error);
        this.displaySchemaErrors(result.error);
        isValid = false;
      }
    }

    // Invocar callback onValidate si existe
    if (this.onValidateCallback) {
      this.onValidateCallback(isValid, this.formData, this.errors);
    }

    // Si no es válido, no continuar con onSubmit
    if (!isValid) {
      console.error("Errores de validación:", this.errors);
      return;
    }

    // Enviar datos
    if (this.onSubmitCallback) {
      this.onSubmitCallback(this.formData);
    }
  }

  /**
   * Valida todos los campos recursivamente
   */
  private validateAllFields(structure: Structure, parentPath: string = "") {
    for (const [key, item] of Object.entries(structure)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;

      if (item.children) {
        this.validateAllFields(item.children, fieldPath);
      } else if (item.validation) {
        this.validateField(fieldPath, item);
      }
    }
  }

  /**
   * Muestra errores del schema completo
   */
  private displaySchemaErrors(error: ZodError) {
    (error as any).errors.forEach((err: any) => {
      const fieldPath = err.path.join(".");
      const errorContainer = this.container.querySelector(
        `[data-error-for="${fieldPath}"]`
      );

      if (errorContainer) {
        errorContainer.textContent = err.message;
        errorContainer.classList.add("visible");
      }

      const field = this.container.querySelector(`[data-field="${fieldPath}"]`);
      field?.classList.add("has-error");
    });
  }

  /**
   * Obtiene un valor anidado usando un path con puntos
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Establece un valor anidado usando un path con puntos
   */
  private setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Obtiene los datos del formulario
   */
  getData(): any {
    return { ...this.formData };
  }

  /**
   * Obtiene los errores del formulario
   */
  getErrors(): any {
    return { ...this.errors };
  }

  /**
   * Establece valores en el formulario
   */
  setData(data: Record<string, any>) {
    this.formData = { ...data };
    this.populateForm(data);
  }

  /**
   * Puebla el formulario con datos
   */
  private populateForm(data: Record<string, any>, prefix: string = "") {
    for (const [key, value] of Object.entries(data)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const input = this.container.querySelector(
        `[name="${fieldPath}"]`
      ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

      if (input) {
        if (input instanceof HTMLInputElement && input.type === "boolean") {
          input.checked = Boolean(value);
        } else {
          input.value = String(value);
        }
      } else if (typeof value === "object" && value !== null) {
        this.populateForm(value, fieldPath);
      }
    }
  }

  /**
   * Método estático para crear formulario desde schema Zod
   */
  static fromSchema(
    schema: zodOriginal.ZodObject<any>,
    config?: {
      el?: string | HTMLElement;
      onSubmit?: (data: any) => void;
      onChange?: (data: any, errors: any) => void;
      onValidate?: (isValid: boolean, data: any, errors: any) => void;
    }
  ): ClarifyJS {
    const structure = ZodExtractor.schemaToStructure(schema);
    return new ClarifyJS({
      structure,
      schema,
      onSubmit: config?.onSubmit,
      onChange: config?.onChange,
      onValidate: config?.onValidate,
    }, config?.el);
  }
}

// También puedes exportar para usar como librería
export { ClarifyJS, ZodExtractor, z };
export type { Structure, StructureItem, FormConfig };