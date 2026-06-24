import { Command } from "commander";
import { registerCommands } from "./commands";
import { buildDeps } from "./composition-root";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("esan")
    .description(
      "CLI no oficial del campus virtual de ESAN (Pregrado). Solo lectura, solo tu cuenta.",
    )
    .version("0.0.0");

  registerCommands(program, buildDeps());
  return program;
}
