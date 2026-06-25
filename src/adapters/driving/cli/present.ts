import pc from "picocolors";
import type {
  Alumno,
  Curso,
  CursoNota,
  Grabacion,
  Material,
  Pago,
  SesionHorario,
} from "../../../domain/models";
import type { IO } from "./io";
import { construirTabla, renderTabla } from "./table";

const dash = (s: string | null | undefined): string => (s ? s : "—");

/** Perfil: vista clave-valor (un solo registro, no tabla). */
export function printPerfil(io: IO, a: Alumno): void {
  io.info(`Código:  ${a.codigo || "—"}`);
  io.info(`Nombre:  ${a.nombre || "—"}`);
  io.info(`Rol:     ${a.rol || "—"}`);
}

/**
 * Notas: una tabla componente/peso/nota por curso + promedio (el modelo es anidado; el render
 * genérico no le hace justicia). La tabla interna es responsive.
 */
export function printNotas(io: IO, cursos: CursoNota[]): void {
  if (cursos.length === 0) {
    io.info("No hay notas para mostrar.");
    return;
  }
  for (const curso of cursos) {
    io.info("");
    io.info(pc.bold(curso.curso));
    io.info(
      construirTabla(
        [
          { header: "Componente", key: "nombre", min: 16 },
          { header: "Peso", key: "peso", max: 6, protegida: true },
          { header: "Nota", key: "nota", max: 6, protegida: true },
        ],
        curso.componentes.map((c) => ({
          nombre: c.nombre,
          peso: c.peso === null ? "—" : `${c.peso}%`,
          nota: c.nota === null ? "—" : c.nota,
        })),
      ),
    );
    io.info(`Promedio general: ${pc.bold(curso.promedio === null ? "—" : String(curso.promedio))}`);
  }
}

export function printHorario(io: IO, sesiones: SesionHorario[]): void {
  renderTabla(
    io,
    [
      { header: "Día", key: "dia", max: 10 },
      { header: "Inicio", key: "inicio", max: 6, protegida: true },
      { header: "Fin", key: "fin", max: 6, protegida: true },
      { header: "Curso", key: "curso", min: 14 },
      { header: "Aula", key: "aula", max: 10, protegida: true },
      { header: "Profesor", key: "profesor", min: 10 },
    ],
    sesiones.map((s) => ({ ...s, aula: dash(s.aula), profesor: dash(s.profesor) })),
  );
}

export function printPagos(io: IO, pagos: Pago[]): void {
  renderTabla(
    io,
    [
      { header: "Descripción", key: "descripcion", min: 16 },
      { header: "Moneda", key: "moneda", max: 8, protegida: true },
      { header: "Monto", key: "monto", max: 12, protegida: true },
      { header: "Vence", key: "vencimiento", max: 12, protegida: true },
    ],
    pagos,
  );
}

export function printCursos(io: IO, cursos: Curso[]): void {
  renderTabla(
    io,
    [
      { header: "ID", key: "id", max: 8, protegida: true },
      { header: "Curso", key: "nombre", min: 20 },
      { header: "Ciclo", key: "ciclo", max: 22 },
    ],
    cursos,
  );
}

export function printMaterial(io: IO, material: Material[]): void {
  renderTabla(
    io,
    [
      { header: "Tipo", key: "tipo", max: 9, protegida: true },
      { header: "Material", key: "nombre", min: 20 },
      { header: "Sección", key: "seccion", max: 18 },
    ],
    material,
  );
}

export function printGrabaciones(io: IO, grabaciones: Grabacion[]): void {
  renderTabla(
    io,
    [
      { header: "Clase", key: "titulo", min: 22 },
      { header: "Clave", key: "clave", max: 16, protegida: true },
      { header: "Enlace", key: "enlace", max: 32, truncar: true },
    ],
    grabaciones.map((g) => ({ ...g, clave: dash(g.clave) })),
  );
}
