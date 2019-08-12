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
    const unit = Unit.fromBTC(info.value);
    const duffs = unit.toSatoshis();
    return acc + duffs;
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
  // construct the invite transaction

  const transaction = new Transaction()
    .from(inputs.items)
    .change(bobAddress)
    .sign(alicePrivateKey, crypto.Signature.SIGHASH_NONE);

  const inviteTx = transaction.serialize();
  await logOutput(`invite tx ${inviteTx}`);

  const input1 = Transaction.Input.fromObject(transaction.inputs[0]);
  const input2 = Transaction.Input.fromObject(transaction.inputs[1]);

  await logOutput(`output 1 script ${input1.output.toObject().script}`);
  await logOutput(`output 2 script ${input2.output.toObject().script}`);
  await logOutput(`output 1 satoshis ${input1.output.toObject().satoshis}`);
  await logOutput(`output 2 satoshis ${input2.output.toObject().satoshis}`);

  // 2. EXPORT
  // now just export the P2PKH inputs with their signature scripts

  let input1ExportString;
  let input2ExportString;

  // outputs don't get exported

  if (transaction.inputs[0].isFullySigned() && transaction.inputs[1].isFullySigned()) {
    input1ExportString = input1.toBufferWriter().toBuffer().toString('hex');
    input2ExportString = input2.toBufferWriter().toBuffer().toString('hex');
    await logOutput(`export input 1 ${input1ExportString}`);
    await logOutput(`export input 2 ${input2ExportString}`);
  }

  // 3. IMPORT
  // import the exported strings into the wallet

  const bufInput1 = Buffer.from(input1ExportString, 'hex');
  const bufInput2 = Buffer.from(input2ExportString, 'hex');

  const reader1 = new bufferReader(bufInput1);
  const importedInput1 = Transaction.Input.fromBufferReader(reader1);

  const reader2 = new bufferReader(bufInput2);
  const importedInput2 = Transaction.Input.fromBufferReader(reader2);

  // create P2PKH

  const p2kh1 = new Transaction.Input.PublicKeyHash(importedInput1);
  const p2kh2 = new Transaction.Input.PublicKeyHash(importedInput2);

  await logOutput(`p2kh1 ${JSON.stringify(p2kh1.toObject())}`);
  await logOutput(`p2kh2 ${JSON.stringify(p2kh2.toObject())}`);

  await logOutput(`script 1 ${importedInput1.toObject().script}`);
  await logOutput(`script 2 ${importedInput2.toObject().script}`);

  await logOutput(`script 1 isFullySigned ${p2kh1.isFullySigned()}`);
  await logOutput(`script 2 isFullySigned ${p2kh2.isFullySigned()}`);


  const userTx = new Transaction();

  // add signed inputs
  userTx.inputs.push(importedInput1);
  userTx.inputs.push(importedInput2);

  const dapiClient = await initApi(['195.141.143.49:3000']);

  // calculate available amount
  async function getOutputsInfo(inputArray) {
    let outputArray = [];
    let i = 0;
    for (const input of inputArray) {
      const info = await getInputInfo(dapiClient, input);
      userTx.inputs[i].output = new Output({
        satoshis: Unit.fromBTC(info.vout[input.outputIndex].value).toSatoshis(),
        script: info.vout[input.outputIndex].scriptPubKey.hex,
      });
      outputArray.push(info.vout[input.outputIndex]);
      i++;
    }
    return outputArray;
  }

  const info = await getOutputsInfo(userTx.inputs);

  const totalAvailableDuffs = await getAvailableDuffs(info);

  await logOutput(`totalAvailableDuffs ${totalAvailableDuffs}`);

  const bobPayload = new Transaction.Payload.SubTxRegisterPayload()
    .setUserName('bob')
    .setPubKeyIdFromPrivateKey(bobPrivateKey).sign(bobPrivateKey);

  await logOutput(`bobPayload ${bobPayload}`);

  const idOpenTx = Transaction()
    .setType(Transaction.TYPES.TRANSACTION_SUBTX_REGISTER)
    .setExtraPayload(bobPayload);

  // add signed inputs to idOpenTx
  userTx.inputs.forEach(input => idOpenTx.addInput(input, input.output.script, input.output.satoshis));

  const availableInviteDuffs = totalAvailableDuffs - idOpenTx._estimateFee();
  await logOutput(`availableInviteDuffs ${availableInviteDuffs}`);

  idOpenTx.addFundingOutput(availableInviteDuffs);
  idOpenTx.change(bobAddress, false);

  await logOutput(`idOpenTx ${idOpenTx}`);
  //await logOutput(`idOpenTx isFullySigned ${idOpenTx.isFullySigned()}`);
}

commander
  .command('create')
  .action(create);

commander.parse(process.argv);
