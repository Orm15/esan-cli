import type { ConfigStore } from "../config/ConfigStore";
import type { Credenciales } from "../domain/models";
import type { CredentialStorePort } from "../domain/ports";

/**
 * Resuelve las credenciales para un re-login transparente.
 * Precedencia (ARCHITECTURE §5): env (`ESAN_USER`/`ESAN_PASS`) → keychain (por el `usuario` de config).
 * Devuelve `null` si falta el usuario o la contraseña (→ el caller pedirá `esan login`).
 */
export async function resolveCredenciales(
  config: ConfigStore,
  store: CredentialStorePort,
): Promise<Credenciales | null> {
  const cfg = await config.load();
  const usuario = process.env.ESAN_USER || cfg.usuario;
  if (!usuario) return null;

  const password = process.env.ESAN_PASS || (await store.get(usuario));
  if (!password) return null;

  return { usuario, password };
}
