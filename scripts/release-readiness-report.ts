import { getReleaseReadiness } from "../server/_core/releaseReadiness";

const checkOnly = process.argv.includes("--check");
const report = getReleaseReadiness();

console.log(JSON.stringify(report, null, 2));

if (checkOnly && !report.ok) {
  process.exit(1);
}
