import { type z as zodOrigin, type ZodTypeAny, type ZodError } from "zod";


// ==================== TIPOS DE UTILIDAD ====================
/**
 * Extrae todas las rutas de campos anidados de un objeto
 * Ejemplo: { user: { name: string, address: { street: string } } }
 * Resultado: "user" | "user.name" | "user.address" | "user.address.street"
 */
type FieldPaths<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: 
        | (Prefix extends "" ? K : `${Prefix}.${K}`)
        | (T[K] extends object ? FieldPaths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`> : never)
    }[keyof T & string]
  : never;

/**
 * Extrae el tipo inferido de un schema Zod
 */
type InferSchemaType<T> = T extends zodOrigin.ZodObject<infer Shape>
  ? zodOrigin.infer<zodOrigin.ZodObject<Shape>>
  : never;


export type { zodOrigin, ZodTypeAny, ZodError, FieldPaths, InferSchemaType };