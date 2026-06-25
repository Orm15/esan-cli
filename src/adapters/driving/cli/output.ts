import Table from "cli-table3";
import type { OutputPort } from "../../../domain/ports";

/** Salida dual: JSON si `--json`; si no, tabla en TTY (estilo `gh`). */
export class ConsoleOutput implements OutputPort {
  render<T>(data: T, opts: { json: boolean }): void {
    if (opts.json) {
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
      return;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        process.stdout.write("(sin resultados)\n");
        return;
      }
      if (isPlainObject(data[0])) {
        const rows = data as Record<string, unknown>[];
        // Unión de claves de TODAS las filas: un campo opcional ausente en la 1ª no pierde columna.
        const head = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        const table = new Table({ head });
        for (const row of rows) {
          table.push(head.map((k) => format(row[k])));
        }
        process.stdout.write(`${table.toString()}\n`);
        return;
      }
    }

    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function format(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
