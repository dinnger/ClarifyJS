/**
 * Helper para poblar formularios con datos
 */
export class FormPopulateHelper {
  /**
   * Puebla un formulario con datos de forma recursiva
   */
  static populate(
    container: HTMLElement,
    data: Record<string, any>,
    prefix: string = ""
  ): void {
    for (const [key, value] of Object.entries(data)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const input = container.querySelector(
        `[name="${fieldPath}"]`
      ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

      if (input) {
        this.setInputValue(input, value);
      } else if (typeof value === "object" && value !== null) {
        // Valor anidado, recursión
        this.populate(container, value, fieldPath);
      }
    }
  }

  /**
   * Establece el valor de un input según su tipo
   */
  private static setInputValue(
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    value: any
  ): void {
    if (input instanceof HTMLInputElement && input.type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = String(value);
    }
  }
}
