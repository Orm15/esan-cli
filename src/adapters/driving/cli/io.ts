import pc from "picocolors";

/** Única fuente de verdad para TTY/color/prompts (inspirado en IOStreams de `gh`). */
export class IO {
  get isStdoutTTY(): boolean {
    return process.stdout.isTTY ?? false;
  }

  get isStdinTTY(): boolean {
    return process.stdin.isTTY ?? false;
  }

  /** Solo se puede preguntar interactivamente si stdin Y stdout son TTY. */
  canPrompt(): boolean {
    return this.isStdinTTY && this.isStdoutTTY;
  }

  info(msg: string): void {
    process.stdout.write(`${msg}\n`);
  }

  success(msg: string): void {
    process.stdout.write(`${pc.green("✓")} ${msg}\n`);
  }

  warn(msg: string): void {
    process.stderr.write(`${pc.yellow("!")} ${msg}\n`);
  }

  error(msg: string): void {
    process.stderr.write(`${pc.red("✖")} ${msg}\n`);
  }
}
