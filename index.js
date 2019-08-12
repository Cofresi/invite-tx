const Api = require('@dashevo/dapi-client');
const {
  Transaction,
  PrivateKey,
  crypto,
  Unit,
} = require('@dashevo/dashcore-lib');
const bufferReader = require('@dashevo/dashcore-lib').encoding.BufferReader;
const Output = require('@dashevo/dashcore-lib').Transaction.Output;
const commander = require('commander');

const log = console;

/**
 * Create and setup DAPI client instance
 *
 * @param {{service: string}[][]} seeds
 *
 * @return {Promise<DAPIClient>}
 */
async function initApi(seeds) {
  const services = seeds.length !== 0 ? seeds.map(seed => new Object({ service: seed })) : { service: '195.141.143.49:3000' };
  api = new Api({
    seeds: services,
    port: 3000
  });

  return api;
}

async function logOutput(msg, delay = 50) {
  log.info(`${msg}`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

async function getInputInfo(api, input) {
  return await api.getTransactionById(input.prevTxId.toString('hex'));
}

async function getAvailableDuffs(outputInfo) {
  return outputInfo.reduce((acc, info) => {
    return acc + info.satoshis;
  }, 0);
}

/**
 * Main entry point for create
 *
 * @param {Command} cmd
 *
 * @return {Promise<void>}
 */

async function create() {

  const alicePrivKey = 'cRK3oHMLoayzAz2UUheFRRymtAeejte4yb4jf33PxZaj172HcaJ3';
  const alicePrivateKey = new PrivateKey(alicePrivKey);
  const bobPrivKey = 'cPszkGSpCkXzds5MGi8wHtJLCcD7Zj83XtCCEwXaoHZ4keLD3X8m';
  const bobPrivateKey = new PrivateKey(bobPrivKey);
  const aliceAddress ='yeXXy72V7hWXnPoy82qZQ5XsqZtFfuWH6G';
  const bobAddress ='yeLjp491QnWuhi5NZHLvXUyCUtoB5NNyjP';
  await logOutput(`aliceAddress ${aliceAddress}`);
  await logOutput(`bobAddress ${bobAddress}`);

  //const inputs = await dapiClient.getUTXO(aliceAddress);
  let inputs = {};
  inputs
    .items = [
      {
        address:"yeXXy72V7hWXnPoy82qZQ5XsqZtFfuWH6G",
        txid:"70fd6da8544ffe0a083f5e9a50ae361755dae223f10e179c627d99ad5f23fe29",
        vout:1,
        scriptPubKey:"76a914c7bb875d7fd38c672ce10427e7e172735c827f0388ac",
        satoshis:1125002300,
      },
      {
        address:"yeXXy72V7hWXnPoy82qZQ5XsqZtFfuWH6G",
        txid:"f0d31cd8f6a644aa3766227953c1d4f5da62184994e7016113f597cfef905ab4",
        vout:1,
        scriptPubKey:"76a914c7bb875d7fd38c672ce10427e7e172735c827f0388ac",
        satoshis:1125000000,
      },
    ];

  // 1. CONSTRUCTION
  // construct the invite transaction (presigned idOpenTx)

  const idOpenTx = Transaction()
    .setType(Transaction.TYPES.TRANSACTION_SUBTX_REGISTER)
    .from(inputs.items);

  // add signed inputs to idOpenTx
  const totalAvailableDuffs = await getAvailableDuffs (inputs.items);
  await logOutput(`totalAvailableDuffs ${totalAvailableDuffs}`);

  const availableInviteDuffs = totalAvailableDuffs - idOpenTx._estimateFee();
  await logOutput(`availableInviteDuffs ${availableInviteDuffs}`);

  idOpenTx.change(aliceAddress);
  await logOutput(`change 1 ${idOpenTx.getChangeOutput().satoshis}`);

  idOpenTx.addFundingOutput(availableInviteDuffs - 5460);
  await logOutput(`change 2 ${idOpenTx.getChangeOutput().satoshis}`);

  const aliceTemporaryPayload = new Transaction.Payload.SubTxRegisterPayload()
    .setUserName('alice')
    .setPubKeyIdFromPrivateKey(alicePrivateKey).sign(alicePrivateKey);

  await logOutput(`aliceTemporaryPayload ${aliceTemporaryPayload}`);

  idOpenTx.setExtraPayload(aliceTemporaryPayload);
  idOpenTx.sign(alicePrivateKey);

  // 2. EXPORT
  // now just export Alice's temporary idOpenTx as a qr code

  await logOutput(`idOpenTx ${idOpenTx.serialize()}`);

  // 3. IMPORT
  // import the temp idOpenTx into the wallet

  const bobIdTx = new Transaction(idOpenTx.serialize());

  const bobPayload = new Transaction.Payload.SubTxRegisterPayload()
    .setUserName('bob')
    .setPubKeyIdFromPrivateKey(bobPrivateKey).sign(bobPrivateKey);

  await logOutput(`bobPayload ${bobPayload}`);

  bobIdTx.setExtraPayload(bobPayload);

  await logOutput(`bobIdTx ${bobIdTx}`);
  //await logOutput(`idOpenTx isFullySigned ${idOpenTx.isFullySigned()}`);
}

commander
  .command('create')
  .action(create);

commander.parse(process.argv);
