/**
 * Helper para manipulación del DOM relacionada con errores y estados de campos
 */
export class DOMHelper {
	/**
	 * Muestra un mensaje de error en el contenedor de errores de un campo
	 */
	static showFieldError(container: HTMLElement, fieldPath: string, errors: string[]): void {
		const errorContainer = container.querySelector(`[data-error-for="${fieldPath}"]`)
		const field = container.querySelector(`[data-field="${fieldPath}"]`)
		const input = container.querySelector(`[name="${fieldPath}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

		if (errorContainer) {
			errorContainer.textContent = errors.join(', ')
			errorContainer.classList.remove('opacity-0')
			errorContainer.classList.add('opacity-100')
		}

		field?.classList.add('has-error')

		// Añadir clases de error al input
		if (input && !input.classList.contains('w-auto')) {
			input.classList.remove('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-100')
			input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-100')
		}
	}

	/**
	 * Limpia el mensaje de error de un campo
	 */
	static clearFieldError(container: HTMLElement, fieldPath: string): void {
		const errorContainer = container.querySelector(`[data-error-for="${fieldPath}"]`)
		const field = container.querySelector(`[data-field="${fieldPath}"]`)
		const input = container.querySelector(`[name="${fieldPath}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

		if (errorContainer) {
			errorContainer.textContent = ''
			errorContainer.classList.remove('opacity-100')
			errorContainer.classList.add('opacity-0')
		}

		field?.classList.remove('has-error')

		// Restaurar clases normales al input
		if (input && !input.classList.contains('w-auto')) {
			input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-100')
			input.classList.add('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-100')
		}
	}

	/**
	 * Aplica clases CSS de error a múltiples campos
	 */
	static applyErrorStyles(container: HTMLElement, errors: Array<{ path: string[]; message: string }>): void {
		errors.forEach((err) => {
			// Usar el path completo con puntos para campos anidados
			const fieldPath = err.path.join('.')
			const errorContainer = container.querySelector(`[data-error-for="${fieldPath}"]`)
			const field = container.querySelector(`[data-field="${fieldPath}"]`)
			const input = container.querySelector(`[name="${fieldPath}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

			if (errorContainer) {
				errorContainer.textContent = err.message
				errorContainer.classList.remove('opacity-0')
				errorContainer.classList.add('opacity-100')
			}

			field?.classList.add('has-error')

			if (input && !input.classList.contains('w-auto')) {
				input.classList.remove('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-100')
				input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-100')
			}
		})
	}

	/**
	 * Actualiza las propiedades visuales de un campo (visible, disabled, className, etc.)
	 */
	static updateFieldProperty(
		fieldElement: HTMLElement,
		property: string,
		value: any,
		applyMaskCallback?: (input: HTMLInputElement, mask: string | RegExp) => void
	): void {
		switch (property) {
			case 'visible':
				if (value) {
					fieldElement.style.display = ''
					fieldElement.removeAttribute('hidden')
				} else {
					fieldElement.style.display = 'none'
					fieldElement.setAttribute('hidden', 'true')
				}
				break

			case 'size':
				fieldElement.style.gridColumn = `span ${value}`
				break

			case 'disabled': {
				const input = fieldElement.querySelector('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
				if (input) {
					if (value) {
						input.setAttribute('disabled', 'true')
						input.classList.add('opacity-50', 'cursor-not-allowed')
					} else {
						input.removeAttribute('disabled')
						input.classList.remove('opacity-50', 'cursor-not-allowed')
					}
				}
				break
			}

			case 'className':
				if (typeof value === 'string') {
					// Remover clases personalizadas anteriores
					const previousClasses = fieldElement.getAttribute('data-custom-classes')
					if (previousClasses) {
						fieldElement.classList.remove(...previousClasses.split(' '))
					}

					// Agregar nuevas clases
					fieldElement.classList.add(...value.split(' '))
					fieldElement.setAttribute('data-custom-classes', value)
				}
				break

			case 'min':
			case 'max': {
				const numInput = fieldElement.querySelector("input[type='number']") as HTMLInputElement
				if (numInput) {
					numInput.setAttribute(property, String(value))
				}
				break
			}

			case 'options': {
				const select = fieldElement.querySelector('select') as HTMLSelectElement
				if (select && Array.isArray(value)) {
					select.innerHTML = ''
					value.forEach((option: { value: string | number; label: string }) => {
						const optionElement = document.createElement('option')
						optionElement.value = String(option.value)
						optionElement.textContent = option.label
						select.appendChild(optionElement)
					})
					select.value = ''
				}
				break
			}

			case 'mask': {
				const maskInput = fieldElement.querySelector('input') as HTMLInputElement
				if (maskInput && value && applyMaskCallback) {
					applyMaskCallback(maskInput, value)
				}
				break
			}

			default:
				// Para otras propiedades, actualizar el atributo
				fieldElement.setAttribute(`data-${property}`, String(value))
		}
	}
}
