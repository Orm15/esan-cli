import { describe, expect, test } from "bun:test";
import { buildProgram } from "../src/cli";

describe("cli", () => {
  test("registra los comandos esperados", () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toContain("login");
    expect(names).toContain("notas");
    expect(names).toContain("horario");
    expect(names).toContain("cursos");
    expect(names).toContain("grabaciones");
    expect(names).toContain("salas");
  });

  test("el binario se llama esan", () => {
    expect(buildProgram().name()).toBe("esan");
  });
});
