const express = require('express');
const router = express.Router();

const {
	createBTCtestnetWallet,
	createAndBroadcastBTCTransaction,
	estimateBTCTransactionFee,
	btcCheckBalanceMiddleWare,
	validateBitcoinAddress,
	getTestBTC,
	createBtcWallet,
	getBTCBalance,
	getBtcInDollar,
	newBTCRoute,
} = require('../controllers/bitcoin.controller');

router.post('/create_btc_wallet', createBtcWallet);
router.post('/get_btc_balance', getBTCBalance);
router.post('/create_btc_testnet_wallet', createBTCtestnetWallet);
router.post('/get_test_btc', getTestBTC);
router.get('/get_btc_current_rate', getBtcInDollar);
router.post(
	'/estimate_fee_btc_transaction',
	validateBitcoinAddress,
	btcCheckBalanceMiddleWare,
	estimateBTCTransactionFee
);
router.post(
	'/send_btc_to_wallet',
	validateBitcoinAddress,
	btcCheckBalanceMiddleWare,
	createAndBroadcastBTCTransaction
);
router.get('/new_btc_route/:address', newBTCRoute);

module.exports = router;
