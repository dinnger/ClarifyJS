/**
 * Utilidades para trabajar con objetos anidados usando paths con puntos
 */
export class NestedObjectUtil {
  /**
   * Obtiene un valor anidado usando un path con puntos
   * @example
   * getNestedValue({ user: { name: "John" } }, "user.name") // "John"
   */
  static get(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Establece un valor anidado usando un path con puntos
   * @example
   * const obj = {};
   * setNestedValue(obj, "user.name", "John");
   * // obj = { user: { name: "John" } }
   */
  static set(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Elimina un valor anidado usando un path con puntos
   */
  static delete(obj: any, path: string): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);
    if (target) {
      delete target[lastKey];
    }
  }

  /**
   * Verifica si existe un path en el objeto
   */
  static has(obj: any, path: string): boolean {
    const keys = path.split(".");
    let current = obj;
    
    for (const key of keys) {
      if (current == null || !(key in current)) {
        return false;
      }
      current = current[key];
    }
    
    return true;
  }
}
