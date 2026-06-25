import { describe, expect, test } from "bun:test";
import { parsePerfil } from "../src/adapters/driven/miportal-parsers";
import { PortalParseError } from "../src/domain/errors";

describe("parsePerfil", () => {
  test("usa los selectores reales de Mi Portal (.badge-secondary/.nombre-usuario/.nombre-codigo)", () => {
    const html = `<div class="header">
      <span class="badge badge-secondary">ALUMNO</span>
      <span class="semi-bold nombre-usuario">JUAN PEREZ GOMEZ</span><br />
      <div class="semi-bold nombre-codigo"><b>12345678</b></div>
    </div>`;
    const a = parsePerfil(html);
    expect(a.nombre).toBe("JUAN PEREZ GOMEZ");
    expect(a.codigo).toBe("12345678");
    expect(a.rol).toBe("ALUMNO");
  });

  test("extrae código, nombre y rol de la cabecera", () => {
    const html = `
      <html><body>
        <header>
          <span class="user-name">JUAN PEREZ GOMEZ</span>
          <div>Rol: ALUMNO</div>
          <div>Código: 12345678</div>
        </header>
      </body></html>`;
    const a = parsePerfil(html);
    expect(a.codigo).toBe("12345678");
    expect(a.rol).toBe("ALUMNO");
    expect(a.nombre).toBe("JUAN PEREZ GOMEZ");
  });

  test("reconoce el saludo 'Bienvenido(a), X'", () => {
    const html = "<body><p>Bienvenido(a), MARIA LOPEZ</p><span>Código 87654321</span></body>";
    const a = parsePerfil(html);
    expect(a.codigo).toBe("87654321");
    expect(a.nombre).toContain("MARIA LOPEZ");
  });

  test("el nombre no engulle texto de UI ni etiquetas posteriores", () => {
    const html =
      "<body><p>Bienvenido, JUAN PEREZ Codigo 12345678 ALUMNO Inicio Cerrar Sesion</p></body>";
    const a = parsePerfil(html);
    expect(a.nombre).toBe("JUAN PEREZ"); // corta en "Codigo" (minúsculas), no lo absorbe
    expect(a.codigo).toBe("12345678");
  });

  test("lanza PortalParseError si el markup no calza", () => {
    expect(() => parsePerfil("<body><p>página de mantenimiento</p></body>")).toThrow(
      PortalParseError,
    );
  });
});
