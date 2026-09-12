import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const output = path.join(root, 'preservation-baseline.json');
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
const files = ['src', 'public', 'supabase'].flatMap(d => walk(path.join(root, d)));
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const textFiles = files.filter(f => /\.(jsx?|tsx?|css|json|html|md|sql|svg)$/i.test(f));
const sources = Object.fromEntries(textFiles.map(f => [relative(f), fs.readFileSync(f, 'utf8')]));
const assets = files.filter(f => /\.(png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|mov|mp3|wav|glb|gltf|obj|mtl|hdr|exr|bin|woff2?)$/i.test(f));

if (process.argv.includes('--verify')) {
  const baseline = JSON.parse(fs.readFileSync(output, 'utf8'));
  const changed = Object.entries(baseline.hashes).filter(([name, digest]) => !fs.existsSync(path.join(root, name)) || hash(path.join(root, name)) !== digest).map(([name]) => name);
  const protectedChanges = changed.filter(name => !name.endsWith('.css'));
  console.log(JSON.stringify({ filesChecked: Object.keys(baseline.hashes).length, changed, protectedChanges }, null, 2));
  if (protectedChanges.length) process.exitCode = 1;
} else {
  if (fs.existsSync(output)) throw new Error('Baseline already exists; do not overwrite it.');
  const inventory = {
    capturedAt: new Date().toISOString(),
    scope: 'All source text and local assets in src/public/supabase. Runtime database rows and remote media are not downloaded; their source queries and references are preserved verbatim.',
    hashes: Object.fromEntries(files.map(f => [relative(f), hash(f)])),
    sources,
    assets: assets.map(f => ({ path: relative(f), sha256: hash(f), usedIn: Object.entries(sources).filter(([name, source]) => name !== relative(f) && source.includes(path.basename(f))).map(([name]) => name) })),
    routeSources: Object.keys(sources).filter(name => /router|routes|App\.jsx|siteContent/.test(name)),
    remoteReferences: Object.entries(sources).flatMap(([file, source]) => [...source.matchAll(/https?:\/\/[^\s'"`<>]+/g)].map(m => ({ file, reference: m[0] }))),
    usageLimit: 'Literal filename references are indexed; indirect/generated references remain in the complete source snapshot. An empty usedIn list does not prove an asset is unused.'
  };
  fs.writeFileSync(output, JSON.stringify(inventory, null, 2));
  console.log(`Recorded ${files.length} files, ${assets.length} assets, ${textFiles.length} complete source texts.`);
}
