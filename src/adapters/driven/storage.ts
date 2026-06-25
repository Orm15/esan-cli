import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Entry } from "@napi-rs/keyring";
import { SESSION_FILE } from "../../config/paths";
import type { Sesion } from "../../domain/models";
import type { CredentialStorePort, SessionStorePort } from "../../domain/ports";

const SERVICE = "esan-cli";

/** Contraseña en el keychain del SO (multiplataforma vía @napi-rs/keyring). Guardado opt-in. */
export class KeychainCredentialStore implements CredentialStorePort {
  async isAvailable(): Promise<boolean> {
    try {
      // Sondea el backend de verdad: getPassword devuelve null si no existe la clave, pero
      // LANZA si no hay Secret Service / D-Bus (Linux headless/CI) → evita el falso positivo.
      new Entry(SERVICE, "__probe__").getPassword();
      return true;
    } catch {
      return false;
    }
  }

  async get(usuario: string): Promise<string | null> {
    try {
      return new Entry(SERVICE, usuario).getPassword();
    } catch {
      return null;
    }
  }

  async set(usuario: string, password: string): Promise<void> {
    new Entry(SERVICE, usuario).setPassword(password);
  }

  async clear(usuario: string): Promise<void> {
    try {
      new Entry(SERVICE, usuario).deletePassword();
    } catch {
      // no existía: nada que hacer
    }
  }
}

/** Cookies de sesión cacheadas en ~/.config/esan-cli/session.json con permisos 600. */
export class FileSessionStore implements SessionStorePort {
  async load(): Promise<Sesion | null> {
    try {
      return JSON.parse(await readFile(SESSION_FILE, "utf8")) as Sesion;
    } catch {
      return null;
    }
  }

  async save(sesion: Sesion): Promise<void> {
    await mkdir(dirname(SESSION_FILE), { recursive: true, mode: 0o700 });
    await writeFile(SESSION_FILE, JSON.stringify(sesion), { mode: 0o600 });
    await chmod(SESSION_FILE, 0o600); // reasegura permisos si el archivo ya existía con otros
  }

  async clear(): Promise<void> {
    try {
      await rm(SESSION_FILE);
    } catch {
      // no existía
    }
  }
}
