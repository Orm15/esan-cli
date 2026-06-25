import { describe, expect, test } from "bun:test";
import { jarFromSesion, jarToSesion, newJar } from "../src/adapters/driven/http";

describe("cookie jar <-> sesion", () => {
  test("round-trip: serializa y restaura las cookies", async () => {
    const jar = newJar();
    await jar.setCookie("ASP.NET_SessionId=abc123; Path=/", "https://miportal.uesan.edu.pe");

    const sesion = jarToSesion(jar);
    expect(typeof sesion.cookies).toBe("string");
    expect(sesion.creadaEn).toBeGreaterThan(0);

    const restaurado = jarFromSesion(sesion);
    const cookieStr = await restaurado.getCookieString("https://miportal.uesan.edu.pe/x");
    expect(cookieStr).toContain("ASP.NET_SessionId=abc123");
  });

  test("la sesión serializada nunca incluye la contraseña", async () => {
    const jar = newJar();
    await jar.setCookie("MoodleSession=zzz; Path=/", "https://aulavirtualue.uesan.edu.pe");
    const sesion = jarToSesion(jar);
    expect(JSON.stringify(sesion).toLowerCase()).not.toContain("password");
  });
});
