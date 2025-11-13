import { ClarifyJS, z } from "./index";
import type { Structure } from "./index";

// ==================== EJEMPLO 1: FORMULARIO DE REGISTRO ====================
export function registrationFormExample() {
  const registrationSchema = z.object({
    firstName: z.string().min(2, "Mínimo 2 caracteres").label("Nombre").style({size:6}),
    lastName: z.string().min(2, "Mínimo 2 caracteres").label("Apellido").style({size:6}),
    email: z.string().email("Email inválido").label("Correo Electrónico"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").label("Contraseña Segura"),
    confirmPassword: z.string().label("Confirmar Contraseña"),
    age: z.number().min(18, "Debes ser mayor de edad").max(120).label("Edad"),
    country: z.enum(["México", "USA", "España", "Argentina"]).label("País"),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: "Debes aceptar los términos",
    }).label("Acepto términos y condiciones"),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

  return ClarifyJS.fromSchema(registrationSchema, {
    onSubmit: (data) => {
      console.log("Registro exitoso:", data);
      alert("¡Registro exitoso! Ver consola.");
    },
  });
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
    }),
    phone: z.string().regex(/^\d{10}$/, "Teléfono debe tener 10 dígitos"),
  });

  return ClarifyJS.fromSchema(addressSchema, {
    onSubmit: (data) => {
      console.log("Dirección guardada:", data);
      alert("¡Dirección guardada! Ver consola.");
    },
  });
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
    onSubmit: (data) => {
      console.log("Producto creado:", data);
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
    onSubmit: (data) => {
      console.log("Perfil actualizado:", data);
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
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial");

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
    onSubmit: (data) => {
      console.log("Validación exitosa:", data);
      alert("¡Todas las validaciones pasaron! Ver consola.");
    },
  });
}
