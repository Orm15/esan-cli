import { describe, expect, test } from "bun:test";
import { buildProgram } from "../src/cli";

describe("cli", () => {
  test("registra los comandos esperados", () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name());
    for (const cmd of [
      "login",
      "logout",
      "perfil",
      "notas",
      "horario",
      "pagos",
      "cursos",
      "material",
      "grabaciones",
      "explorar",
      "salas",
      "password",
      "config",
    ]) {
      expect(names).toContain(cmd);
    }
  });

  test("config tiene subcomandos get y set", () => {
    const config = buildProgram().commands.find((c) => c.name() === "config");
    const subs = config?.commands.map((c) => c.name()) ?? [];
    expect(subs).toContain("get");
    expect(subs).toContain("set");
  });

  test("el binario se llama esan", () => {
    expect(buildProgram().name()).toBe("esan");
  });
});
