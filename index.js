const {
  Transaction,
  PrivateKey,
  crypto,
} = require('@dashevo/dashcore-lib');
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

  let bobAddress;
  let bobPrivateKey;
  let alicePrivateKey;

  const alicePrivKey = 'cRK3oHMLoayzAz2UUheFRRymtAeejte4yb4jf33PxZaj172HcaJ3';
  alicePrivateKey = new PrivateKey(alicePrivKey);

  bobAddress ='yeXXy72V7hWXnPoy82qZQ5XsqZtFfuWH6G';
  await logOutput(`bobAddress ${bobAddress}`);

  bobPrivateKey = new PrivateKey();
  await logOutput(`bobPrivateKey ${bobPrivateKey}`);

  //const inputs = await dapiClient.getUTXO(faucetAddress);
  let inputs = {};
  inputs
    .items = [
      {
        address:"yeXXy72V7hWXnPoy82qZQ5XsqZtFfuWH6G",
        txid:"70fd6da8544ffe0a083f5e9a50ae361755dae223f10e179c627d99ad5f23fe29",
        vout:1,
        scriptPubKey:"76a914c7bb875d7fd38c672ce10427e7e172735c827f0388ac",
        amount:11.250023,
        satoshis:1125002300,
      },
      {
        address:"yeXXy72V7hWXnPoy82qZQ5XsqZtFfuWH6G",
        txid:"f0d31cd8f6a644aa3766227953c1d4f5da62184994e7016113f597cfef905ab4",
        vout:1,
        scriptPubKey:"76a914c7bb875d7fd38c672ce10427e7e172735c827f0388ac",
        amount:11.25,
        satoshis:1125000000,
      },
    ];

  const transaction = new Transaction()
    .from(inputs.items)
    .change(bobAddress)
    .sign(alicePrivateKey, crypto.Signature.SIGHASH_NONE);

  const inviteTx = transaction.serialize();
  await logOutput(`invite tx ${inviteTx}`);

  // just export the P2PKH signature script

  // create P2PKH
  const input1 = Transaction.Input.fromObject(transaction.inputs[0]);
  const input2 = Transaction.Input.fromObject(transaction.inputs[1]);

  const pkh1 = new Transaction.Input.PublicKeyHash(input1);
  const pkh2 = new Transaction.Input.PublicKeyHash(input2);

  await logOutput(`script 1 ${input1.toObject().script}`);
  await logOutput(`script 2 ${input2.toObject().script}`);

  await logOutput(`script 1 isFullySigned ${pkh1.isFullySigned()}`);
  await logOutput(`script 2 isFullySigned ${pkh2.isFullySigned()}`);

  const userTx = new Transaction();
  // add signed inputs
  userTx.inputs.push(pkh1);
  userTx.inputs.push(pkh2);
  // add bob's address as only output
  const availableInviteAmount = userTx._getInputAmount() - userTx._estimateFee();
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
