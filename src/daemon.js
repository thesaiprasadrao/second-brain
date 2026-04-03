import pm2 from 'pm2';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

const APP_NAME = '2nd-brain';
const SERVER_PATH = path.join(projectRoot, 'src/index.js');

export async function startDaemon() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);

      pm2.start(
        {
          name: APP_NAME,
          script: SERVER_PATH,
          cwd: projectRoot,
          instances: 1,
          exec_mode: 'fork',
          watch: false,
          env: {
            NODE_ENV: 'production',
          },
          error_file: path.join(projectRoot, 'second-brain.log'),
          out_file: path.join(projectRoot, 'second-brain.log'),
          log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
        (err, apps) => {
          pm2.disconnect();
          if (err) return reject(err);
          resolve(apps);
        }
      );
    });
  });
}

export async function stopDaemon() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);

      pm2.stop(APP_NAME, (err) => {
        pm2.disconnect();
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export async function deleteDaemon() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);

      pm2.delete(APP_NAME, (err) => {
        pm2.disconnect();
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export async function restartDaemon() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);

      pm2.restart(APP_NAME, (err) => {
        pm2.disconnect();
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export async function statusDaemon() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);

      pm2.list((err, apps) => {
        pm2.disconnect();
        if (err) return reject(err);

        const app = apps.find((a) => a.name === APP_NAME);
        resolve(app);
      });
    });
  });
}

export async function logsDaemon(lines = 50) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);

      pm2.logs(APP_NAME, lines, false, (err, logs) => {
        pm2.disconnect();
        if (err) return reject(err);
        resolve(logs);
      });
    });
  });
}
