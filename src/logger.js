import { createWriteStream } from 'fs';

const stream = createWriteStream('second-brain.log', { flags: 'a' });

function write(level, msg) {
  const line = `[${new Date().toISOString()}] ${level.padEnd(5)} ${msg}\n`;
  stream.write(line);
}

export const log = {
  info: (msg) => write('INFO', msg),
  error: (msg) => write('ERROR', msg),
};
