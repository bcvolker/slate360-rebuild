import { execSync } from "child_process";
import fs from "fs";

try {
  execSync("npx tsc --noEmit");
  fs.writeFileSync("tsc_out.txt", "SUCCESS");
} catch (e) {
  fs.writeFileSync("tsc_out.txt", e.stdout ? e.stdout.toString() : e.toString());
}
