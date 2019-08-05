const {
  Transaction,
  PrivateKey,
  PublicKey,
  Address,
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

  let faucetPrivateKey;
  let faucetAddress;
  let bobPrivateKey;
  let bobUserName;

  const privKey = 'cVwyvFt95dzwEqYCLd8pv9CzktajP4tWH2w9RQNPeHYA7pH35wcJ';
  faucetPrivateKey = new PrivateKey(privKey);

  const faucetPublicKey = PublicKey.fromPrivateKey(faucetPrivateKey);

  faucetAddress = Address
    .fromPublicKey(faucetPublicKey, 'testnet')
    .toString();

  await logOutput(`faucetAddress ${faucetAddress}`);

  //bobUserName = 'bob_' + Math.random().toString(36).substring(7);
  bobUserName = 'bob';
  await logOutput(`bobUserName ${bobUserName}`);

  bobPrivateKey = new PrivateKey();
  await logOutput(`bobPrivateKey ${bobPrivateKey}`);

  const validPayload = new Transaction.Payload.SubTxRegisterPayload()
    .setUserName(bobUserName)
    .setPubKeyIdFromPrivateKey(bobPrivateKey).sign(bobPrivateKey);

  await logOutput(`validPayload ${validPayload}`);

  //const inputs = await dapiClient.getUTXO(faucetAddress);
  let inputs = {};
  inputs
    .items = [
      {
      address:"yereyozxENB9jbhqpbg1coE5c39ExqLSaG",
      txid:"6303c60d2735c7080e4faf993bba33c90aa6b4f45ac5832873b1b127bb23dc69",
      vout:0,
      scriptPubKey:"76a914cb594917ad4e5849688ec63f29a0f7f3badb5da688ac",
      amount:11.25000415,
      satoshis:1125000415,
      height:149553,
      confirmations:1
      },
      {
        address:"yereyozxENB9jbhqpbg1coE5c39ExqLSaG",
        txid:"ee5c088affd44f3e91a35257bd1c93fd469b39c805c60aa5d7febac6948350d7",
        vout:0,
        scriptPubKey:"76a914cb594917ad4e5849688ec63f29a0f7f3badb5da688ac",
        amount:11.25,
        satoshis:1125000000,
        height:149552,
        confirmations:2
      },
    ];

  const transaction = new Transaction()
    .setType(Transaction.TYPES.TRANSACTION_SUBTX_REGISTER)
    .setExtraPayload(validPayload)
    .from(inputs.items)
    .addFundingOutput(10000)
    .change(faucetAddress)
    .sign(faucetPrivateKey, crypto.Signature.SIGHASH_NONE);

  await logOutput(`invite tx ${transaction}`);
}

commander
  .command('create')
  .action(create);

commander.parse(process.argv);
