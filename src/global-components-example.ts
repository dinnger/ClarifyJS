import { z, ClarifyJS } from "./index";
import { ToggleSwitch, StyledCheckbox } from "./custom-components";

// ==================== CONFIGURACIÓN GLOBAL DE COMPONENTES ====================

/**
 * Inicializar componentes globales para toda la aplicación
 * Esto se debe llamar UNA VEZ al inicio de tu aplicación, antes de crear cualquier formulario
 */
export function initializeGlobalComponents() {
  // Opción 1: Registrar componentes uno por uno
  ClarifyJS.registerComponent('boolean', ToggleSwitch);
  
  // Opción 2: Registrar múltiples componentes a la vez
  ClarifyJS.registerComponents({
    // Por tipo - todos los campos boolean usarán ToggleSwitch
    boolean: ToggleSwitch,
    
    // Por nombre de campo específico - sobrescribe el componente por tipo
    acceptTerms: StyledCheckbox,
    termsAndConditions: StyledCheckbox,
  });
  
  console.log("✅ Componentes globales registrados");
}

// ==================== EJEMPLO: FORMULARIO QUE USA COMPONENTES GLOBALES ====================

/**
 * Ejemplo 1: Formulario simple que hereda componentes globales
 */
export function simpleFormWithGlobalComponents() {
  const schema = z.object({
    username: z.string().min(3).label("Usuario"),
    email: z.string().email().label("Email"),
    
    // Usará ToggleSwitch (registrado globalmente para tipo boolean)
    notifications: z.boolean().label("Notificaciones"),
    
    // Usará StyledCheckbox (registrado globalmente por nombre)
    acceptTerms: z.boolean().label("Acepto términos"),
  });

  return ClarifyJS.fromSchema(schema, {
    onSubmit: (data) => {
      console.log("📦 Formulario simple:", data);
    }
  });
}

/**
 * Ejemplo 2: Formulario que sobrescribe componentes globales para campos específicos
 */
export function formWithOverrides() {
  const schema = z.object({
    name: z.string().label("Nombre"),
    
    // Usará ToggleSwitch (componente global)
    newsletter: z.boolean().label("Newsletter"),
    
    // Sobrescribir el componente global para este formulario específico
    premium: z.boolean().label("Membresía Premium"),
  });

  return ClarifyJS.fromSchema(schema, {
    components: {
      // Este componente solo se aplica a este formulario
      premium: StyledCheckbox,
    },
    onSubmit: (data) => {
      console.log("📦 Formulario con sobrescritura:", data);
    }
  });
}

/**
 * Ejemplo 3: Formulario de registro completo
 */
export function registrationFormExample() {
  const schema = z.object({
    firstName: z.string().min(2).label("Nombre"),
    lastName: z.string().min(2).label("Apellido"),
    email: z.string().email().label("Email"),
    password: z.string().min(8).label("Contraseña").password(),
    
    // Todos estos usarán componentes globales automáticamente
    emailNotifications: z.boolean().label("Notificaciones por email"),
    smsNotifications: z.boolean().label("Notificaciones por SMS"),
    acceptTerms: z.boolean()
      .refine(val => val === true, { message: "Debes aceptar los términos" })
      .label("Acepto términos y condiciones"),
    acceptPrivacy: z.boolean()
      .refine(val => val === true, { message: "Debes aceptar la política de privacidad" })
      .label("Acepto política de privacidad"),
  });

  return ClarifyJS.fromSchema(schema, {
    onValidate: (isValid) => {
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
    },
    onSubmit: (data) => {
      console.log("✅ Registro completado:", data);
      alert("¡Registro exitoso!");
    }
  });
}
