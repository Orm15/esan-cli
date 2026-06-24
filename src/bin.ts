import { buildProgram } from "./cli";

await buildProgram()
  .parseAsync(process.argv)
  .catch((err: unknown) => {
    process.stderr.write(`${String(err)}\n`);
    process.exit(1);
  });
