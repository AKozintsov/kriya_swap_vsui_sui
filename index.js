import { NAVISDKClient } from 'navi-sdk';
import { Dex as KriyaDex } from 'kriya-dex-sdk';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Configuration and initialization
const seedPhrase = '';
const keypair = Ed25519Keypair.deriveKeypair(seedPhrase, "m/44'/784'/0'/0'/0'");
const rpcUrl = getFullnodeUrl('mainnet');
const client = new SuiClient({ url: rpcUrl });
const naviClient = new NAVISDKClient({ mnemonic: seedPhrase, networkType: "mainnet", numberOfAccounts: 1 });
const kriyaDex = new KriyaDex('https://fullnode.mainnet.sui.io:443');

async function swapAndSupply() {
    const txb = new TransactionBlock();
    const account = naviClient.accounts[0];
    txb.setSender(account.address);

    const pool = {
        objectId: '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716',
        tokenXType: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
        tokenYType: '0x2::sui::SUI',
        isStable: true
    };

    const inputCoinType = '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT';
    const inputCoinAmount = BigInt(1000000); // Adjusting the amount
    const inputCoin = '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716';
    const minReceived = BigInt(1);

    console.log("swap parameters:", {
        pool,
        inputCoinType,
        inputCoinAmount: inputCoinAmount.toString(),
        inputCoin,
        minReceived: minReceived.toString()
    });

    // Properly create the inputCoinObject and inputTokenAmount
    // const inputCoinObject = txb.object(inputCoin);
    const inputTokenAmount = txb.pure(inputCoinAmount.toString()); // Ensuring it's passed as a string

    // console.log("inputCoinObject:", inputCoinObject);
    console.log("inputTokenAmount:", inputTokenAmount);
    txb.setGasBudget(BigInt(15000000)); // Example gas budget, adjust as needed

    const swapResult = await kriyaDex.swap(pool, inputCoinType, inputTokenAmount, inputCoin, minReceived, txb, account.address);

    // Convert the balance to a coin token using the specified token type
    const loan_sui_coin = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [swapResult],
        typeArguments: ['0x2::sui::SUI'] // Specify the token type (example: SUI token type)
    });

    // Convert the balance returned by the swap to a coin token
    const [newCoin] = txb.splitCoins(
        txb.object(loan_sui_coin),
        [loan_sui_coin] // The balance returned by the swap
    );

    // Transfer the created coin token to your account
    txb.transferObjects([newCoin], account.address);

    const result = await client.signAndExecuteTransactionBlock({ signer: keypair, transactionBlock: txb });

    console.log("Transaction result:", result);
}

await swapAndSupply();
