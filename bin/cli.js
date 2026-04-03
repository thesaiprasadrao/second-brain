#!/usr/bin/env node
import 'dotenv/config';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'setup') {
  const { setup } = await import('../src/setup.js');
  await setup();
} else if (command === 'send') {
  const text = args.slice(1).join(' ').trim();
  if (!text) {
    console.log('Usage: second-brain send <message>');
    process.exit(1);
  }

  const { pipeline } = await import('../src/pipeline.js');
  const reply = await pipeline({ message: { conversation: text } });
  if (reply) console.log(reply);
} else {
  await import('../src/index.js');
}
