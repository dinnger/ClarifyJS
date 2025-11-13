import type {  ZodTypeAny, Structure, StructureItem } from "../interface";
import { z } from "zod";

// ==================== UTILIDADES ZOD ====================
class ZodExtractor {
  /**
   * Extrae información de validación desde un esquema Zod
   */
  static extractValidationInfo(zodSchema: ZodTypeAny): any {
    
    const _def = (zodSchema as any)._def


    if (zodSchema instanceof z.ZodOptional) {
      (zodSchema as any)._def.innerType._def.optional = true;
      return this.extractValidationInfo(_def.innerType);
    }

    // ZodUnion - extraer el primer tipo válido que no sea literal vacío
    if (zodSchema instanceof z.ZodUnion) {
      const options = _def.options || [];
      // Buscar el primer tipo que no sea un literal vacío
      for (const option of options) {
        const optionDef = (option as any)._def;
        // Saltar literales vacíos como z.literal("")
        if (option instanceof z.ZodLiteral && optionDef.value === "") {
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
    if (zodSchema instanceof z.ZodString) {
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
    if (zodSchema instanceof z.ZodNumber) {
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
    if (zodSchema instanceof z.ZodEnum) {
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
    if (zodSchema instanceof z.ZodObject) {
      info.shape = _def.shape;
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
      const zodType = value as ZodTypeAny;
      const validationInfo = this.extractValidationInfo(zodType);

      // Detectar automáticamente campos password por nombre
      const isPasswordField = validationInfo.isPassword;
      const item: StructureItem = {
        type: isPasswordField && validationInfo.type === 'string' ? 'password' : validationInfo.type,
        label: validationInfo.label ,
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

export { ZodExtractor }