/** @type {import('next').NextConfig} */
const nextConfig = {
  // elkjs's `elk.bundled.js` ships both a browser (Web Worker) and a Node
  // (worker_threads) code path and picks one at runtime. When Next bundles
  // it into the server build the bundler mangles that detection and we end
  // up with `_Worker is not a constructor` at request time. Marking elkjs
  // as external keeps it as a runtime `require(...)` so its detection works.
  serverExternalPackages: ['elkjs'],
};

export default nextConfig;
