import { describe, expect, test } from "bun:test";
import { SessionManager } from "../src/application/SessionManager";
import { NoAutenticadoError, SesionExpiradaError } from "../src/domain/errors";
import type { Credenciales, Sesion } from "../src/domain/models";
import type { AuthPort, SessionStorePort } from "../src/domain/ports";

const SESION: Sesion = { usuario: "u", cookies: "{}", creadaEn: 1, expiraEn: null };

function fakeAuth(): AuthPort & { logins: number } {
  return {
    logins: 0,
    async login(cred: Credenciales): Promise<Sesion> {
      this.logins++;
      return { ...SESION, usuario: cred.usuario, creadaEn: this.logins };
    },
    async isSessionAlive(): Promise<boolean> {
      return true;
    },
  };
}

function fakeSessions(inicial: Sesion | null = null): SessionStorePort & { saved: Sesion | null } {
  let actual = inicial;
  return {
    saved: inicial,
    async load() {
      return actual;
    },
    async save(s: Sesion) {
      actual = s;
      this.saved = s;
    },
    async clear() {
      actual = null;
    },
  };
}

const conCreds = async (): Promise<Credenciales> => ({ usuario: "u", password: "p" });
const sinCreds = async (): Promise<null> => null;
const usuarioU = async (): Promise<string> => "u";
const usuarioOtro = async (): Promise<string> => "otro";

describe("SessionManager.ensureSession", () => {
  test("devuelve la sesión cacheada (mismo usuario) sin re-loguear", async () => {
    const auth = fakeAuth();
    const sm = new SessionManager(auth, fakeSessions(SESION), conCreds, usuarioU);
    expect(await sm.ensureSession()).toEqual(SESION);
    expect(auth.logins).toBe(0);
  });

  test("re-loguea si no hay sesión cacheada y guarda la nueva", async () => {
    const auth = fakeAuth();
    const sessions = fakeSessions(null);
    const sm = new SessionManager(auth, sessions, conCreds, usuarioU);
    await sm.ensureSession();
    expect(auth.logins).toBe(1);
    expect(sessions.saved).not.toBeNull();
  });

  test("ignora la sesión cacheada de OTRO usuario y re-loguea", async () => {
    const auth = fakeAuth();
    const sm = new SessionManager(auth, fakeSessions(SESION), conCreds, usuarioOtro);
    await sm.ensureSession();
    expect(auth.logins).toBe(1);
  });

  test("sin sesión y sin credenciales → NoAutenticadoError", async () => {
    const sm = new SessionManager(fakeAuth(), fakeSessions(null), sinCreds, usuarioU);
    expect(sm.ensureSession()).rejects.toBeInstanceOf(NoAutenticadoError);
  });
});

describe("SessionManager.withSession", () => {
  test("ejecuta la operación con la sesión viva (sin reintento)", async () => {
    const auth = fakeAuth();
    const sm = new SessionManager(auth, fakeSessions(SESION), conCreds, usuarioU);
    expect(await sm.withSession(async () => "ok")).toBe("ok");
    expect(auth.logins).toBe(0);
  });

  test("ante SesionExpiradaError (sesión cacheada) re-loguea una vez y reintenta", async () => {
    const auth = fakeAuth();
    const sm = new SessionManager(auth, fakeSessions(SESION), conCreds, usuarioU);
    let intentos = 0;
    const r = await sm.withSession(async () => {
      intentos++;
      if (intentos === 1) throw new SesionExpiradaError();
      return "recuperado";
    });
    expect(r).toBe("recuperado");
    expect(intentos).toBe(2);
    expect(auth.logins).toBe(1);
  });

  test("cold-start: no hace un segundo login si la sesión recién creada falla", async () => {
    const auth = fakeAuth();
    const sm = new SessionManager(auth, fakeSessions(null), conCreds, usuarioU);
    await expect(
      sm.withSession(async () => {
        throw new SesionExpiradaError();
      }),
    ).rejects.toBeInstanceOf(SesionExpiradaError);
    expect(auth.logins).toBe(1); // solo el login inicial, sin reintento
  });

  test("sesión cacheada expirada sin credenciales → NoAutenticadoError", async () => {
    const sm = new SessionManager(fakeAuth(), fakeSessions(SESION), sinCreds, usuarioU);
    expect(
      sm.withSession(async () => {
        throw new SesionExpiradaError();
      }),
    ).rejects.toBeInstanceOf(NoAutenticadoError);
  });

  test("un error no-sesión se propaga sin reintentar", async () => {
    const auth = fakeAuth();
    const sm = new SessionManager(auth, fakeSessions(SESION), conCreds, usuarioU);
    expect(
      sm.withSession(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(auth.logins).toBe(0);
  });
});
