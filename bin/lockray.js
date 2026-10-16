#!/usr/bin/env node
import { readFile, realpath, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyze, toMarkdown, LIMITS } from "../src/core.js";
import { VERSION } from "../src/version.js";

const help = `Lockray — offline npm lockfile review

Usage: lockray <before-package-lock.json> <after-package-lock.json> [options]

Options:
  --format json|markdown   Output format (default: markdown)
  --output, -o <path>      Write a report to a file (default: stdout)
  --force                 Allow replacing an existing report, never an input
  --fail-on-signals       Exit 1 when changed packages have review signals
  --help, -h              Show this help
  --version, -v           Show the version

Exit codes: 0 success, 1 review signals with --fail-on-signals, 2 input or I/O error.
Only local files are read. Packages are never installed or executed.
`;

async function main() {
  const args = process.argv.slice(2);
  const files = [];
  let format = "markdown";
  let output;
  let force = false;
  let failOnSignals = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(help);
      return;
    }
    if (arg === "--version" || arg === "-v") {
      process.stdout.write(`${VERSION}\n`);
      return;
    }
    if (arg === "--force") force = true;
    else if (arg === "--fail-on-signals") failOnSignals = true;
    else if (arg === "--format" || arg === "--output" || arg === "-o") {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${arg}.`);
      if (arg === "--format") format = value;
      else output = value;
    } else if (arg.startsWith("--format="))
      format = arg.slice("--format=".length);
    else if (arg.startsWith("--output="))
      output = arg.slice("--output=".length);
    else if (arg === "--") {
      files.push(...args.slice(i + 1));
      break;
    } else if (arg.startsWith("-"))
      throw new Error(`Unknown option: ${arg}. Use --help for usage.`);
    else files.push(arg);
  }
  if (files.length !== 2)
    throw new Error(
      "Expected before and after lockfile paths. Use --help for usage.",
    );
  if (format !== "json" && format !== "markdown")
    throw new Error("--format must be json or markdown.");
  const inputPaths = files.map((path) => resolve(path));
  const inputStats = await Promise.all(inputPaths.map((path) => stat(path)));
  for (let i = 0; i < inputStats.length; i++) {
    if (!inputStats[i].isFile())
      throw new Error(`Input is not a regular file: ${files[i]}`);
    if (inputStats[i].size > LIMITS.bytes)
      throw new Error(`Input exceeds the 10 MiB limit: ${files[i]}`);
  }
  let outputPath;
  if (output !== undefined) {
    if (!output) throw new Error("--output requires a path.");
    outputPath = resolve(output);
    if (inputPaths.includes(outputPath))
      throw new Error("Output must not overwrite an input lockfile.");
    let outputStat;
    try {
      outputStat = await stat(outputPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (outputStat) {
      const [actualOutput, actualInputs] = await Promise.all([
        realpath(outputPath),
        Promise.all(inputPaths.map((path) => realpath(path))),
      ]);
      if (
        actualInputs.includes(actualOutput) ||
        inputStats.some(
          (input) =>
            input.dev === outputStat.dev && input.ino === outputStat.ino,
        )
      )
        throw new Error(
          "Output must not overwrite an input lockfile, including aliases.",
        );
      if (!force)
        throw new Error(
          "Output already exists. Pass --force to replace a report.",
        );
    }
  }
  const [before, after] = await Promise.all(
    inputPaths.map((path) => readFile(path, "utf8")),
  );
  const report = analyze(before, after);
  const result =
    format === "json"
      ? `${JSON.stringify(report, null, 2)}\n`
      : toMarkdown(report);
  if (outputPath)
    await writeFile(outputPath, result, {
      encoding: "utf8",
      flag: force ? "w" : "wx",
    });
  else process.stdout.write(result);
  if (failOnSignals && report.summary.signals) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`lockray: ${error.message}\n`);
  process.exitCode = 2;
});
