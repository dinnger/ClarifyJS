import { ClarifyJS, z } from "./index";

// ==================== EJEMPLO 1: FORMULARIO DE REGISTRO ====================
export function registrationFormExample() {
  const registrationSchema = z.object({
    firstName: z.string('El nombre es obligatorio').min(2, "Mínimo 2 caracteres").label("Nombre").properties({size:6}).optional(),
    lastName: z.string().min(2, "Mínimo 2 caracteres").label("Apellido").properties({size:6}).optional(),
    email: z.string().email("Email inválido").label("Correo Electrónico"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").label("Contras Segura").password(),
    confirmPassword: z.string().label("Confirmar Contraseña").password(),
    country: z.enum({mx: "México", us: "USA", es: "España", ar: "Argentina"}).label("País"),
    zipCode: z.string().length(5, "Código postal debe ser 5 dígitos").label("Código Postal").properties({mask: "#####"}),
    acceptTerms: z.boolean().properties({size:5,placeholder: "Acepto los términos y condiciones"})
    .refine(data => data === true, {
      message: "Debes aceptar los términos y condiciones",
      path: ["acceptTerms"],
    }),
    age: z.number().min(18, "Debes ser mayor de edad").max(120).label("Edad").properties({visible:false}),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

  const form = ClarifyJS.fromSchema(registrationSchema, {
    onValidate: (isValid, data, errors) => {
      // Este callback se puede usar con frameworks reactivos
      // Vue: ref(isValid) / React: setState(isValid) / Angular: signal(isValid)
      console.log("🔍 Validación ejecutada:", { isValid, data, errors });
      
      // Actualizar el estado del botón de submit
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
      
      // Ejemplo de integración con frameworks:
      // Vue 3: formValidSignal.value = isValid
      // React: setFormValid(isValid)
      // Angular: formValidSignal.set(isValid)
    },
    onChange: (data, errors) => {
      console.log("Cambio detectado:", { data, errors });
      
      // Mostrar/ocultar campo age según firstName tenga valor
      if (data.firstName && data.firstName !== "") {
        form.setFieldProperty("age", "visible", true);
      } else {
        form.setFieldProperty("age", "visible", false);
      }
      
    },
    onSubmit: (data) => {
      console.log("✅ Registro exitoso:", data);
      alert("¡Registro exitoso! Ver consola.");
    },
  });

  return form;
}


// ==================== EJEMPLO 3: FORMULARIO CON DIRECCIÓN ====================
export function addressFormExample() {
  const addressSchema = z.object({
    fullName: z.string().min(3, "Nombre muy corto"),
    address: z.object({
      street: z.string().min(5, "Dirección inválida"),
      number: z.number().int().positive("Número inválido"),
      city: z.string().min(2, "Ciudad inválida"),
      state: z.string().min(2, "Estado inválido"),
      zipCode: z.number().int().min(10000).max(99999, "Código postal inválido"),
    }).label('Seccion'),
    phone: z.string().regex(/^\d{10}$/, "Teléfono debe tener 10 dígitos"),
  });

  const form =  ClarifyJS.fromSchema(addressSchema, {
    onValidate: (isValid, _data, errors) => {
      console.log("🔍 Estado de validación:", isValid ? "✅ Válido" : "❌ Inválido");
      if (!isValid) {
        console.log("Errores encontrados:", errors);
      }
      // Actualizar el estado del botón de submit
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
    },
    onChange: (data, errors) => {
      console.log("Cambio detectado:", { data, errors });
      
      // Mostrar/ocultar campo número según fullName tenga valor
      if (data.fullName && data.fullName !== "") {
        form.setFieldProperty("address.number", "visible", true);
        form.setFieldProperty("address.street", "size", 6); // Reducir tamaño de street
      } else {
        form.setFieldProperty("address.number", "visible", false);
        form.setFieldProperty("address.street", "size", 12); // Full width cuando number está oculto
      }
      
      // Deshabilitar zipCode si no hay ciudad
      if (data.address?.city) {
        form.setFieldProperty("address.zipCode", "disabled", false);
      } else {
        form.setFieldProperty("address.zipCode", "disabled", true);
      }
    },
    onSubmit: (data) => {
      console.log("✅ Dirección guardada:", data);
      alert("¡Dirección guardada! Ver consola.");
    },
  });
  return form;
}

// ==================== EJEMPLO 4: FORMULARIO DE PRODUCTO ====================
export function productFormExample() {
  const productSchema = z.object({
    productName: z.string().min(3, "Nombre muy corto").max(100),
    description: z.string().max(500, "Descripción muy larga").optional(),
    price: z.number().min(0.01, "Precio debe ser mayor a 0"),
    category: z.enum(["Electrónica", "Ropa", "Hogar", "Deportes", "Juguetes"]),
    stock: z.number().int().min(0, "Stock no puede ser negativo"),
    isActive: z.boolean(),
    discount: z.number().min(0).max(100, "Descuento entre 0 y 100").optional(),
  });

  return ClarifyJS.fromSchema(productSchema, {
    onValidate: (isValid) => {
      // Signal simple para frameworks reactivos
      console.log("🔍 Formulario válido:", isValid);
      // Actualizar el estado del botón de submit
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
    },
    onSubmit: (data) => {
      console.log("✅ Producto creado:", data);
      alert("¡Producto creado! Ver consola.");
    },
  });
}

// ==================== EJEMPLO 5: FORMULARIO DE PERFIL DE USUARIO ====================
export function userProfileExample() {
  const profileSchema = z.object({
    username: z.string()
      .min(3, "Mínimo 3 caracteres")
      .max(20, "Máximo 20 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
    email: z.string().email("Email inválido"),
    bio: z.string().max(500, "Biografía muy larga").optional(),
    website: z.string().url("URL inválida").optional(),
    socialMedia: z.object({
      twitter: z.string().optional(),
      github: z.string().optional(),
      linkedin: z.string().optional(),
    }),
    preferences: z.object({
      newsletter: z.boolean(),
      notifications: z.boolean(),
      publicProfile: z.boolean(),
    }),
  });

  return ClarifyJS.fromSchema(profileSchema, {
    onValidate: (isValid) => {
      console.log("🔍 Perfil válido:", isValid);
      // Actualizar el estado del botón de submit
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
    },
    onSubmit: (data) => {
      console.log("✅ Perfil actualizado:", data);
      alert("¡Perfil actualizado! Ver consola.");
    },
    onChange: (data, errors) => {
      console.log("Cambio detectado:", { data, errors });
    },
  });
}

// ==================== EJEMPLO 6: FORMULARIO CON VALIDACIONES CUSTOM ====================
export function customValidationExample() {
  const passwordSchema = z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial")
    .password();

  const customSchema = z.object({
    email: z.string().email("Email inválido"),
    password: passwordSchema,
    username: z.string()
      .min(3)
      .max(20)
      .regex(/^[a-zA-Z0-9_]+$/, "Solo alfanuméricos y guión bajo"),
    age: z.number()
      .min(13, "Debes tener al menos 13 años")
      .max(120, "Edad inválida"),
    website: z.string().url("URL inválida").or(z.literal("")),
  });

  return ClarifyJS.fromSchema(customSchema, {
    onValidate: (isValid) => {
      console.log("🔍 Validaciones custom:", isValid ? "✅ Todas pasaron" : "❌ Hay errores");
      // Actualizar el estado del botón de submit
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
    },
    onSubmit: (data) => {
      console.log("✅ Validación exitosa:", data);
      alert("¡Todas las validaciones pasaron! Ver consola.");
    },
  });
}

// ==================== EJEMPLO 7: FORMULARIO CON MÁSCARAS ====================
export function masksExample() {
  const masksSchema = z.object({
    phone: z.string()
      .length(10, "Teléfono debe tener 10 dígitos")
      .label("Teléfono")
      .properties({mask: "###-###-####"}),
    
    accountNumber: z.string()
      .regex(/^[1-6]\d{0,5}$/, "Debe iniciar con 1-6 y máximo 6 dígitos")
      .label("Número de cuenta (1-6 + hasta 5 dígitos)")
      .properties({mask: /^[1-6]\d{0,5}$/}),
    
    zipCode: z.string()
      .length(5, "Código postal debe ser 5 dígitos")
      .label("Código Postal")
      .properties({mask: "#####"}),
    
    creditCard: z.string()
      .length(16, "Tarjeta debe tener 16 dígitos")
      .label("Tarjeta de Crédito")
      .properties({mask: "####-####-####-####"}),
    
    password: z.string()
      .min(8, "Mínimo 8 caracteres")
      .label("Contraseña con Toggle")
      .regex(/[A-Z]/, "Debe contener mayúscula")
      .regex(/[0-9]/, "Debe contener número")
      .password(),
  });

  return ClarifyJS.fromSchema(masksSchema, {
    onValidate: (isValid) => {
      console.log("🔍 Máscaras válidas:", isValid);
      if (typeof window !== 'undefined' && (window as any).updateSubmitButton) {
        (window as any).updateSubmitButton(isValid);
      }
    },
    onSubmit: (data) => {
      console.log("✅ Datos con máscaras:", data);
      alert("¡Datos enviados! Ver consola.");
    },
  });
}
