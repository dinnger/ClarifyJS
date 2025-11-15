import { DefaultComponents } from './components'
import { DOMHelper, FormPopulateHelper, MaskHelper, ValidationHelper, z } from './helper'
import type { ComponentConfig, FieldPaths, FormConfig, InferSchemaType, Structure, StructureItem, ZodError, zodOrigin } from './interface'
import { NestedObjectUtil, StructureUtil, ZodExtractor } from './utils'

// ==================== CLARIFYJS - MOTOR DE FORMULARIOS ====================
class ClarifyJS<TSchema extends zodOrigin.ZodObject<any> = zodOrigin.ZodObject<any>> {
	// Registro global de componentes
	private static componentRegistry: Map<string, ComponentConfig> = new Map()

	private container: HTMLElement
	private structure: Structure
	private baseSchema: TSchema | undefined
	private schema: TSchema | undefined
	private formData: Record<string, any> = {}
	private errors: Record<string, string[]> = {}
	private previousErrorFields: Set<string> = new Set()
	private onSubmitCallback: ((data: any) => void) | undefined
	private onChangeCallback: ((data: any, errors: any) => void) | undefined
	private onValidateCallback: ((isValid: boolean, data: any, errors: any) => void) | undefined
	private targetElement: HTMLElement | null = null
	private customComponents: Map<string, ComponentConfig> = new Map()

	constructor(config: FormConfig, el?: string | HTMLElement) {
		// Identificar el elemento donde se usará el formulario
		if (el) {
			if (typeof el === 'string') {
				this.targetElement = document.querySelector(el)
				if (!this.targetElement) {
					throw new Error(`ClarifyJS: No se encontró el elemento con el selector "${el}"`)
				}
			} else {
				this.targetElement = el
			}
		}

		this.container = document.createElement('form')
		this.container.classList.add('clarifyjs-form')
		this.structure = config.structure
		this.baseSchema = config.schema as TSchema | undefined
		this.schema = config.schema as TSchema | undefined
		this.onSubmitCallback = config.onSubmit
		this.onChangeCallback = config.onChange
		this.onValidateCallback = config.onValidate

		// Cargar componentes personalizados si se proporcionan
		if (config.components) {
			Object.entries(config.components).forEach(([key, component]) => {
				this.customComponents.set(key, component)
			})
		}

		this.container.addEventListener('submit', (e) => {
			e.preventDefault()
			this.handleSubmit()
		})
	}

	/**
	 * Registra un componente globalmente para todas las instancias de ClarifyJS
	 */
	static registerComponent(name: string, component: ComponentConfig): void {
		ClarifyJS.componentRegistry.set(name, component)
	}

	/**
	 * Registra múltiples componentes globalmente
	 */
	static registerComponents(components: Record<string, ComponentConfig>): void {
		Object.entries(components).forEach(([name, component]) => {
			ClarifyJS.componentRegistry.set(name, component)
		})
	}

	/**
	 * Obtiene un componente (primero busca por nombre del campo, luego por tipo en personalizados, globales y defaults)
	 */
	private getComponent(type: string, fieldPath?: string): ComponentConfig | undefined {
		// Prioridad 1: Componente específico por nombre de campo
		if (fieldPath && this.customComponents.has(fieldPath)) {
			return this.customComponents.get(fieldPath)
		}

		// Prioridad 2: Componente por nombre de campo en registro global
		if (fieldPath && ClarifyJS.componentRegistry.has(fieldPath)) {
			return ClarifyJS.componentRegistry.get(fieldPath)
		}

		// Prioridad 3: Componente por tipo en instancia
		if (this.customComponents.has(type)) {
			return this.customComponents.get(type)
		}

		// Prioridad 4: Componente por tipo en registro global
		if (ClarifyJS.componentRegistry.has(type)) {
			return ClarifyJS.componentRegistry.get(type)
		}

		// Prioridad 5: Componente default
		return DefaultComponents[type]
	}

	/**
	 * Renderiza el formulario
	 */
	render(): HTMLElement {
		this.container.innerHTML = ''
		this.container.classList.add('clarifyjs-form', 'bg-white', 'p-8', 'rounded-lg', 'shadow-lg')
		const fieldsContainer = this.renderStructure(this.structure)
		this.container.appendChild(fieldsContainer)

		// Si se especificó un elemento objetivo, montar automáticamente
		if (this.targetElement) {
			this.targetElement.appendChild(this.container)
		}

		return this.container
	}

	/**
	 * Renderiza una estructura de forma recursiva
	 */
	private renderStructure(structure: Structure, parentPath: string = ''): HTMLElement {
		const container = document.createElement('div')
		container.classList.add('clarifyjs-grid', 'grid', 'grid-cols-12', 'gap-3', 'mb-5')

		for (const [key, item] of Object.entries(structure)) {
			const fieldPath = (parentPath ? `${parentPath}.${key}` : key) as TSchema extends zodOrigin.ZodObject<any>
				? FieldPaths<InferSchemaType<TSchema>>
				: string
			const element = this.renderField(key, item, fieldPath)
			const size = item.type === 'box' ? 12 : 3
			element.style.gridColumn = `span ${size}`

			container.appendChild(element)

			// Aplicar propiedades
			if (item.properties) {
				Object.entries(item.properties).forEach(([key, value]) => {
					this.setFieldProperty(fieldPath, key as keyof NonNullable<StructureItem['properties']>, value, container)
				})
			}
		}

		if (this.baseSchema) this.schema = ValidationHelper.validateVisibleFieldsOnly(this.baseSchema, this.structure, this.formData)

		return container
	}

	/**
	 * Renderiza un campo individual
	 */
	private renderField(
		_key: string,
		item: StructureItem,
		fieldPath: TSchema extends zodOrigin.ZodObject<any> ? FieldPaths<InferSchemaType<TSchema>> : string
	): HTMLElement {
		const wrapper = document.createElement('div')
		wrapper.classList.add('clarifyjs-field', 'flex', 'flex-col', 'gap-2')
		wrapper.setAttribute('data-type', item.type)
		wrapper.setAttribute('data-field', fieldPath)

		// Contenedores especiales
		if (item.type === 'section' || item.type === 'box') {
			if (item.label) {
				const title = document.createElement('h3')
				title.classList.add(
					'clarifyjs-section-title',
					'text-lg',
					'font-bold',
					'text-gray-900',
					'mb-4',
					'pb-2',
					'border-b-2',
					'border-gray-200'
				)
				title.textContent = item.label
				wrapper.appendChild(title)
			}

			if (item.children) {
				const childrenContainer = this.renderStructure(item.children, fieldPath)
				wrapper.appendChild(childrenContainer)
			}

			return wrapper
		}

		// Label
		if (item.label) {
			const label = document.createElement('label')
			label.htmlFor = fieldPath
			label.classList.add('font-semibold', 'text-sm', 'text-gray-700')
			label.textContent = item.label
			if (item.required) {
				const requiredSpan = document.createElement('span')
				requiredSpan.classList.add('required', 'text-red-500', 'ml-0.5')
				requiredSpan.textContent = '*'
				label.appendChild(requiredSpan)
			}
			wrapper.appendChild(label)
		}

		// Input
		const input = this.createInput(item, fieldPath)
		wrapper.appendChild(input)

		// Descripción
		if (item.description) {
			const desc = document.createElement('small')
			desc.classList.add('clarifyjs-description', 'text-xs', 'text-gray-600')
			desc.textContent = item.description
			wrapper.appendChild(desc)
		}

		// Error container
		const errorContainer = document.createElement('div')
		errorContainer.classList.add('clarifyjs-error', 'text-xs', 'text-red-500', 'min-h-[18px]', 'opacity-0', 'transition-opacity')
		errorContainer.setAttribute('data-error-for', fieldPath)
		wrapper.appendChild(errorContainer)

		return wrapper
	}

	/**
	 * Crea el input apropiado según el tipo usando el sistema de componentes
	 */
	private createInput(
		item: StructureItem,
		fieldPath: TSchema extends zodOrigin.ZodObject<any> ? FieldPaths<InferSchemaType<TSchema>> : string
	): HTMLElement {
		// Obtener componente (personalizado Zod, de instancia, global o default)
		const component = item.customComponent || this.getComponent(item.type, fieldPath)

		if (!component) {
			throw new Error(`No se encontró componente para el tipo "${item.type}"`)
		}

		const input = component.render({
			fieldPath,
			type: item.type,
			label: item.label,
			properties: item.properties,
			value: this.getNestedValue(this.formData, fieldPath),
			required: item.required,
			isPassword: item.isPassword
		})

		// Agregar event listeners
		const actualInput = input.querySelector('input, textarea, select') || input

		// Para checkboxes usar 'change', para otros usar 'input'
		const eventType = actualInput instanceof HTMLInputElement && actualInput.type === 'checkbox' ? 'change' : 'input'

		actualInput.addEventListener(eventType, () => {
			this.handleFieldChange(fieldPath, actualInput as any, item)
			// Para checkboxes, validar inmediatamente después del cambio
			// if (actualInput instanceof HTMLInputElement && actualInput.type === 'checkbox') {
			this.validateField(fieldPath, item)
			// }
		})

		actualInput.addEventListener('blur', () => {
			this.validateField(fieldPath, item)
		})

		return input
	}

	/**
	 * Maneja cambios en un campo
	 */
	private handleFieldChange(fieldPath: string, input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, item: StructureItem) {
		const value = ValidationHelper.extractInputValue(input, item.type)
		this.setNestedValue(this.formData, fieldPath, value)

		if (this.onChangeCallback) {
			this.onChangeCallback(this.formData, this.errors)
		}

		// Notificar el estado de validación después del cambio
		this.notifyValidationState()
	}

	/**
	 * Valida un campo específico
	 */
	private validateField(fieldPath: string, item: StructureItem) {
		if (!item.validation) return

		// Obtener el valor actual del input
		const input = this.container.querySelector(`[name="${fieldPath}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		let value = this.getNestedValue(this.formData, fieldPath)

		// Si hay un input, extraer su valor actual
		if (input) {
			value = ValidationHelper.extractInputValue(input, item.type)
			this.setNestedValue(this.formData, fieldPath, value)
		}

		// Si el campo es opcional y está vacío, considerarlo válido
		if (ValidationHelper.isEmptyAndOptional(value, item.required ?? false)) {
			delete this.errors[fieldPath]
			DOMHelper.clearFieldError(this.container, fieldPath)
			return
		}

		// Validar el valor del campo
		const result = ValidationHelper.validateFieldValue(item, value)

		// Guardar el campo como que ha tenido errores anteriormente
		this.previousErrorFields.add(fieldPath)

		if (!result.success && result.errors) {
			this.errors[fieldPath] = result.errors
			DOMHelper.showFieldError(this.container, fieldPath, result.errors)
		} else {
			// Campo válido individualmente
			delete this.errors[fieldPath]
			DOMHelper.clearFieldError(this.container, fieldPath)

			// Verificar errores de schema completo (ej: refine cross-field)
			this.validateCrossFieldErrors()
		}

		// Notificar el estado de validación después de validar el campo
		this.notifyValidationState()
	}

	/**
	 * Valida errores que dependen de múltiples campos (refine)
	 */
	private validateCrossFieldErrors() {
		if (!this.schema) return

		const schemaResult = ValidationHelper.validateSchema(this.schema, this.formData)
		if (!schemaResult.success) {
			const zodErrors = schemaResult.error.issues

			// Buscar errores para campos que han tenido errores previamente
			const fieldErrors = zodErrors.filter((err: any) => {
				const listPreviousErrorFields = Array.from(this.previousErrorFields)
				return listPreviousErrorFields.includes(err.path.join('.'))
			})

			if (fieldErrors.length > 0) {
				DOMHelper.applyErrorStyles(
					this.container,
					fieldErrors.map((err: any) => ({
						path: err.path.map(String),
						message: err.message
					}))
				)

				// Actualizar registro de errores usando el path completo
				fieldErrors.forEach((err: any) => {
					const fullPath = err.path.join('.')
					this.errors[fullPath] = [err.message]
				})
			}
		}
	}

	/**
	 * Notifica el estado de validación del formulario completo
	 * Usado para habilitar/deshabilitar el botón de submit en tiempo real
	 */
	private notifyValidationState() {
		if (!this.onValidateCallback) return

		// Determinar si hay errores actuales
		const hasErrors = Object.keys(this.errors).length > 0
		let isValid = !hasErrors

		// Validar con el schema completo si existe (solo campos visibles)
		if (this.schema && !hasErrors) {
			const result = ValidationHelper.validateSchema(this.schema, this.formData)
			if (!result.success) {
				isValid = false
			}
		}

		// Invocar callback con el estado actual
		this.onValidateCallback(isValid, this.formData, this.errors)
	}

	/**
	 * Maneja el submit del formulario
	 */
	private handleSubmit() {
		// Validar todos los campos
		this.validateAllFields(this.structure)

		// Determinar si hay errores
		const hasErrors = Object.keys(this.errors).length > 0
		let isValid = !hasErrors

		// Validar con el schema completo si existe (solo campos visibles)
		if (this.schema && !hasErrors) {
			const result = ValidationHelper.validateSchema(this.schema, this.formData)

			if (!result.success) {
				console.error('Errores de validación del schema:', result.error)
				this.displaySchemaErrors(result.error)
				isValid = false
			}
		}

		// Invocar callback onValidate si existe
		if (this.onValidateCallback) {
			this.onValidateCallback(isValid, this.formData, this.errors)
		}

		// Si no es válido, no continuar con onSubmit
		if (!isValid) {
			console.error('Errores de validación:', this.errors)
			return
		}

		// Enviar datos
		if (this.onSubmitCallback) {
			this.onSubmitCallback(this.formData)
		}
	}

	/**
	 * Valida todos los campos recursivamente
	 */
	private validateAllFields(structure: Structure, parentPath: string = '') {
		StructureUtil.validateAll(
			structure,
			(fieldPath, item) => {
				this.validateField(fieldPath, item)
			},
			parentPath
		)
	}

	/**
	 * Muestra errores del schema completo
	 */
	private displaySchemaErrors(error: ZodError) {
		;(error as any).errors.forEach((err: any) => {
			const fieldPath = err.path.join('.')
			const errorContainer = this.container.querySelector(`[data-error-for="${fieldPath}"]`)

			if (errorContainer) {
				errorContainer.textContent = err.message
				errorContainer.classList.add('visible')
			}

			const field = this.container.querySelector(`[data-field="${fieldPath}"]`)
			field?.classList.add('has-error')
		})
	}

	/**
	 * Obtiene un valor anidado usando un path con puntos
	 */
	private getNestedValue(obj: any, path: string): any {
		return NestedObjectUtil.get(obj, path)
	}

	/**
	 * Establece un valor anidado usando un path con puntos
	 */
	private setNestedValue(obj: any, path: string, value: any) {
		NestedObjectUtil.set(obj, path, value)
	}

	/**
	 * Obtiene los datos del formulario
	 */
	getData(): any {
		return { ...this.formData }
	}

	/**
	 * Obtiene los errores del formulario
	 */
	getErrors(): any {
		return { ...this.errors }
	}

	/**
	 * Establece valores en el formulario
	 */
	setData(data: Record<string, any>) {
		this.formData = { ...data }
		this.populateForm(data)
	}

	/**
	 * Establece propiedades de un campo
	 */
	setFieldProperty(
		fieldPath: TSchema extends zodOrigin.ZodObject<any> ? FieldPaths<InferSchemaType<TSchema>> : string,
		property: keyof NonNullable<StructureItem['properties']>,
		value: any,
		container?: HTMLElement
	) {
		// 1. Actualizar la estructura interna
		const structureItem = this.getStructureItem(fieldPath)
		if (!structureItem) {
			console.warn(`ClarifyJS: No se encontró el campo "${fieldPath}" en la estructura`)
			return
		}

		// Inicializar properties si no existe
		if (!structureItem.properties) {
			structureItem.properties = {}
		}
		// Actualizar el valor en la estructura
		if ((structureItem.properties as any)[property] === value && !container) return // Si hay un schema base, validar con él

		;(structureItem.properties as any)[property] = value

		// 2. Aplicar cambios visuales en el DOM
		const targetContainer = container || this.container
		const fieldElement = targetContainer.querySelector(`[data-field="${fieldPath}"]`) as HTMLElement
		if (!fieldElement) {
			console.warn(`ClarifyJS: No se encontró el elemento DOM para "${fieldPath}"`)
			return
		}

		// Validar si el campo es visible
		if (!ValidationHelper.isVisible(structureItem.properties)) delete this.errors[fieldPath]

		// Delegar actualización visual al helper
		DOMHelper.updateFieldProperty(fieldElement, property as string, value, (input, mask) => MaskHelper.applyMask(input, mask))

		// Si hay un schema base, validar con él
		if (this.baseSchema && !container) {
			this.schema = ValidationHelper.validateVisibleFieldsOnly(this.baseSchema, this.structure, this.formData)
		}
	}

	/**
	 * Obtiene un item de la estructura usando un path con puntos
	 */
	private getStructureItem(fieldPath: string): StructureItem | null {
		return StructureUtil.getItem(this.structure, fieldPath)
	}

	/**
	 * Puebla el formulario con datos
	 */
	private populateForm(data: Record<string, any>, prefix: string = '') {
		FormPopulateHelper.populate(this.container, data, prefix)
	}

	/**
	 * Método estático para crear formulario desde schema Zod
	 */
	static fromSchema<T extends zodOrigin.ZodObject<any>>(
		schema: T,
		config?: {
			el?: string | HTMLElement
			onSubmit?: (data: any) => void
			onChange?: (data: any, errors: any) => void
			onValidate?: (isValid: boolean, data: any, errors: any) => void
			components?: Record<string, ComponentConfig>
		}
	): ClarifyJS<T> {
		const structure = ZodExtractor.schemaToStructure(schema)
		return new ClarifyJS<T>(
			{
				structure,
				schema,
				onSubmit: config?.onSubmit,
				onChange: config?.onChange,
				onValidate: config?.onValidate,
				components: config?.components
			},
			config?.el
		)
	}
}

// También puedes exportar para usar como librería
export { ClarifyJS, ZodExtractor, z }
export type { Structure, StructureItem, FormConfig }

export type { ComponentConfig, RenderConfig } from './interface'
