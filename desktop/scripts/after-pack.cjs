const { cpSync } = require('fs');
const { join } = require('path');

exports.default = async function (context) {
  const src = join(context.packager.projectDir, 'nextjs-standalone', 'node_modules');
  const dest = join(context.appOutDir, 'resources', 'nextjs-standalone', 'node_modules');
  console.log('[after-pack] Copying node_modules to standalone bundle...');
  cpSync(src, dest, { recursive: true });
  console.log('[after-pack] Done.');
};
