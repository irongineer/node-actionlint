#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { glob } = require("./glob");
const { initialize } = require("./initialize.js");
const chalk = require("chalk");
const { codeFrameColumns } = require("@babel/code-frame");

const args = process.argv.slice(2);
run(args[0]);

/**
 * @typedef {import("./initialize").LintResult} LintResult
 * @typedef {{ path: string; data: string; }} FileData
 * @typedef { LintResult & FileData } Result
 */

async function run(pattern) {
  const filePaths = await glob(pattern);
  const files = await readFiles(filePaths);
  const results = await runLint(files);
  const text = getLogResults(results);
  if (text) {
    console.log(text);
  }
}

async function readFiles(filePaths) {
  /** @type {Array<FileData>} */
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const data = await fs.readFile(filePath, "utf-8");
      return { path: filePath, data };
    })
  );
  return files;
}

async function runLint(files) {
  const runActionlint = await initialize();
  /** @type {Array<Result>} */
  const results = files
    .map((file) => {
      const lintResults = runActionlint(file.data, file.path);
      return lintResults.map((result) => ({ ...result, ...file }));
    })
    .flat()
    .filter((result) => !!result.message);
  return results;
}

/**
 * @param {Array<Result>} results
 * @returns {string}
 */
function getLogResults(results) {
  let text = "";
  for (const result of results) {
    const relativePath = path.relative(process.cwd(), result.path);
    text += chalk.yellow(relativePath);
    text +=
      chalk.gray(":") + result.line + chalk.gray(":") + result.column + " ";
    text += chalk.bold.white(result.message) + " ";
    text += chalk.gray("[", result.kind, "]") + "\n";
    const codeFrame = codeFrameColumns(result.data, {
      start: { line: result.line, column: result.column },
    });
    text += codeFrame + "\n";
  }
  return text;
}
