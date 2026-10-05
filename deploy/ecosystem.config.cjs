// PM2 process definition, started by deploy/deploy.sh.
// Two workers in cluster mode, so that a reload replaces them one after the other and the site
// never stops answering (src/lib/shutdown.ts lets an old worker finish its requests). SQLite in
// WAL mode accepts several processes. The rate limits (login, contact form) are kept in memory,
// hence counted per worker: with two workers a limit can be reached up to twice as late.
const appDir = process.env.APP_DIR || '/srv/hope';

module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || 'hope',
      // `current` is a symlink to the active release; the script path is resolved again on each reload.
      cwd: `${appDir}/current`,
      script: 'dist/server/entry.mjs',
      // Configuration (HOST, PORT, DATABASE_PATH, DATA_DIR, secrets) lives outside the releases.
      node_args: `--env-file=${appDir}/shared/.env`,
      exec_mode: 'cluster',
      instances: 2,
      // A new worker that does not listen within this delay is considered failed.
      listen_timeout: 10000,
      max_memory_restart: '600M',
      // Time left to an old worker to finish its requests before it is killed.
      kill_timeout: 10000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
