import envPaths from "env-paths";

/** Rutas XDG del CLI: config en ~/.config/esan-cli, cache en ~/.cache/esan-cli, etc. */
export const paths = envPaths("esan-cli", { suffix: "" });

export const CONFIG_FILE = `${paths.config}/config.json`;
export const SESSION_FILE = `${paths.config}/session.json`;
