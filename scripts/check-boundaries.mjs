import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2];
if (target && !['desktop', 'android'].includes(target)) throw new Error('Expected desktop or android');
const zones = target ? [`apps/${target}`, 'packages/core'] : ['apps/desktop', 'apps/android', 'packages/core'];
const extensions = /\.(?:[cm]?[jt]sx?|css|html)$/;
const normalize = value => value.replaceAll('\\', '/');
const configFile = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const errors = [];
let count = 0;
function inspect(file, zone, specifier) {
  if (specifier.startsWith('data:') || specifier.startsWith('#')) return;
  if (zone === 'apps/desktop' && specifier.startsWith('@capacitor/')) errors.push(`${file}: Desktop imports Android plugin ${specifier}`);
  if (zone === 'apps/android' && specifier.startsWith('@tauri-apps/')) errors.push(`${file}: Android imports Desktop plugin ${specifier}`);
  if (zone === 'packages/core' && /^(react(?:-dom)?(?:\/|$)|@capacitor\/|@tauri-apps\/|dexie$|node:)/.test(specifier)) errors.push(`${file}: core imports UI or platform dependency ${specifier}`);
  const resolved = ts.resolveModuleName(specifier, path.join(root, file), options, ts.sys).resolvedModule;
  let target = resolved && !resolved.isExternalLibraryImport ? resolved.resolvedFileName : undefined;
  if (!target && specifier.startsWith('.')) target = path.resolve(root, path.dirname(file), specifier);
  if (!target && specifier.startsWith('/src/')) target = path.join(root, zone, specifier);
  if (!target && specifier.startsWith('@core/')) target = path.join(root, 'packages/core', specifier.slice(6));
  if (!target) {
    if (!resolved && !['tailwindcss'].includes(specifier) && !specifier.startsWith('/icons/')) errors.push(`${file}: unresolved dependency ${specifier}`);
    return;
  }
  const relative = normalize(path.relative(root, target));
  if (!(relative.startsWith(zone + '/') || (zone !== 'packages/core' && relative.startsWith('packages/core/')))) errors.push(`${file}: forbidden dependency ${specifier} -> ${relative}`);
}
function visit(directory, zone) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) { visit(full, zone); continue; }
    if (!extensions.test(entry.name)) continue;
    count++;
    const file = normalize(path.relative(root, full));
    const content = fs.readFileSync(full, 'utf8');
    if (entry.name.endsWith('.css')) {
      for (const match of content.matchAll(/@(?:import|source)\s+(?:url\()?['"]([^'"]+)['"]/g)) inspect(file, zone, match[1]);
    } else if (entry.name.endsWith('.html')) {
      for (const match of content.matchAll(/<script[^>]+src=['"]([^'"]+)['"]/g)) inspect(file, zone, match[1]);
    } else {
      const source = ts.createSourceFile(full, content, ts.ScriptTarget.Latest, true);
      function node(n) {
        if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) inspect(file, zone, n.moduleSpecifier.text);
        if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) inspect(file, zone, n.argument.literal.text);
        if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
          const arg = n.arguments[0];
          if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) inspect(file, zone, arg.text);
          else errors.push(`${file}: dependency path must be a literal to check its boundary`);
        }
        ts.forEachChild(n, node);
      }
      node(source);
    }
  }
}
for (const zone of zones) visit(path.join(root, zone), zone);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Dependency boundaries passed (${count} files): ${target ?? 'Desktop and Android'} dependencies are isolated.`);
