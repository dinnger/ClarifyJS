import { z as zodOriginal, ZodType, type ZodTypeAny, type ZodError } from "zod";
import type { ComponentConfig } from "./components";
import { DefaultComponents } from "./components";

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
    size?: number; 
    className?: string;
    options?: Array<{ value: string | number; label: string }>;
    mask?: string | RegExp;
  };
  isPassword?: boolean;
  customComponent?: ComponentConfig;
  children?: Structure;
  validation?: ZodTypeAny;
}

interface FormConfig {
  structure: Structure;
  schema?: zodOriginal.ZodObject<any> | undefined;
  onSubmit?: ((data: any) => void) | undefined;
  onChange?: ((data: any, errors: any) => void) | undefined;
  onValidate?: ((isValid: boolean, data: any, errors: any) => void) | undefined;
  components?: Record<string, ComponentConfig> | undefined;
}


// ==================== ZOD  ====================
ZodType.prototype.label = function(label: string) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    label, // Aquí guardamos nuestro label
  });
};

ZodType.prototype.properties = function({ disabled, min, max, size, className, options, mask }: { disabled?: boolean, min?: number, max?: number, size: number, className?: string, options?: Array<{ value: string | number; label: string }>, mask?: string | RegExp }) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    properties: { disabled, min, max, size, className, options, mask },
  });
};



ZodType.prototype.password = function(withToggle: boolean = true) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    isPassword: withToggle,
  });
};

ZodType.prototype.component = function(component: ComponentConfig) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    customComponent: component,
  });
};

declare module 'zod' {
  // Añadimos 'label' a la definición base que todos los esquemas usan
  interface ZodTypeDef {
    label?: string;
    properties?:{
      disabled?: boolean;
      min?: number;
      max?: number;
      size?: number; 
      className?: string;
      options?: Array<{ value: string | number; label: string }>;
      mask?: string | RegExp;
    };
    valuesMap?: Record<string, string>;
    isPassword?: boolean;
    customComponent?: ComponentConfig;
  }

  // Añadimos el método .label() a la clase base ZodType
  // 'this' asegura que el encadenamiento (chaining) siga funcionando
  interface ZodType {
    /** Define a label for the schema */
    label(label: string): this;
    /** Define a set of properties for the schema */
    properties({disabled, min, max, size, className, options, mask}:{disabled?: boolean, min?: number, max?: number, size?: number, className?: string, options?: Array<{ value: string | number; label: string }>, mask?: string | RegExp}):this;
    /** Mark as password field with optional show/hide toggle */
    password(withToggle?: boolean): this;
    /** Define a custom component for rendering this field */
    component(component: ComponentConfig): this;
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

    // ZodUnion - extraer el primer tipo válido que no sea literal vacío
    if (zodSchema instanceof zodOriginal.ZodUnion) {
      const options = _def.options || [];
      // Buscar el primer tipo que no sea un literal vacío
      for (const option of options) {
        const optionDef = (option as any)._def;
        // Saltar literales vacíos como z.literal("")
        if (option instanceof zodOriginal.ZodLiteral && optionDef.value === "") {
          continue;
        }
        // Usar el primer tipo válido encontrado
        return this.extractValidationInfo(option);
      }
      // Si todos son literales vacíos, usar el primero
      return this.extractValidationInfo(options[0]);
    }

    const info: any = {
      required: !_def.optional,
      type: _def.type,
      label: _def.label,
      properties: _def.properties,
      isPassword: _def.isPassword,
      customComponent: _def.customComponent,
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
      const values = _def.entries;
      const valuesMap = _def.valuesMap;
      if (valuesMap) {
        info.options = valuesMap;
      } else if (Array.isArray(values)) {
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

      // Detectar automáticamente campos password por nombre
      const isPasswordField = validationInfo.isPassword;
      const item: StructureItem = {
        type: isPasswordField && validationInfo.type === 'string' ? 'password' : validationInfo.type,
        label: validationInfo.label || this.formatLabel(key),
        properties: validationInfo.properties,
        isPassword: isPasswordField,
        customComponent: validationInfo.customComponent,
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
  // Registro global de componentes
  private static componentRegistry: Map<string, ComponentConfig> = new Map();
  
  private container: HTMLElement;
  private structure: Structure;
  private schema: zodOriginal.ZodObject<any> | undefined;
  private formData: Record<string, any> = {};
  private errors: Record<string, string[]> = {};
  private onSubmitCallback: ((data: any) => void) | undefined;
  private onChangeCallback: ((data: any, errors: any) => void) | undefined;
  private onValidateCallback: ((isValid: boolean, data: any, errors: any) => void) | undefined;
  private targetElement: HTMLElement | null = null;
  private customComponents: Map<string, ComponentConfig> = new Map();

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
    
    // Cargar componentes personalizados si se proporcionan
    if (config.components) {
      Object.entries(config.components).forEach(([key, component]) => {
        this.customComponents.set(key, component);
      });
    }

    this.container.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }
  
  /**
   * Registra un componente globalmente para todas las instancias de ClarifyJS
   */
  static registerComponent(name: string, component: ComponentConfig): void {
    ClarifyJS.componentRegistry.set(name, component);
  }
  
  /**
   * Registra múltiples componentes globalmente
   */
  static registerComponents(components: Record<string, ComponentConfig>): void {
    Object.entries(components).forEach(([name, component]) => {
      ClarifyJS.componentRegistry.set(name, component);
    });
  }
  
  /**
   * Obtiene un componente (primero busca por nombre del campo, luego por tipo en personalizados, globales y defaults)
   */
  private getComponent(type: string, fieldPath?: string): ComponentConfig | undefined {
    // Prioridad 1: Componente específico por nombre de campo
    if (fieldPath && this.customComponents.has(fieldPath)) {
      return this.customComponents.get(fieldPath);
    }
    
    // Prioridad 2: Componente por nombre de campo en registro global
    if (fieldPath && ClarifyJS.componentRegistry.has(fieldPath)) {
      return ClarifyJS.componentRegistry.get(fieldPath);
    }
    
    // Prioridad 3: Componente por tipo en instancia
    if (this.customComponents.has(type)) {
      return this.customComponents.get(type);
    }
    
    // Prioridad 4: Componente por tipo en registro global
    if (ClarifyJS.componentRegistry.has(type)) {
      return ClarifyJS.componentRegistry.get(type);
    }
    
    // Prioridad 5: Componente default
    return DefaultComponents[type];
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
      const size = item.properties?.size || (item.type === 'box'? 12: 3)
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
   * Crea el input apropiado según el tipo usando el sistema de componentes
   */
  private createInput(item: StructureItem, fieldPath: string): HTMLElement {
    // Obtener componente (personalizado Zod, de instancia, global o default)
    const component = item.customComponent || this.getComponent(item.type, fieldPath);
    
    if (!component) {
      throw new Error(`No se encontró componente para el tipo "${item.type}"`);
    }
    
    const input = component.render({
      fieldPath,
      type: item.type,
      properties: item.properties,
      value: this.getNestedValue(this.formData, fieldPath),
      required: item.required,
      placeholder: item.placeholder,
      isPassword: item.isPassword,
    });

    // Agregar event listeners
    const actualInput = input.querySelector('input, textarea, select') || input;
    
    // Para checkboxes usar 'change', para otros usar 'input'
    const eventType = (actualInput instanceof HTMLInputElement && actualInput.type === 'checkbox') ? 'change' : 'input';
    
    actualInput.addEventListener(eventType, () => {
      this.handleFieldChange(fieldPath, actualInput as any, item);
      // Para checkboxes, validar inmediatamente después del cambio
      if (actualInput instanceof HTMLInputElement && actualInput.type === 'checkbox') {
        this.validateField(fieldPath, item);
      }
    });

    actualInput.addEventListener("blur", () => {
      this.validateField(fieldPath, item);
    });

    // Aplicar máscara si existe
    if (item.properties?.mask && actualInput instanceof HTMLInputElement) {
      this.applyMask(actualInput, item.properties.mask);
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
        value = input.getAttribute('data-raw-value') || undefined;
      } else {
        // Para campos de texto, si está vacío usar undefined para campos opcionales
        // o el valor real para procesamiento posterior
        value = input.value || undefined;
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

    // Obtener el valor actual del input (en lugar de solo formData)
    const input = this.container.querySelector(`[name="${fieldPath}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let value = this.getNestedValue(this.formData, fieldPath);
    
    // Si hay un input, usar su valor actual en lugar del formData
    if (input) {
      if (input instanceof HTMLInputElement && input.type === "checkbox") {
        value = input.checked;
      } else if (item.type === "number") {
        value = input.value ? Number(input.value) : undefined;
      } else {
        // Si el campo tiene máscara de formato, usar el valor sin formato
        if (input instanceof HTMLInputElement && input.hasAttribute('data-raw-value')) {
          value = input.getAttribute('data-raw-value');
        } else {
          value = input.value || undefined;
        }
      }
      
      // Actualizar formData con el valor actual
      this.setNestedValue(this.formData, fieldPath, value);
    }
    
    // Si el campo no es requerido y está vacío/undefined, considerarlo válido
    if (!item.required && (value === undefined || value === null || value === '')) {
      // Limpiar cualquier error previo
      delete this.errors[fieldPath];

      const errorContainer = this.container.querySelector(
        `[data-error-for="${fieldPath}"]`
      );
      if (errorContainer) {
        errorContainer.textContent = "";
        errorContainer.classList.remove("opacity-100");
        errorContainer.classList.add("opacity-0");
      }

      const field = this.container.querySelector(`[data-field="${fieldPath}"]`);
      field?.classList.remove("has-error");
      
      if (input && !input.classList.contains("w-auto")) {
        input.classList.remove("border-red-500", "focus:border-red-500", "focus:ring-red-100");
        input.classList.add("border-gray-300", "focus:border-blue-500", "focus:ring-blue-100");
      }
      
      return;
    }
    
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
    
    // Limpiar errores del schema previos y actualizar con los nuevos
    if (!result.success) {
      // Crear un nuevo objeto de errores basado en el schema
      const schemaErrors: Record<string, string[]> = {};
      const zodErrors = (result.error as any).errors;
      
      if (zodErrors && Array.isArray(zodErrors)) {
        zodErrors.forEach((err: any) => {
          const fieldPath = err.path.join(".");
          if (!schemaErrors[fieldPath]) {
            schemaErrors[fieldPath] = [];
          }
          schemaErrors[fieldPath].push(err.message);
        });
      }
      
      // Combinar errores: mantener errores individuales y agregar/actualizar con errores del schema
      this.errors = { ...this.errors, ...schemaErrors };
      
      // Actualizar la UI para cada campo con error del schema
      Object.entries(schemaErrors).forEach(([fieldPath, errors]) => {
        const errorContainer = this.container.querySelector(
          `[data-error-for="${fieldPath}"]`
        );
        if (errorContainer) {
          errorContainer.textContent = errors.join(", ");
          errorContainer.classList.remove("opacity-0");
          errorContainer.classList.add("opacity-100");
        }
      });
    } else {
      // Si el formulario es válido, limpiar todos los errores del schema
      // pero mantener errores individuales de validación que aún no se han corregido
      const fieldsWithErrors = Object.keys(this.errors);
      fieldsWithErrors.forEach(fieldPath => {
        // Re-validar cada campo individual para ver si aún tiene errores
        const field = this.getFieldFromPath(fieldPath);
        if (field && field.validation) {
          const value = this.getNestedValue(this.formData, fieldPath);
          const fieldResult = field.validation.safeParse(value);
          
          if (fieldResult.success) {
            // Limpiar error si el campo ahora es válido
            delete this.errors[fieldPath];
            const errorContainer = this.container.querySelector(
              `[data-error-for="${fieldPath}"]`
            );
            if (errorContainer) {
              errorContainer.textContent = "";
              errorContainer.classList.remove("opacity-100");
              errorContainer.classList.add("opacity-0");
            }
          }
        }
      });
    }

    // Invocar callback onValidate si existe
    if (this.onValidateCallback) {
      this.onValidateCallback(isValid, this.formData, this.errors);
    }
  }
  
  /**
   * Obtiene el campo desde la estructura usando un path
   */
  private getFieldFromPath(fieldPath: string): StructureItem | null {
    try {
      const keys = fieldPath.split(".");
      let current: any = this.structure;
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        // @ts-ignore - current puede ser any en este contexto
        if (!current || !current[key]) return null;
        
        if (i === keys.length - 1) {
          // @ts-ignore - current puede ser any en este contexto
          return current[key] as StructureItem;
        }
        
        // @ts-ignore - current puede ser any en este contexto
        current = current[key].children;
      }
      
      return null;
    } catch {
      return null;
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
      components?: Record<string, ComponentConfig>;
    }
  ): ClarifyJS {
    const structure = ZodExtractor.schemaToStructure(schema);
    return new ClarifyJS({
      structure,
      schema,
      onSubmit: config?.onSubmit,
      onChange: config?.onChange,
      onValidate: config?.onValidate,
      components: config?.components,
    }, config?.el);
  }
}

// También puedes exportar para usar como librería
export { ClarifyJS, ZodExtractor, z };
export type { Structure, StructureItem, FormConfig };

// Exportar componentes
export { 
  TextInput, 
  TextArea, 
  SelectInput, 
  CheckboxInput, 
  PasswordInput,
  DefaultComponents 
} from './components';
export type { ComponentConfig, RenderConfig } from './components';