import { file, spawnSync } from "bun";

import { parseSync } from "oxc-parser";

const SOURCE_FILE = /\.(?:c|m)?[jt]sx?$/;
const IGNORED_PREFIXES = [
  "apps/web/src/components/ui/",
  "apps/web/src/hooks/",
  "apps/web/src/lib/",
  "apps/web/src/routeTree.gen.ts",
  "apps/web/worker-configuration.d.ts",
  "packages/db/migrations/",
];
const ALLOWED_COMMENTS = [
  /^TODO:/,
  /^biome-ignore(?:-all|-start|-end)?\s/,
  /^@ts-expect-error\b/,
  /^@jsxImportSource\s/,
  /^@deprecated\b/,
  /^\/\s*<reference\s/,
];

interface IViolation {
  path: string;
  line: number;
  text: string;
}

function listSourceFiles(): string[] {
  const result = spawnSync(["git", "ls-files", "--cached", "--others", "--exclude-standard"]);
  return result.stdout
    .toString()
    .split("\n")
    .filter((path) => SOURCE_FILE.test(path))
    .filter((path) => !IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix)));
}

function normalizeBody(value: string): string {
  return value
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, ""))
    .join("\n")
    .replace(/^\*+/, "")
    .trim();
}

function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

async function findViolations(path: string): Promise<IViolation[]> {
  const source = await file(path).text();
  const { comments } = parseSync(path, source);
  return comments
    .filter(
      (comment) => !ALLOWED_COMMENTS.some((pattern) => pattern.test(normalizeBody(comment.value))),
    )
    .map((comment) => ({
      path,
      line: lineOf(source, comment.start),
      text: normalizeBody(comment.value).split("\n")[0] ?? "",
    }));
}

const files = listSourceFiles();
const violations = (await Promise.all(files.map(findViolations))).flat();

for (const { path, line, text } of violations) {
  console.error(`${path}:${line} comment not allowed: ${text}`);
}
const hasViolations = violations.length > 0;
if (hasViolations) {
  console.error(
    `${violations.length} comments found. Only TODO: and tool directives are allowed. Make the code say it, or delete the comment.`,
  );
}
console.info(`Checked comments in ${files.length} files`);
if (hasViolations) {
  process.exitCode = 1;
}
