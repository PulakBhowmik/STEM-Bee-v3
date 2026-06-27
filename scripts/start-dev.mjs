import { openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const project = dirname(dirname(fileURLToPath(import.meta.url)));
const stdout = openSync(join(project, "dev-server.log"), "w");
const stderr = openSync(join(project, "dev-server.err.log"), "w");

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3000"], {
  cwd: project,
  detached: true,
  stdio: ["ignore", stdout, stderr],
  windowsHide: true,
  shell: false,
});

child.unref();
console.log(child.pid);
