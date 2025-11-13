import type { Structure, StructureItem } from "../interface";

/**
 * Utilidades para trabajar con la estructura de formularios
 */
export class StructureUtil {
  /**
   * Obtiene un item de la estructura usando un path con puntos
   */
  static getItem(structure: Structure, fieldPath: string): StructureItem | null {
    const keys = fieldPath.split(".");
    let current: Structure | StructureItem | undefined = structure;

    for (const key of keys) {
      if (!current) return null;

      // Si es una estructura, buscar la clave
      if ("children" in (current as StructureItem) && (current as StructureItem).children) {
        current = (current as StructureItem).children![key];
      } else {
        current = (current as Structure)[key];
      }

      if (!current) return null;
    }

    return current as StructureItem;
  }

  /**
   * Recorre recursivamente una estructura y ejecuta un callback para cada campo
   */
  static traverse(
    structure: Structure,
    callback: (key: string, item: StructureItem, fieldPath: string) => void,
    parentPath: string = ""
  ): void {
    for (const [key, item] of Object.entries(structure)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      
      callback(key, item, fieldPath);

      if (item.children) {
        this.traverse(item.children, callback, fieldPath);
      }
    }
  }

  /**
   * Valida todos los campos de una estructura
   */
  static validateAll(
    structure: Structure,
    validateCallback: (fieldPath: string, item: StructureItem) => void,
    parentPath: string = ""
  ): void {
    for (const [key, item] of Object.entries(structure)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;

      if (item.children) {
        this.validateAll(item.children, validateCallback, fieldPath);
      } else if (item.validation) {
        validateCallback(fieldPath, item);
      }
    }
  }
}
