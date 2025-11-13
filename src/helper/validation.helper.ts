import type { StructureItem } from "../interface";

/**
 * Helper para manejo de validaciones de campos
 */
export class ValidationHelper {
  /**
   * Valida si un campo vacío/undefined debe considerarse válido
   */
  static isEmptyAndOptional(value: any, isRequired: boolean): boolean {
    return !isRequired && (value === undefined || value === null || value === '');
  }

  /**
   * Valida si esta visible
   */
  static isVisible(properties: StructureItem["properties"]): boolean {
    if (!properties || properties.visible === undefined) return true;
    return properties?.visible === true;
  }

  /**
   * Extrae el valor actual de un input considerando máscaras y tipos especiales
   */
  static extractInputValue(
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    type: string
  ): any {
    if (input instanceof HTMLInputElement && input.type === "checkbox") {
      return input.checked;
    }
    
    if (type === "number") {
      return input.value ? Number(input.value) : undefined;
    }
    
    // Si el campo tiene máscara de formato, usar el valor sin formato
    if (input instanceof HTMLInputElement && input.hasAttribute('data-raw-value')) {
      return input.getAttribute('data-raw-value') || undefined;
    }
    
    // Para campos de texto, si está vacío usar undefined
    return input.value || undefined;
  }

  /**
   * Valida un campo individual con su esquema de validación
   */
  static validateFieldValue(item: StructureItem, value: any): {
    success: boolean;
    errors?: string[];
  } {
    if (!item.validation) {
      return { success: true };
    }

    const result = item.validation.safeParse(value);

    if (!result.success) {
      const errors = JSON.parse(result.error.toString()).map((e: any) => e.message);
      return { success: false, errors };
    }

    return { success: true };
  }
}
