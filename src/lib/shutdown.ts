import cluster from 'node:cluster';

/**
 * Under PM2 in cluster mode (deploy/ecosystem.config.cjs), a reload starts the new workers and
 * then sends SIGINT to the old ones. Instead of dying at once, an old worker stops accepting
 * connections and exits when the requests it was answering are finished; PM2 kills it after
 * `kill_timeout` if that takes too long. Nothing changes outside a cluster (dev server, `pnpm start`).
 */
if (cluster.isWorker) {
  process.once('SIGINT', () => cluster.worker?.disconnect());
}
