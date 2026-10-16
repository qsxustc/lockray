import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  symlink,
  link,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const executable = fileURLToPath(new URL("../bin/lockray.js", import.meta.url));
function run(args) {
  return spawnSync(process.execPath, [executable, ...args], {
    encoding: "utf8",
  });
}
const lock = (version = "1.0.0", hasInstallScript = false) =>
  JSON.stringify({
    name: "cli-fixture",
    lockfileVersion: 3,
    packages: {
      "": { dependencies: { a: "*" } },
      "node_modules/a": {
        version,
        integrity: `sha512-${version}`,
        hasInstallScript,
      },
    },
  });

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "lockray-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const before = join(dir, "before.json");
  const after = join(dir, "after.json");
  await writeFile(before, lock());
  await writeFile(after, lock("1.1.0"));
  return { dir, before, after };
}

test("CLI emits deterministic JSON and Markdown locally", async (t) => {
  const { before, after } = await fixture(t);
  const json = run([before, after, "--format", "json"]);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(JSON.parse(json.stdout).summary.updated, 1);
  assert.equal(json.stderr, "");
  assert.equal(run([before, after, "--format=json"]).stdout, json.stdout);
  const markdown = run([before, after]);
  assert.equal(markdown.status, 0);
  assert.match(markdown.stdout, /^# Lockray dependency review/);
});

test("CLI refuses report overwrite, allows force, never replaces inputs", async (t) => {
  const { dir, before, after } = await fixture(t);
  const output = join(dir, "report.md");
  await writeFile(output, "keep me");
  assert.equal(run([before, after, "-o", output]).status, 2);
  assert.equal(await readFile(output, "utf8"), "keep me");
  assert.equal(run([before, after, "-o", output, "--force"]).status, 0);
  assert.match(await readFile(output, "utf8"), /^# Lockray/);
  const original = await readFile(before, "utf8");
  const same = run([before, after, "-o", before, "--force"]);
  assert.equal(same.status, 2);
  assert.match(same.stderr, /must not overwrite an input/);
  assert.equal(await readFile(before, "utf8"), original);
});

test("CLI protects input symlink and hardlink aliases even with force", async (t) => {
  const { dir, before, after } = await fixture(t);
  const aliases = [join(dir, "symlink.json"), join(dir, "hardlink.json")];
  await symlink(before, aliases[0]);
  await link(after, aliases[1]);
  for (const alias of aliases) {
    const result = run([before, after, "--output", alias, "--force"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /including aliases/);
  }
  assert.equal(await readFile(before, "utf8"), lock());
  assert.equal(await readFile(after, "utf8"), lock("1.1.0"));
});

test("CLI creates a new report and fails on signals only when requested", async (t) => {
  const { dir, before, after } = await fixture(t);
  await writeFile(after, lock("1.1.0", true));
  assert.equal(run([before, after]).status, 0);
  const output = join(dir, "report.json");
  const result = run([
    before,
    after,
    "--format",
    "json",
    "--output",
    output,
    "--fail-on-signals",
  ]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(await readFile(output, "utf8")).summary.signals, 1);
});

test("CLI validation leaves existing output untouched on error", async (t) => {
  const { dir, before, after } = await fixture(t);
  const output = join(dir, "report.md");
  await writeFile(output, "original");
  await writeFile(after, "{bad");
  const result = run([before, after, "-o", output, "--force"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /invalid JSON/);
  assert.equal(await readFile(output, "utf8"), "original");
  assert.equal(result.stdout, "");
});

test("CLI rejects missing arguments, invalid options, and nonexistent files", () => {
  for (const args of [
    [],
    ["--format"],
    ["--surprise"],
    ["missing.json", "other.json"],
    ["a", "b", "--format", "html"],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^lockray:/);
  }
  assert.equal(run(["--help"]).status, 0);
  assert.match(run(["--help"]).stdout, /Usage:/);
  assert.equal(run(["--version"]).stdout, "0.2.0\n");
});
