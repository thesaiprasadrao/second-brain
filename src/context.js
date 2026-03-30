import { getHistory } from './db.js';

export function buildContext() {
  return { history: getHistory(15) };
}
