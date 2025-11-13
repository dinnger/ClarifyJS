import { z, ClarifyJS } from "./index";
import { ToggleSwitch, StyledCheckbox } from "./custom-components";

// ==================== EJEMPLO: FORMULARIO CON COMPONENTES PERSONALIZADOS ====================
export function customComponentsExample() {
  const customSchema = z.object({
    username: z.string()
      .min(3, "Mínimo 3 caracteres")
      .label("Nombre de Usuario"),
    
    email: z.string()
      .email("Email inválido")
      .label("Correo Electrónico"),
    
    // Toggle switch (se aplicará el componente por tipo boolean desde config)
    enableNotifications: z.boolean()
     .refine(val => val === true, {
        message: "Debes activar las notificaciones",
      })
      .label("Notificaciones"),
    
    // Checkbox estilizado (se aplicará desde config con nombre específico)
    acceptTerms: z.boolean()
      .refine(val => val === true, {
        message: "Debes aceptar los términos",
      })
      .label("Términos y Condiciones"),
    
    // Checkbox normal (sin componente personalizado, usará default)
    newsletter: z.boolean()
      .label("Suscribirse al boletín"),
    
    // Otro checkbox que usará el componente por defecto
    twoFactorAuth: z.boolean()
    .refine(val => val === true, {
        message: "Debes aceptar los términos",
      })
      .label("Autenticación de dos factores"),
  });

  return ClarifyJS.fromSchema(customSchema, {
    // Configurar componentes personalizados para esta instancia
    components: {
      boolean: ToggleSwitch,  // Todos los booleanos usarán toggle por defecto
      acceptTerms: StyledCheckbox,  // Campo específico usa checkbox estilizado
    },
    onValidate: (isValid) => {
      console.log("🔍 Componentes personalizados - Válido:", isValid);
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
    },
    onSubmit: (data) => {
      console.log("✅ Datos con componentes personalizados:", data);
      alert("¡Formulario enviado! Ver consola.");
    },
    onChange: (data,error) => {
      console.log("📝 Cambio detectado:", data);
      console.log("📝 Errores detectados:", error);
    },
  });
}
