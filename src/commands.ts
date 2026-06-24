import type { Command } from "commander";
import type { Deps } from "./composition-root";
import { EsanError } from "./domain/errors";
import * as uc from "./usecases";

type JsonOpts = { json?: boolean };

/** Ejecuta un caso de uso y renderiza; traduce errores de dominio a mensajes claros. */
async function exec<T>(deps: Deps, run: () => Promise<T>, json: boolean): Promise<void> {
  try {
    const data = await run();
    deps.output.render(data, { json });
  } catch (err) {
    deps.io.error(err instanceof EsanError ? err.message : String(err));
    process.exitCode = 1;
  }
}

function pendiente(deps: Deps, fase: string): void {
  deps.io.error(`pendiente (${fase})`);
  process.exitCode = 1;
}

export function registerCommands(program: Command, deps: Deps): void {
  program
    .command("login")
    .description("Inicia sesión en el campus virtual (guardado de contraseña opt-in)")
    .action(() => pendiente(deps, "Fase 1"));

  program
    .command("logout")
    .description("Cierra la sesión y borra cookies/credencial guardada")
    .action(() => pendiente(deps, "Fase 1"));

  program
    .command("perfil")
    .alias("whoami")
    .description("Muestra tus datos (nombre, código, rol)")
    .option("--json", "salida en JSON")
    .action((o: JsonOpts) => exec(deps, () => uc.consultarPerfil(deps), !!o.json));

  program
    .command("notas")
    .description("Notas actuales por curso")
    .option("--json", "salida en JSON")
    .action((o: JsonOpts) => exec(deps, () => uc.consultarNotas(deps), !!o.json));

  program
    .command("horario")
    .description("Horario semanal de clases")
    .option("--json", "salida en JSON")
    .action((o: JsonOpts) => exec(deps, () => uc.consultarHorario(deps), !!o.json));

  program
    .command("pagos")
    .description("Cronograma de pagos (cuotas, montos, vencimientos)")
    .option("--json", "salida en JSON")
    .action((o: JsonOpts) => exec(deps, () => uc.consultarPagos(deps), !!o.json));

  program
    .command("cursos")
    .description("Lista de cursos del aula virtual")
    .option("--ciclo <ciclo>", "filtra por ciclo, p.ej. 2025-2")
    .option("--json", "salida en JSON")
    .action((o: JsonOpts) => exec(deps, () => uc.listarCursos(deps), !!o.json));

  program
    .command("material")
    .description("Material de un curso (secciones y recursos)")
    .argument("<curso>", "courseId o nombre del curso")
    .option("--json", "salida en JSON")
    .action((curso: string, o: JsonOpts) =>
      exec(deps, () => uc.obtenerMaterial(deps, curso), !!o.json),
    );

  program
    .command("grabaciones")
    .description("Links de clases/grabaciones + clave de acceso")
    .argument("<curso>", "courseId o nombre del curso")
    .option("--json", "salida en JSON")
    .action((curso: string, o: JsonOpts) =>
      exec(deps, () => uc.obtenerGrabaciones(deps, curso), !!o.json),
    );

  program
    .command("salas")
    .description("Disponibilidad de salas de estudio (requiere 2 códigos de compañeros)")
    .argument("[codigos...]", "códigos de los 2 compañeros matriculados")
    .option("--json", "salida en JSON")
    .action((codigos: string[], o: JsonOpts) =>
      exec(deps, () => uc.mostrarSalas(deps, codigos), !!o.json),
    );

  program
    .command("password")
    .description("Gestiona la contraseña guardada en el keychain")
    .argument("<accion>", "set | clear | status")
    .action(() => pendiente(deps, "Fase 1"));
}
