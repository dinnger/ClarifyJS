import { z, ZodType } from "zod";

// ==================== TIPOS ====================
type Structure = {
  [key: string]: StructureItem;
};

interface StructureItem {
  type: "text" | "number" | "email" | "password" | "textarea" | "select" | "checkbox" | "section" | "box";
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
  children?: Structure;
  validation?: z.ZodTypeAny;
}

interface FormConfig {
  structure: Structure;
  schema?: z.ZodObject<any> | undefined;
  onSubmit?: ((data: any) => void) | undefined;
  onChange?: ((data: any, errors: any) => void) | undefined;
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

declare module 'zod' {
  // Añadimos 'label' a la definición base que todos los esquemas usan
  interface ZodTypeDef {
    label?: string;
    style?:{size:number, className:string}
  }

  // Añadimos el método .label() a la clase base ZodType
  // 'this' asegura que el encadenamiento (chaining) siga funcionando
  interface ZodType {
    /** Define a label for the schema */
    label(label: string): this;
    style({size, className}:{size:number, className?:string}):this;
  }
}



// ==================== UTILIDADES ZOD ====================
class ZodExtractor {
  /**
   * Extrae información de validación desde un esquema Zod
   */
  static extractValidationInfo(zodSchema: z.ZodTypeAny): any {
    const info: any = {
      required: !zodSchema.optional(),
      type: (zodSchema as any)._def.typeName,
      label: (zodSchema as any)._def.label,
      style: (zodSchema as any)._def.style,
    };

    // ZodString
    if (zodSchema instanceof z.ZodString) {
      const checks = (zodSchema as any)._def.checks || [];
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
    if (zodSchema instanceof z.ZodNumber) {
      const checks = (zodSchema as any)._def.checks || [];
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
    if (zodSchema instanceof z.ZodEnum) {
      info.options = (zodSchema as any)._def.values;
    }

    // ZodObject (para objetos anidados)
    if (zodSchema instanceof z.ZodObject) {
      info.shape = (zodSchema as any)._def.shape;
    }

    // ZodOptional
    if (zodSchema instanceof z.ZodOptional) {
      info.required = false;
      return { ...info, ...this.extractValidationInfo((zodSchema as any)._def.innerType) };
    }

    return info;
  }

  /**
   * Genera estructura de formulario desde un esquema Zod
   */
  static schemaToStructure(
    zodSchema: z.ZodObject<any>,
  ): Structure {
    const structure: Structure = {};
    const shape = zodSchema._def.shape;

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as z.ZodTypeAny;
      const validationInfo = this.extractValidationInfo(zodType);

      const item: StructureItem = {
        type: this.inferInputType(validationInfo),
        label: validationInfo.label || this.formatLabel(key),
        style: validationInfo.style,
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
          options: validationInfo.options.map((opt: any) => ({
            value: opt,
            label: opt,
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

  private static inferInputType(validationInfo: any): StructureItem["type"] {
    if (validationInfo.isEmail) return "email";
    if (validationInfo.type === "ZodNumber") return "number";
    if (validationInfo.type === "ZodBoolean") return "checkbox";
    return "text";
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
  private schema: z.ZodObject<any> | undefined;
  private formData: Record<string, any> = {};
  private errors: Record<string, string[]> = {};
  private onSubmitCallback: ((data: any) => void) | undefined;
  private onChangeCallback: ((data: any, errors: any) => void) | undefined;
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

    // Botón de submit
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Submit";
    submitButton.classList.add(
      "clarifyjs-submit",
      "w-full",
      "bg-blue-500",
      "text-white",
      "px-6",
      "py-3",
      "rounded-md",
      "text-base",
      "font-semibold",
      "cursor-pointer",
      "transition-all",
      "hover:bg-blue-600",
      "hover:-translate-y-0.5",
      "hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)]",
      "active:translate-y-0",
      "disabled:bg-gray-400",
      "disabled:cursor-not-allowed",
      "disabled:transform-none",
      "mt-4"
    );
    this.container.appendChild(submitButton);

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
      console.log(item)
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      const element = this.renderField(key, item, fieldPath);
      const size = item.style?.size || item.type==='box'? 12: 3
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
      case "checkbox":
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

    return input;
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
      value = input.value;
    }

    this.setNestedValue(this.formData, fieldPath, value);
    
    if (this.onChangeCallback) {
      this.onChangeCallback(this.formData, this.errors);
    }
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
   * Maneja el submit del formulario
   */
  private handleSubmit() {
    // Validar todos los campos
    this.validateAllFields(this.structure);

    // Si hay errores, no enviar
    if (Object.keys(this.errors).length > 0) {
      console.error("Errores de validación:", this.errors);
      return;
    }

    // Validar con el schema completo si existe
    if (this.schema) {
      const result = this.schema.safeParse(this.formData);

      if (!result.success) {
        console.error("Errores de validación del schema:", result.error);
        this.displaySchemaErrors(result.error);
        return;
      }
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
  private displaySchemaErrors(error: z.ZodError) {
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
        if (input instanceof HTMLInputElement && input.type === "checkbox") {
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
    schema: z.ZodObject<any>,
    config?: {
      el?: string | HTMLElement;
      onSubmit?: (data: any) => void;
      onChange?: (data: any, errors: any) => void;
    }
  ): ClarifyJS {
    const structure = ZodExtractor.schemaToStructure(schema);
    return new ClarifyJS({
      structure,
      schema,
      onSubmit: config?.onSubmit,
      onChange: config?.onChange,
    }, config?.el);
  }
}

// ==================== EJEMPLO DE USO ====================

// Esquema Zod de ejemplo
const userSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  age: z.number().min(18, "Debes ser mayor de edad").max(120),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.number().int(),
  }),
});

// Crear formulario desde el schema con selector de elemento
const form = ClarifyJS.fromSchema(userSchema, {
  el: "#root", // Selector CSS del elemento donde se montará el formulario
  onSubmit: (data) => {
    console.log("Formulario enviado:", data);
    alert("Formulario válido! Ver consola para datos");
  },
  onChange: (data, errors) => {
    console.log("Datos actuales:", data);
    console.log("Errores:", errors);
  },
});

// Renderizar (se monta automáticamente en #root si se especificó 'el')
form.render();

// También puedes renderizar manualmente sin especificar 'el':
// const root = document.getElementById("root");
// if (root) {
//   root.appendChild(form.render());
// }

// También puedes exportar para usar como librería
export { ClarifyJS, ZodExtractor, z };
export type { Structure, StructureItem, FormConfig };