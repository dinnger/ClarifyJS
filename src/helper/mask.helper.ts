/**
 * Helper para aplicar máscaras a inputs
 */
export class MaskHelper {
  /**
   * Aplica una máscara de formato tipo "###-####" a un input
   */
  static applyFormatMask(input: HTMLInputElement, mask: string): void {
    const maxDigits = (mask.match(/#/g) || []).length;
    
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
  }

  /**
   * Aplica una máscara regex a un input
   */
  static applyRegexMask(input: HTMLInputElement, mask: RegExp): void {
    input.addEventListener('input', () => {
      const value = input.value;
      if (!mask.test(value) && value !== '') {
        // Si no coincide con la regex, revertir al valor anterior
        input.value = input.value.slice(0, -1);
      }
    });
  }

  /**
   * Aplica una máscara (formato o regex) a un input
   */
  static applyMask(input: HTMLInputElement, mask: string | RegExp): void {
    if (typeof mask === 'string') {
      this.applyFormatMask(input, mask);
    } else {
      this.applyRegexMask(input, mask);
    }
  }
}
