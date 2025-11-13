import type { ComponentConfig, ZodTypeAny } from "./index";
import type { z  } from "zod";

// ==================== TIPOS ====================
type Structure = {
  [key: string]: StructureItem;
};

interface StructureItem {
  type: "text" | "number" | "email" | "password" | "textarea" | "select" | "boolean" |  "section" | "box";
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  properties?: {
    visible?: boolean;
    disabled?: boolean;
    min?: number;
    max?: number;
    size?: number; 
    className?: string;
    placeholder?: string;
    options?: Array<{ value: string | number; label: string }>;
    mask?: string | RegExp;
  };
  isPassword?: boolean;
  customComponent?: ComponentConfig;
  children?: Structure;
  validation?: ZodTypeAny;
}

interface FormConfig {
  structure: Structure;
  schema?: z.ZodObject<any> | undefined;
  onSubmit?: ((data: any) => void) | undefined;
  onChange?: ((data: any, errors: any) => void) | undefined;
  onValidate?: ((isValid: boolean, data: any, errors: any) => void) | undefined;
  components?: Record<string, ComponentConfig> | undefined;
}


export type {  Structure, StructureItem, FormConfig };