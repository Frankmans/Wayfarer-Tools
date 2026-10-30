// Applies the "host the build on Frankmans/Wayfarer-Tools (branch redesign-port)" changes.
// Safe to run repeatedly, on any earlier version of these edits, and on LF or CRLF checkouts.
// Usage (from the repo root):  node apply-github-hosting.mjs
import { readFile, writeFile } from "node:fs/promises";

const REPO = "Frankmans/Wayfarer-Tools";
const BRANCH = "redesign-port";

/** Edits a file through a function working on LF text; keeps the file's own line endings. */
async function edit(path, fn) {
  const raw = await readFile(path, "utf8");
  const crlf = raw.includes("\r\n");
  const before = raw.replace(/\r\n/g, "\n");
  const log = [];
  const after = fn(before, log);
  if (after === before) {
    console.log(`  ${path}: already up to date`);
    return;
  }
  await writeFile(path, crlf ? after.replace(/\n/g, "\r\n") : after);
  console.log(`  ${path}: updated (${log.join(", ")})`);
}

/** Replaces `re` in `text`; throws if the pattern is not found, so nothing is silently skipped. */
function sub(text, re, replacement, log, label) {
  if (!re.test(text)) throw new Error(`Could not find ${label} -- is this the right repo/branch state?`);
  const out = text.replace(re, replacement);
  if (out !== text) log.push(label);
  return out;
}

const NEW_GETCLIARG = `function getCliArg(name, defaultVal) {
  console.log(process.argv);
  const argv = process.argv.map((v) => v.trim());
  // post-build gets \`--name=value\`; rollup itself gets \`--config-name value\` or \`--config-name=value\`
  const eqArg = argv.find((v) => v.match(new RegExp(\`^(--)?(config-)?\${name}=.+$\`, "i")));
  let val = eqArg?.split("=")?.[1];
  if (!val) {
    const i = argv.findIndex((v) => v.toLowerCase() === \`--config-\${name}\`.toLowerCase());
    if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("-")) val = argv[i + 1];
  }
  return (val && val.length > 0 ? val : defaultVal)?.trim();
}`;

const NEW_ASSET_BASE = `// On GitHub the downloadable resources (geofences.json) live in resources/; upstream's deploy job
// copies resources/* into the server's assets/ folder, which GitHub hosting has no equivalent of.
const assetBaseUrl = host === "github" ? \`\${baseUrl}/resources\` : \`\${baseUrl}/assets\`;`;

console.log("Applying GitHub hosting changes...");

await edit("src/tools/build-utils.mjs", (t, log) => {
  t = sub(t, /getCliArg\("host", "[^"]*"\)/, "getCliArg(\"host\", \"github\")", log, "default host");
  t = sub(t, /getCliArg\("branch", \(mode === "production" \? "[^"]*" : "develop"\)\)/,
    `getCliArg("branch", (mode === "production" ? "${BRANCH}" : "develop"))`, log, "default branch");
  t = sub(t, /(\* The branch on GitHub to use for various URLs\n \* @type \{)[^}]*(\})/, "$1string$2", log, "branch type");
  t = sub(t, /const repo = "[^"]*";/, `const repo = "${REPO}";`, log, "repo");
  if (!t.includes("host === \"github\" ? `${baseUrl}/resources`")) {
    t = sub(t, /const assetBaseUrl = `\$\{baseUrl\}\/assets`;/, () => NEW_ASSET_BASE, log, "asset base URL");
  }
  if (!t.includes("--config-${name}")) {
    t = sub(t, /function getCliArg\(name, defaultVal\) \{[\s\S]*?\n\}/, () => NEW_GETCLIARG, log, "argument parser");
  }
  return t;
});

await edit("package.json", (t, log) => {
  t = sub(t, /"build-prod": "npm run build-prod-[a-z]+"/, "\"build-prod\": \"npm run build-prod-gh\"", log, "build-prod script");
  t = sub(t, /("build-prod-base": "rollup -c --config-mode production --config-branch )[^"]*"/, `$1${BRANCH}"`, log, "build-prod branch");
  t = sub(t, /("repository": \{[^}]*"url": ")[^"]*"/, `$1git+https://github.com/${REPO}.git"`, log, "repository url");
  t = sub(t, /("bugs": \{[^}]*"url": ")[^"]*"/, `$1https://github.com/${REPO}/issues"`, log, "bugs url");
  t = sub(t, /("homepage": ")[^"]*"/, `$1https://github.com/${REPO}"`, log, "homepage");
  return t;
});

await edit(".gitignore", (t, log) => {
  if (/^!dist\/\*\.meta\.js$/m.test(t)) return t;
  t = sub(t, /^dist\/\*?\n!dist\/\*\.user\.js\n/m, "dist/*\n!dist/*.user.js\n!dist/*.meta.js\n", log, "dist rules");
  return t;
});

console.log("Done. Next: npm run build-prod, then check the header in dist/unified-wayfarer-tools.meta.js");
