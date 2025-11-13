/**
 * Archivo central de exportación de componentes
 */

export { TextInput } from './TextInput';
export { TextArea } from './TextArea';
export { SelectInput } from './SelectInput';
export { CheckboxInput } from './CheckboxInput';
export { PasswordInput } from './PasswordInput';

export type { ComponentConfig, RenderConfig } from './types';

/**
 * Mapa de componentes por defecto por tipo
 */
import { TextInput } from './TextInput';
import { TextArea } from './TextArea';
import { SelectInput } from './SelectInput';
import { CheckboxInput } from './CheckboxInput';
import { PasswordInput } from './PasswordInput';
import type { ComponentConfig } from './types';

export const DefaultComponents: Record<string, ComponentConfig> = {
  // Tipos de Zod
  string: TextInput,
  number: TextInput,
  boolean: CheckboxInput,
  
  // Tipos de HTML (legacy)
  text: TextInput,
  email: TextInput,
  password: PasswordInput,
  textarea: TextArea,
  select: SelectInput,
  enum: SelectInput,
};
