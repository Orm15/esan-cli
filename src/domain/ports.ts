/**
 * Puertos (interfaces) del dominio. Los adapters de infraestructura los implementan.
 * El dominio no conoce cheerio, got ni el keychain: solo estos contratos.
 */
import type {
  Alumno,
  Credenciales,
  Curso,
  CursoNota,
  Grabacion,
  Material,
  Pago,
  Sala,
  Sesion,
  SesionHorario,
} from "./models";

// --- Driven ports (lo que el dominio necesita de la infraestructura) ---

export interface AuthPort {
  login(cred: Credenciales): Promise<Sesion>;
  isSessionAlive(sesion: Sesion): Promise<boolean>;
}

export interface PortalAcademicoPort {
  getPerfil(sesion: Sesion): Promise<Alumno>;
  getNotasActuales(sesion: Sesion): Promise<CursoNota[]>;
  getHorario(sesion: Sesion): Promise<SesionHorario[]>;
  getCronogramaPagos(sesion: Sesion): Promise<Pago[]>;
  getSalasDisponibles(sesion: Sesion, codigosAcompanantes: string[]): Promise<Sala[]>;
}

export interface AulaVirtualPort {
  listarCursos(sesion: Sesion): Promise<Curso[]>;
  getMaterial(sesion: Sesion, courseId: string): Promise<Material[]>;
  getGrabaciones(sesion: Sesion, courseId: string): Promise<Grabacion[]>;
}

export interface CredentialStorePort {
  isAvailable(): Promise<boolean>;
  get(usuario: string): Promise<string | null>;
  set(usuario: string, password: string): Promise<void>;
  clear(usuario: string): Promise<void>;
}

export interface SessionStorePort {
  load(): Promise<Sesion | null>;
  save(sesion: Sesion): Promise<void>;
  clear(): Promise<void>;
}

export interface OutputPort {
  render<T>(data: T, opts: { json: boolean }): void;
}
