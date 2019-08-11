const {
  Transaction,
  PrivateKey,
  crypto,
} = require('@dashevo/dashcore-lib');
const bufferReader = require('@dashevo/dashcore-lib').encoding.BufferReader;
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

  const alicePrivKey = 'cRK3oHMLoayzAz2UUheFRRymtAeejte4yb4jf33PxZaj172HcaJ3';
  const alicePrivateKey = new PrivateKey(alicePrivKey);

  const aliceAddress ='yeXXy72V7hWXnPoy82qZQ5XsqZtFfuWH6G';
  const bobAddress ='yd5KMREs3GLMe6mTJYr3YrH1juwNwrFCfB';
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

  // outputs don't get exported !!!

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

  await logOutput(`satoshis 1 ${importedInput1.toObject().output.toObject().satoshis}`);
  await logOutput(`satoshis 2 ${importedInput2.toObject().output.toObject().satoshis}`);

  await logOutput(`script 1 isFullySigned ${p2kh1.isFullySigned()}`);
  await logOutput(`script 2 isFullySigned ${p2kh2.isFullySigned()}`);


  const userTx = new Transaction();

  // add signed inputs
  userTx.inputs.push(importedInput1);
  userTx.inputs.push(importedInput2);

  // calculate available amount
  const totalAvailableAmount = userTx.inputs.reduce(async (acc, input) => {
    const txById = await dapiClient.getTransactionById(input.prevTxId);
    return acc + txById.vout[input.vout].amount;
  }, 0);

  const availableInviteAmount = totalAvailableAmount - userTx._estimateFee();

  // add bob's address as only output
  userTx.to(bobAddress, availableInviteAmount);

  await logOutput(`available amount ${userTx._getInputAmount()}`);
  await logOutput(`fee ${userTx._estimateFee()}`);
  await logOutput(`actual amount ${availableInviteAmount}`);
  await logOutput(`userTx ${userTx}`);
  await logOutput(`isFullySigned ${userTx.isFullySigned()}`);
}

commander
  .command('create')
  .action(create);

commander.parse(process.argv);
