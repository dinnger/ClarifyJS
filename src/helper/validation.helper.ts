import type { Structure, StructureItem, zodOrigin } from '../interface'
import { NestedObjectUtil } from '../utils'

/**
 * Helper para manejo de validaciones de campos
 */
export class ValidationHelper {
	/**
	 * Valida si un campo vacío/undefined debe considerarse válido
	 */
	static isEmptyAndOptional(value: any, isRequired: boolean): boolean {
		return !isRequired && (value === undefined || value === null || value === '')
	}

	/**
	 * Valida si esta visible
	 */
	static isVisible(properties: StructureItem['properties']): boolean {
		if (!properties || properties.visible === undefined) return true
		return properties?.visible === true
	}

	/**
	 * Extrae el valor actual de un input considerando máscaras y tipos especiales
	 */
	static extractInputValue(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, type: string): any {
		if (input instanceof HTMLInputElement && input.type === 'checkbox') {
			return input.checked
		}

		if (type === 'number') {
			return input.value ? Number(input.value) : undefined
		}

		// Si el campo tiene máscara de formato, usar el valor sin formato
		if (input instanceof HTMLInputElement && input.hasAttribute('data-raw-value')) {
			return input.getAttribute('data-raw-value') || undefined
		}

		// Para campos de texto, si está vacío usar undefined
		return input.value || undefined
	}

	/**
	 * Valida un campo individual con su esquema de validación
	 */
	static validateFieldValue(
		item: StructureItem,
		value: any
	): {
		success: boolean
		errors?: string[]
	} {
		if (!item.validation) {
			return { success: true }
		}

		const result = item.validation.safeParse(value)

		if (!result.success) {
			const errors = JSON.parse(result.error.toString()).map((e: any) => e.message)
			return { success: false, errors }
		}

		return { success: true }
	}

	/**
	 * Obtiene las claves de campos que tienen visible=false
	 */
	static getInvisibleFields(structure: Structure, parentPath: string = ''): Set<string> {
		const invisibleFields = new Set<string>()

		for (const [key, item] of Object.entries(structure)) {
			const fieldPath = parentPath ? `${parentPath}.${key}` : key

			// Si el campo no es visible, agregarlo al conjunto
			if (item.properties?.visible === false) {
				invisibleFields.add(fieldPath)
			}

			// Si tiene hijos, buscar recursivamente
			if (item.children) {
				const childInvisible = ValidationHelper.getInvisibleFields(item.children, fieldPath)
				for (const path of childInvisible) {
					invisibleFields.add(path)
				}
			}
		}

		return invisibleFields
	}

	/**
	 * Valida un schema con datos
	 */
	static validateSchema(schema: zodOrigin.ZodObject<any>, data: any): { success: boolean; error?: any; data?: any } {
		return schema.safeParse(data)
	}

	/**
	 * Valida el schema excluyendo campos con visible=false
	 */
	static validateVisibleFieldsOnly(schema: zodOrigin.ZodObject<any>, structure: Structure, data: any): any {
		// Obtener campos invisibles
		const invisibleFields = ValidationHelper.getInvisibleFields(structure)

		// Si no hay campos invisibles, validar normalmente
		if (invisibleFields.size === 0) {
			return schema
			// return schema.safeParse(data) as any
		}

		// Crear una copia de los datos sin los campos invisibles
		const filteredData = { ...data }
		invisibleFields.forEach((fieldPath) => {
			const keys = fieldPath.split('.')
			if (keys.length === 1) {
				const key = keys[0]
				if (key) {
					delete filteredData[key]
				}
			} else {
				// Para paths anidados, eliminar solo la propiedad específica
				NestedObjectUtil.delete(filteredData, fieldPath)
			}
		})

		// Construir schema modificado usando .omit() recursivamente
		return ValidationHelper.buildSchemaWithOmittedFields(schema, invisibleFields)
	}

	/**
	 * Construye un nuevo schema omitiendo los campos invisibles usando .omit()
	 */
	private static buildSchemaWithOmittedFields(schema: zodOrigin.ZodObject<any>, invisibleFields: Set<string>): zodOrigin.ZodObject<any> {
		// Copiar el schema original con safeExtend para preservar refines
		let copySchema = schema.safeExtend({})

		invisibleFields.forEach((fieldPath) => {
			const keys = fieldPath.split('.')
			if (keys.length === 1) {
				// Campo de nivel superior
				const key = keys[0] as string
				copySchema = copySchema.omit({ [key]: true })
			} else {
			}
		})

		if (copySchema && schema._def?.checks && Array.isArray((schema._def as any).checks) && (schema._def as any).checks.length > 0) {
			for (const check of schema._def.checks) {
				copySchema = copySchema.refine((check as any).def.fn, { message: (check as any).def.error(), path: (check as any).def.path })
			}
		}
		return copySchema
	}
}
