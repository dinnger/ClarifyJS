import { z as zodOriginal, ZodType } from "zod";
import type { ComponentConfig, StructureItem } from "../interface";

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


// ==================== ZOD  ====================
ZodType.prototype.label = function(label: string) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    label, // Aquí guardamos nuestro label
  });
};

ZodType.prototype.properties = function(properties: StructureItem["properties"]) {
  const C = this.constructor as any; 
  return new C({
    ...this._def,
    properties,
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
    properties?: StructureItem["properties"];
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
    properties(properties:StructureItem["properties"]):this;
    /** Mark as password field with optional show/hide toggle */
    password(withToggle?: boolean): this;
    /** Define a custom component for rendering this field */
    component(component: ComponentConfig): this;
  }
}

const z = createExtendedZ();

export { z };