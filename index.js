const dashcore = require('@dashevo/dashcore-lib');
const commander = require('commander');

const log = console;

async function logOutput(msg, delay = 50) {
  log.info(`${msg}`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Main entry point for create
 *
 * @param {Command} cmd
 *
 * @return {Promise<void>}
 */
async function create() {
  const tx = dashcore.Transaction();
  await logOutput(`tx ${tx}`);
}

commander
  .command('create')
  .action(create);

commander.parse(process.argv);
