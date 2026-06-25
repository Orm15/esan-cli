/**
 * Modelos de dominio. Tipos puros, sin dependencias de infraestructura.
 * Reflejan los datos mapeados en RECON.md.
 */

export interface Alumno {
  codigo: string; // 8 dígitos; también es el `username` del login
  nombre: string;
  rol: string; // p.ej. "ALUMNO" (rol interno "alupre")
}

export interface ComponenteEvaluacion {
  nombre: string;
  peso: number | null; // porcentaje (ej. 30) o null si no aplica
  nota: number | null;
}

export interface CursoNota {
  curso: string;
  componentes: ComponenteEvaluacion[];
  promedio: number | null;
}

export interface SesionHorario {
  dia: string;
  curso: string;
  inicio: string; // "HH:mm"
  fin: string;
  aula?: string;
  profesor?: string;
}

export interface Curso {
  id: string; // courseId de Moodle
  nombre: string;
  ciclo: string; // p.ej. "2025-2"
  url: string;
}

export type TipoMaterial = "resource" | "page" | "url" | "forum" | "assign" | "quiz" | "otro";

export interface Material {
  cmid: string;
  tipo: TipoMaterial;
  nombre: string;
  url: string;
  seccion: string;
}

export interface Grabacion {
  curso: string;
  titulo: string;
  enlace: string; // link de la grabación (Zoom)
  clave: string | null; // "Clave de acceso"
}

export interface Pago {
  descripcion: string;
  moneda: string; // p.ej. "S/." o "US$"
  monto: string; // p.ej. "8500.00"
  vencimiento: string;
}

export interface Sala {
  nombre: string;
  disponible: boolean;
  horario?: string;
}

export interface Credenciales {
  usuario: string;
  password: string;
}

/** Sesión persistida: el cookie jar serializado + metadatos. Nunca contiene la contraseña. */
export interface Sesion {
  usuario: string; // código del alumno dueño de la sesión (para reconciliar identidad)
  cookies: string; // jar serializado (tough-cookie)
  creadaEn: number; // epoch ms
  expiraEn: number | null;
}
