import Table from "cli-table3";
import pc from "picocolors";
import type { CursoNota } from "../../../domain/models";
import type { IO } from "./io";

const nota = (n: number | null): string => (n === null ? "—" : String(n));

/**
 * Render humano de `notas`: una tabla componente/peso/nota por curso + promedio.
 * (El modelo `CursoNota` es anidado; el renderer genérico de tablas no le hace justicia.)
 */
export function printNotas(io: IO, cursos: CursoNota[]): void {
  if (cursos.length === 0) {
    io.info("No hay notas para mostrar.");
    return;
  }

  for (const curso of cursos) {
    io.info("");
    io.info(pc.bold(curso.curso));
    const table = new Table({ head: ["Componente", "Peso", "Nota"] });
    for (const c of curso.componentes) {
      table.push([c.nombre, c.peso === null ? "—" : `${c.peso}%`, nota(c.nota)]);
    }
    io.info(table.toString());
    io.info(`Promedio general: ${pc.bold(nota(curso.promedio))}`);
  }
}
