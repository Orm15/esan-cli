import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { CONFIG_FILE } from "./paths";

/** Config NO sensible (la contraseña va al keychain, nunca aquí). */
export interface AppConfig {
  version: number;
  usuario?: string;
  prefs?: Record<string, unknown>;
}

const DEFAULT: AppConfig = { version: 1 };

export class ConfigStore {
  async load(): Promise<AppConfig> {
    try {
      const raw = await readFile(CONFIG_FILE, "utf8");
      return { ...DEFAULT, ...(JSON.parse(raw) as AppConfig) };
    } catch {
      return { ...DEFAULT };
    }
  }

  async save(config: AppConfig): Promise<void> {
    await mkdir(dirname(CONFIG_FILE), { recursive: true, mode: 0o700 });
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
    await chmod(CONFIG_FILE, 0o600); // reasegura permisos si el archivo ya existía
  }
}
