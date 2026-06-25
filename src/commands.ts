import * as p from "@clack/prompts";
import type { Command } from "commander";
import { printNotas } from "./adapters/driving/cli/present";
import type { Deps } from "./composition-root";
import { EsanError } from "./domain/errors";
import * as uc from "./usecases";

type JsonOpts = { json?: boolean };

/**
 * Ejecuta un caso de uso y renderiza; traduce errores de dominio a mensajes claros.
 * `human` permite una salida a medida en TTY (si no, se usa el renderer genérico de tablas/JSON).
 */
async function exec<T>(
  deps: Deps,
  run: () => Promise<T>,
  json: boolean,
  human?: (data: T) => void,
): Promise<void> {
  try {
    const data = await run();
    if (!json && human) human(data);
    else deps.output.render(data, { json });
  } catch (err) {
    deps.io.error(err instanceof EsanError ? err.message : String(err));
    process.exitCode = 1;
  }
}

const cancelado = (valor: unknown): boolean => p.isCancel(valor);

/** Cancelación de prompt (Ctrl-C): mensaje + exit code ≠ 0 para distinguirla de un éxito. */
function abortar(): void {
  p.cancel("Cancelado.");
  process.exitCode = 1;
}

/** `esan login`: pide credenciales, autentica, persiste la sesión y ofrece guardar la contraseña. */
async function cmdLogin(deps: Deps): Promise<void> {
  const cfg = await deps.config.load();
  p.intro("esan · iniciar sesión");

  const usuario = await p.text({
    message: "Código de alumno",
    placeholder: "12345678",
    initialValue: process.env.ESAN_USER ?? cfg.usuario ?? "",
    validate: (v) => (v.trim().length > 0 ? undefined : "Requerido"),
  });
  if (cancelado(usuario)) return abortar();

  const password =
    process.env.ESAN_PASS ??
    (await p.password({
      message: "Contraseña",
      validate: (v) => (v.length > 0 ? undefined : "Requerida"),
    }));
  if (cancelado(password)) return abortar();

  const user = String(usuario).trim();
  const pass = String(password);

  const spin = p.spinner();
  spin.start("Autenticando…");
  try {
    const sesion = await deps.auth.login({ usuario: user, password: pass });
    await deps.sessions.save(sesion);
    await deps.config.save({ ...cfg, usuario: user });
    spin.stop("Sesión iniciada.");
  } catch (err) {
    spin.stop("No se pudo iniciar sesión.");
    deps.io.error(err instanceof EsanError ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  // Guardado de contraseña OPT-IN (PLAN §3). Si la clave vino por env, no preguntamos.
  if (!process.env.ESAN_PASS) {
    const guardar = await p.confirm({
      message:
        "¿Guardar la contraseña en el keychain del sistema? (re-login automático al expirar)",
      initialValue: false,
    });
    if (!cancelado(guardar) && guardar === true) {
      try {
        if (await deps.credentials.isAvailable()) {
          await deps.credentials.set(user, pass);
          deps.io.success("Contraseña guardada en el keychain.");
        } else {
          deps.io.warn(
            "No hay keychain disponible en este sistema; la contraseña no se guardó. " +
              "Usa las variables ESAN_USER/ESAN_PASS o vuelve a correr `esan login` cuando expire.",
          );
        }
      } catch (err) {
        // El login YA tuvo éxito y la sesión está guardada: un fallo del keychain solo se avisa.
        deps.io.warn(
          `No se pudo guardar la contraseña en el keychain (${err instanceof EsanError ? err.message : String(err)}). La sesión sí quedó activa.`,
        );
      }
    }
  }

  p.outro("Listo. Prueba `esan perfil`.");
}

/** `esan logout`: borra la sesión cacheada y la contraseña guardada. */
async function cmdLogout(deps: Deps): Promise<void> {
  await deps.sessions.clear();
  const cfg = await deps.config.load();
  if (cfg.usuario) await deps.credentials.clear(cfg.usuario);
  deps.io.success("Sesión cerrada y credencial borrada.");
}

/** `esan password set|clear|status`: gestiona la contraseña guardada en el keychain. */
async function cmdPassword(deps: Deps, accion: string): Promise<void> {
  const cfg = await deps.config.load();
  const usuario = process.env.ESAN_USER ?? cfg.usuario;

  if (accion === "status") {
    const disponible = await deps.credentials.isAvailable();
    const guardada = usuario ? (await deps.credentials.get(usuario)) !== null : false;
    deps.io.info(`keychain:    ${disponible ? "disponible" : "no disponible"}`);
    deps.io.info(`usuario:     ${usuario ?? "(desconocido — corre `esan login`)"}`);
    deps.io.info(`contraseña:  ${guardada ? "guardada" : "no guardada"}`);
    return;
  }

  if (!usuario) {
    deps.io.error("No hay usuario configurado. Corre `esan login` primero.");
    process.exitCode = 1;
    return;
  }

  if (accion === "clear") {
    await deps.credentials.clear(usuario);
    deps.io.success("Contraseña borrada del keychain.");
    return;
  }

  if (accion === "set") {
    if (!(await deps.credentials.isAvailable())) {
      deps.io.error("No hay keychain disponible en este sistema.");
      process.exitCode = 1;
      return;
    }
    const password = await p.password({
      message: `Nueva contraseña para ${usuario}`,
      validate: (v) => (v.length > 0 ? undefined : "Requerida"),
    });
    if (cancelado(password)) return abortar();
    try {
      await deps.credentials.set(usuario, String(password));
      deps.io.success("Contraseña guardada en el keychain.");
    } catch (err) {
      deps.io.error(
        `No se pudo guardar la contraseña: ${err instanceof EsanError ? err.message : String(err)}`,
      );
      process.exitCode = 1;
    }
    return;
  }

  deps.io.error(`Acción inválida: ${accion}. Usa: set | clear | status.`);
  process.exitCode = 1;
}

/** Vista plana de la config no sensible (la contraseña vive en el keychain, nunca aquí). */
async function configPlana(deps: Deps): Promise<Record<string, unknown>> {
  const cfg = await deps.config.load();
  return { usuario: cfg.usuario ?? "", ...(cfg.prefs ?? {}) };
}

/** `esan config get [clave]`: muestra toda la config o el valor de una clave. */
async function cmdConfigGet(deps: Deps, clave?: string): Promise<void> {
  const flat = await configPlana(deps);
  if (clave) {
    if (!(clave in flat)) {
      deps.io.error(`No existe la clave "${clave}".`);
      process.exitCode = 1;
      return;
    }
    deps.io.info(String(flat[clave]));
    return;
  }
  for (const [k, v] of Object.entries(flat)) deps.io.info(`${k} = ${String(v)}`);
}

/** `esan config set <clave> <valor>`: ajusta una clave (usuario o una preferencia libre). */
async function cmdConfigSet(deps: Deps, clave: string, valor: string): Promise<void> {
  if (clave === "version") {
    deps.io.error("`version` es de solo lectura.");
    process.exitCode = 1;
    return;
  }
  const cfg = await deps.config.load();
  if (clave === "usuario") {
    await deps.config.save({ ...cfg, usuario: valor });
  } else {
    await deps.config.save({ ...cfg, prefs: { ...(cfg.prefs ?? {}), [clave]: valor } });
  }
  deps.io.success(`config: ${clave} = ${valor}`);
}

export function registerCommands(program: Command, deps: Deps): void {
  program
    .command("login")
    .description("Inicia sesión en el campus virtual (guardado de contraseña opt-in)")
    .action(() => cmdLogin(deps));

  program
    .command("logout")
    .description("Cierra la sesión y borra cookies/credencial guardada")
    .action(() => cmdLogout(deps));

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
    .action((o: JsonOpts) =>
      exec(
        deps,
        () => uc.consultarNotas(deps),
        !!o.json,
        (cursos) => printNotas(deps.io, cursos),
      ),
    );

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
    .action((o: JsonOpts & { ciclo?: string }) =>
      exec(deps, () => uc.listarCursos(deps, o.ciclo), !!o.json),
    );

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
    .action((accion: string) => cmdPassword(deps, accion));

  const config = program
    .command("config")
    .description("Lee o ajusta la configuración local (no sensible)");
  config
    .command("get")
    .description("Muestra la configuración (o el valor de una clave)")
    .argument("[clave]", "clave a leer")
    .action((clave: string | undefined) => cmdConfigGet(deps, clave));
  config
    .command("set")
    .description("Ajusta una clave de configuración")
    .argument("<clave>", "clave (p.ej. usuario)")
    .argument("<valor>", "valor")
    .action((clave: string, valor: string) => cmdConfigSet(deps, clave, valor));
}
