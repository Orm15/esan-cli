/**
 * Composition root (Factory / DI). Construye los adapters concretos y los cablea
 * en el contenedor `Deps` que reciben los comandos.
 */
import { EsanAuthAdapter } from "./adapters/driven/auth";
import { MiPortalScraperAdapter } from "./adapters/driven/miportal";
import { MoodleScraperAdapter } from "./adapters/driven/moodle";
import { FileSessionStore, KeychainCredentialStore } from "./adapters/driven/storage";
import { IO } from "./adapters/driving/cli/io";
import { ConsoleOutput } from "./adapters/driving/cli/output";
import { SessionManager } from "./application/SessionManager";
import { resolveCredenciales } from "./application/credentials";
import { ConfigStore } from "./config/ConfigStore";
import type {
  AulaVirtualPort,
  AuthPort,
  CredentialStorePort,
  OutputPort,
  PortalAcademicoPort,
  SessionStorePort,
} from "./domain/ports";

export interface Deps {
  io: IO;
  output: OutputPort;
  config: ConfigStore;
  auth: AuthPort;
  portalAcademico: PortalAcademicoPort;
  aulaVirtual: AulaVirtualPort;
  credentials: CredentialStorePort;
  sessions: SessionStorePort;
  sessionManager: SessionManager;
}

export function buildDeps(): Deps {
  const config = new ConfigStore();
  const auth = new EsanAuthAdapter();
  const sessions = new FileSessionStore();
  const credentials = new KeychainCredentialStore();
  const sessionManager = new SessionManager(
    auth,
    sessions,
    () => resolveCredenciales(config, credentials),
    async () => process.env.ESAN_USER || (await config.load()).usuario,
  );

  return {
    io: new IO(),
    output: new ConsoleOutput(),
    config,
    auth,
    portalAcademico: new MiPortalScraperAdapter(),
    aulaVirtual: new MoodleScraperAdapter(),
    credentials,
    sessions,
    sessionManager,
  };
}
