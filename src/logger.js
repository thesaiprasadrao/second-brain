import { createWriteStream } from 'fs';

const stream = createWriteStream('second-brain.log', { flags: 'a' });

function getISTTime() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function write(level, msg) {
  const line = `[${getISTTime()}] ${level.padEnd(5)} ${msg}\n`;
  stream.write(line);
}

export const log = {
  info: (msg) => write('INFO', msg),
  error: (msg) => write('ERROR', msg),
};