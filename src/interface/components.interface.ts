/**
 * Tipos para componentes personalizados de ClarifyJS
 */

import type { StructureItem } from "./clarify.interface";

interface ComponentConfig {
  /** Clases CSS base para el input/componente */
  baseClasses?: string[];
  /** Función que genera el HTML del componente */
  render: (config: RenderConfig) => HTMLElement;
  /** Función opcional para extraer el valor del componente */
  getValue?: (element: HTMLElement) => any;
  /** Función opcional para establecer el valor del componente */
  setValue?: (element: HTMLElement, value: any) => void;
}

interface RenderConfig {
  /** Path del campo en el formulario */
  fieldPath: string;
  /** Tipo de campo */
  type: string;
  /** Etiqueta del campo */
  label?: string | undefined;
  /** Propiedades del campo */
  properties?: StructureItem["properties"];
  /** Valor actual del campo */
  value?: any;
  /** Si el campo es requerido */
  required?: boolean | undefined;
  /** Si es un campo password */
  isPassword?: boolean | undefined;
}

export type { ComponentConfig, RenderConfig };
