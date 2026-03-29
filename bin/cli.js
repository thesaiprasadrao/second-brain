#!/usr/bin/env node
const args = process.argv.slice(2);

if (args[0] === 'setup') {
  const { setup } = await import('../src/setup.js');
  await setup();
} else {
  await import('../src/index.js');
}
