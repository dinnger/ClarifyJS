# ClarifyJS 🚀

**Librería TypeScript para crear formularios dinámicos con validación automática usando Zod y Tailwind CSS**

ClarifyJS te permite crear formularios HTML completos desde esquemas Zod o estructuras JSON, con validación en tiempo real, estilos con Tailwind CSS y una API simple e intuitiva.

## ✨ Características

- 🎯 **Generación automática desde Zod**: Convierte esquemas Zod en formularios funcionales
- ✅ **Validación en tiempo real**: Validación mientras el usuario escribe y al perder foco
- 🎨 **Tailwind CSS integrado**: Estilos modernos y responsivos con Tailwind CSS
- 🔄 **Soporte para campos anidados**: Objetos y estructuras complejas
- 📦 **TypeScript nativo**: Tipos completos y autocompletado
- 🎛️ **Altamente configurable**: Personaliza labels, placeholders, descripciones
- 🌐 **Múltiples tipos de input**: text, number, email, password, textarea, select, checkbox
- 🎯 **Montaje automático**: Especifica el elemento donde se montará el formulario

## 📦 Instalación

```bash
npm install zod tailwindcss
# ClarifyJS está incluido en el proyecto
```

## 🚀 Uso Rápido

### 1. Desde un Schema Zod con Selector de Elemento (Recomendado)

```typescript
import { z } from "zod";
import { ClarifyJS } from "./clarifyjs";

// Define tu schema Zod
const userSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  age: z.number().min(18, "Debes ser mayor de edad"),
});

// Crea el formulario automáticamente con selector de elemento
const form = ClarifyJS.fromSchema(userSchema, {
  el: "#root", // Selector CSS o elemento DOM donde se montará
  labels: {
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo Electrónico",
    age: "Edad",
  },
  onSubmit: (data) => {
    console.log("Datos validados:", data);
    // Enviar a tu API
  },
  onChange: (data, errors) => {
    console.log("Datos actuales:", data);
    console.log("Errores:", errors);
  },
});

// Se monta automáticamente en el elemento especificado
form.render();

// O también puedes montarlo manualmente sin especificar 'el':
// document.getElementById("root")?.appendChild(form.render());
```

### 2. Con Elemento DOM Directo

```typescript
const targetElement = document.getElementById("form-container");

const form = ClarifyJS.fromSchema(userSchema, {
  el: targetElement, // También acepta un elemento DOM directamente
  onSubmit: (data) => console.log(data),
});

form.render();
```

### 2. Desde Estructura JSON

```typescript
import { ClarifyJS, Structure } from "./clarifyjs";

const structure: Structure = {
  email: {
    type: "email",
    label: "Email",
    placeholder: "tu@email.com",
    required: true,
    description: "Ingresa tu correo electrónico",
  },
  password: {
    type: "password",
    label: "Contraseña",
    required: true,
    properties: {
      min: 8,
    },
  },
  bio: {
    type: "textarea",
    label: "Biografía",
    placeholder: "Cuéntanos sobre ti...",
    size: 12,
  },
};

const form = new ClarifyJS({
  structure,
  onSubmit: (data) => console.log(data),
});

document.getElementById("root")?.appendChild(form.render());
```

## 📚 Tipos de Campos Soportados

| Tipo | Descripción | Ejemplo Zod |
|------|-------------|-------------|
| `text` | Input de texto | `z.string()` |
| `number` | Input numérico | `z.number()` |
| `email` | Input de email | `z.string().email()` |
| `password` | Input de contraseña | `z.string()` |
| `textarea` | Área de texto | `z.string()` |
| `select` | Selector dropdown | `z.enum()` |
| `checkbox` | Casilla de verificación | `z.boolean()` |
| `section` | Contenedor visual | - |
| `box` | Contenedor con borde | Objetos anidados |

## 🎨 Estructura de Campos

```typescript
interface StructureItem {
  type: "text" | "number" | "email" | "password" | "textarea" | "select" | "checkbox" | "section" | "box";
  label?: string;              // Etiqueta del campo
  size?: number;               // Tamaño en grid (1-12)
  placeholder?: string;        // Texto placeholder
  description?: string;        // Texto de ayuda
  required?: boolean;          // Campo obligatorio
  properties?: {
    disabled?: boolean;        // Campo deshabilitado
    min?: number;             // Valor/longitud mínima
    max?: number;             // Valor/longitud máxima
    options?: Array<{         // Para tipo select
      value: string | number;
      label: string;
    }>;
  };
  children?: Structure;        // Para secciones y boxes
  validation?: z.ZodTypeAny;  // Schema Zod para validación
}
```

## 🔥 Ejemplos Avanzados

### Formulario con Objetos Anidados

```typescript
const addressSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.number().int(),
  }),
});

const form = ClarifyJS.fromSchema(addressSchema, {
  onSubmit: (data) => {
    console.log(data);
    // {
    //   user: { name: "...", email: "..." },
    //   address: { street: "...", city: "...", zipCode: 12345 }
    // }
  },
});
```

### Formulario con Select (Enum)

```typescript
const formSchema = z.object({
  country: z.enum(["USA", "México", "España", "Argentina"]),
  role: z.enum(["admin", "user", "guest"]),
});

const form = ClarifyJS.fromSchema(formSchema);
```

### Formulario con Validaciones Personalizadas

```typescript
const schema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
  
  age: z
    .number()
    .min(18, "Debes ser mayor de edad")
    .max(100, "Edad inválida"),
  
  website: z
    .string()
    .url("URL inválida")
    .optional(),
});
```

### Estructura con Secciones

```typescript
const structure: Structure = {
  personalInfo: {
    type: "section",
    label: "Información Personal",
    children: {
      firstName: {
        type: "text",
        label: "Nombre",
        size: 6,
      },
      lastName: {
        type: "text",
        label: "Apellido",
        size: 6,
      },
    },
  },
  contactInfo: {
    type: "box",
    label: "Información de Contacto",
    children: {
      email: {
        type: "email",
        label: "Email",
        size: 12,
      },
      phone: {
        type: "text",
        label: "Teléfono",
        size: 12,
      },
    },
  },
};
```

## 🎛️ API

### `ClarifyJS.fromSchema(schema, config)`

Crea un formulario desde un schema Zod.

**Parámetros:**
- `schema`: Schema de Zod (ZodObject)
- `config`:
  - `el?`: Selector CSS (string) o elemento DOM donde montar el formulario
  - `labels?`: Objeto con labels personalizados por campo
  - `onSubmit?`: Callback cuando el formulario es válido
  - `onChange?`: Callback en cada cambio de campo

**Retorna:** Instancia de ClarifyJS

**Ejemplo:**
```typescript
const form = ClarifyJS.fromSchema(mySchema, {
  el: "#app", // Se monta automáticamente en este elemento
  onSubmit: (data) => console.log(data),
});
form.render();
```

### `new ClarifyJS(config, el?)`

Crea un formulario desde una estructura JSON.

**Parámetros:**
- `config.structure`: Estructura del formulario
- `config.schema?`: Schema Zod opcional para validación completa
- `config.onSubmit?`: Callback de envío
- `config.onChange?`: Callback de cambio
- `el?`: Selector CSS o elemento DOM (opcional)

**Ejemplo:**
```typescript
const form = new ClarifyJS({
  structure: myStructure,
  onSubmit: (data) => console.log(data),
}, "#form-container");
form.render();
```

### Métodos de Instancia

#### `form.render(): HTMLElement`
Renderiza el formulario y retorna el elemento DOM.

#### `form.getData(): any`
Obtiene los datos actuales del formulario.

#### `form.getErrors(): any`
Obtiene los errores actuales de validación.

#### `form.setData(data: Record<string, any>): void`
Establece valores en el formulario programáticamente.

```typescript
form.setData({
  firstName: "Juan",
  email: "juan@example.com",
  age: 25,
});
```

#### `form.setFieldProperty(fieldPath, property, value): void`
Cambia dinámicamente las propiedades de cualquier campo del formulario en tiempo real.

```typescript
// Ocultar/mostrar campos
form.setFieldProperty("companyName", "visible", false);

// Cambiar tamaño del grid (1-12 columnas)
form.setFieldProperty("email", "size", 12);

// Habilitar/deshabilitar campos
form.setFieldProperty("zipCode", "disabled", true);

// Actualizar opciones de un select
form.setFieldProperty("country", "options", [
  { value: "mx", label: "México" },
  { value: "us", label: "USA" }
]);

// Cambiar límites min/max
form.setFieldProperty("age", "min", 18);
form.setFieldProperty("age", "max", 65);

// Aplicar clases CSS personalizadas
form.setFieldProperty("email", "className", "bg-yellow-100 border-yellow-500");

// Cambiar máscaras
form.setFieldProperty("phone", "mask", "###-###-####");
```

**Propiedades soportadas**: `visible`, `size`, `disabled`, `className`, `min`, `max`, `options`, `mask`

**📖 Ver guía completa**: [SETFIELDPROPERTY_GUIDE.md](./SETFIELDPROPERTY_GUIDE.md) | **🎮 Demo interactiva**: `setfieldproperty-demo.html`

## 🎨 Personalización de Estilos

ClarifyJS usa **Tailwind CSS** para todos sus estilos. Puedes personalizar la apariencia de varias formas:

### 1. Usando el archivo `tailwind.config.js`

```javascript
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./dist/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        // ...más colores personalizados
      },
    },
  },
  plugins: [],
}
```

### 2. Sobrescribiendo clases CSS

```css
/* Personaliza el formulario */
.clarifyjs-form {
  @apply bg-gray-50 p-6 rounded-xl shadow-2xl;
}

/* Personaliza los campos */
.clarifyjs-field input {
  @apply border-purple-300 focus:border-purple-500;
}

/* Personaliza los errores */
.clarifyjs-error {
  @apply text-red-600 font-medium;
}

/* Personaliza el botón */
.clarifyjs-submit {
  @apply bg-gradient-to-r from-purple-500 to-blue-500;
}
```

### 3. Clases de Tailwind aplicadas por defecto

- **Formulario**: `bg-white p-8 rounded-lg shadow-lg`
- **Inputs**: `w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100`
- **Botón Submit**: `w-full bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600`
- **Errores**: `text-xs text-red-500 transition-opacity`

## 🔧 Sistema de Grid

ClarifyJS usa un sistema de grid de 12 columnas. Usa la propiedad `size` para controlar el ancho:

```typescript
{
  firstName: {
    type: "text",
    size: 6,  // Ocupa 6/12 columnas (50%)
  },
  lastName: {
    type: "text",
    size: 6,  // Ocupa 6/12 columnas (50%)
  },
  bio: {
    type: "textarea",
    size: 12,  // Ocupa 12/12 columnas (100%)
  },
}
```

## 🔍 Extractor de Validaciones

La clase `ZodExtractor` permite extraer información de schemas Zod:

```typescript
import { ZodExtractor } from "./clarifyjs";

const schema = z.string().email().min(5).max(50);
const info = ZodExtractor.extractValidationInfo(schema);

console.log(info);
// {
//   required: true,
//   type: "ZodString",
//   isEmail: true,
//   minLength: 5,
//   maxLength: 50
// }
```

## 🌟 Ejemplo Completo

```typescript
import { z } from "zod";
import { ClarifyJS } from "./clarifyjs";

const registrationSchema = z.object({
  // Información personal
  firstName: z.string().min(2, "Muy corto").max(50),
  lastName: z.string().min(2, "Muy corto").max(50),
  email: z.string().email("Email inválido"),
  
  // Información de cuenta
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  
  // Información adicional
  age: z.number().min(18, "Debes ser mayor de edad"),
  country: z.enum(["USA", "México", "España", "Argentina"]),
  
  // Opcionales
  bio: z.string().max(500).optional(),
  newsletter: z.boolean().optional(),
  
  // Anidado
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.number().int(),
  }),
});

const form = ClarifyJS.fromSchema(registrationSchema, {
  labels: {
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo Electrónico",
    username: "Nombre de Usuario",
    password: "Contraseña",
    age: "Edad",
    country: "País",
    bio: "Biografía",
    newsletter: "Suscribirse al newsletter",
    address: "Dirección",
    street: "Calle",
    city: "Ciudad",
    zipCode: "Código Postal",
  },
  
  onSubmit: async (data) => {
    console.log("Formulario válido:", data);
    
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        alert("¡Registro exitoso!");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  },
  
  onChange: (data, errors) => {
    // Actualizar UI en tiempo real si es necesario
    console.log("Datos:", data);
    console.log("Errores:", errors);
  },
});

// Renderizar
document.getElementById("app")?.appendChild(form.render());

// Opcional: Pre-llenar con datos
form.setData({
  firstName: "Juan",
  country: "México",
});
```

## 🎨 Componentes Personalizados

ClarifyJS permite personalizar completamente el aspecto de tus formularios con tres niveles de personalización:

### 1. Componentes Globales (Recomendado para temas)

Registra componentes una vez al inicio de tu aplicación y todos los formularios los heredarán:

```typescript
import { ClarifyJS } from "./clarifyjs";
import { ToggleSwitch, StyledCheckbox } from "./my-components";

// En tu main.ts o index.ts
ClarifyJS.registerComponents({
  boolean: ToggleSwitch,           // Todos los booleanos usan toggle
  acceptTerms: StyledCheckbox,     // Campo específico usa checkbox estilizado
});

// Ahora TODOS los formularios usan estos componentes automáticamente
const form = ClarifyJS.fromSchema(schema, {
  onSubmit: (data) => console.log(data)
});
```

### 2. Componentes por Instancia

Personaliza componentes solo para un formulario específico:

```typescript
const form = ClarifyJS.fromSchema(schema, {
  components: {
    boolean: MyCustomToggle,      // Sobrescribe el global para este formulario
    premium: PremiumCheckbox,     // Solo el campo "premium" usa este componente
  },
  onSubmit: (data) => console.log(data)
});
```

### 3. Componentes por Campo (Zod)

Asigna un componente directamente a un campo en el schema:

```typescript
const schema = z.object({
  notifications: z.boolean()
    .label("Notificaciones")
    .component(ToggleSwitch),  // Solo este campo usa ToggleSwitch
});
```

### Crear Componentes Personalizados

```typescript
import type { ComponentConfig } from "./clarifyjs";

export const ToggleSwitch: ComponentConfig = {
  render: (config) => {
    // Crear y retornar elemento HTML
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = config.fieldPath;
    // ... tu lógica personalizada
    return wrapper;
  },
  getValue: (element) => {
    return element.querySelector('input')?.checked || false;
  },
  setValue: (element, value) => {
    const input = element.querySelector('input');
    if (input) input.checked = Boolean(value);
  }
};
```

**📖 Ver documentación completa**: [COMPONENTS_GUIDE.md](./COMPONENTS_GUIDE.md)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC License - ver el archivo LICENSE para más detalles

## 👤 Autor

**Dinnger**

- GitHub: [@dinnger](https://github.com/dinnger)

## 🙏 Agradecimientos

- [Zod](https://github.com/colinhacks/zod) - Librería de validación TypeScript
- La comunidad de TypeScript

---

Hecho con ❤️ por Dinnger
