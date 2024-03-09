const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const { ECPairFactory } = require('ecpair');
const ecc = require('tiny-secp256k1');
const ECPair = ECPairFactory(ecc);
const axios = require('axios');
const hdkey = require('hdkey');
const { getCryptoInUsd } = require('../helpers/walletHalper');
const btcWalletInfoModules = require('../models/btcWalletInfo.modules');

const satoshi = 100000000;

exports.createBtcWallet = async (req, res) => {
	const recoveryPhrase = bip39.generateMnemonic();
	try {
		const seed = await bip39.mnemonicToSeed(recoveryPhrase); //creates seed buffer
		const root = hdkey.fromMasterSeed(seed);
		const masterPrivateKey = root.privateKey.toString('hex');
		console.log('masterPrivateKey: ' + masterPrivateKey);

		const keyPair = await ECPair.fromPrivateKey(
			Buffer.from(masterPrivateKey, 'hex')
		);
		const wif = keyPair.toWIF(Buffer.from(masterPrivateKey, 'hex'));

		const { address } = bitcoin.payments.p2wpkh({
			pubkey: keyPair.publicKey,
		});

		let newBTCWallet = new btcWalletInfoModules({
			wif_address: wif,
			wallet_address: address,
			symbol: 'BTC',
			privateAddress: masterPrivateKey,
			public_address: keyPair.publicKey,
		});
		const saveData = await newBTCWallet.save();

		var result = {
			walletAddress: saveData.wallet_address,
			privateKey: masterPrivateKey,
		};
		return res.status(200).json({ status: 200, data: result });
	} catch (err) {
		return res.status(400).json({ status: 400, error: err.message });
	}
};

exports.createBTCtestnetWallet = async (req, res) => {
	try {
		const walletsAPi = await axios.post(
			`https://api.blockcypher.com/v1/btc/main/addrs?token=${process.env.BLOCKCYPHER_TOKEN}`
		);
		const walletDetail = walletsAPi.data;

		return res.status(200).json({
			wif_address: walletDetail.wif,
			symbol: 'BTC',
			wallet_address: walletDetail.address,
			privateAddress: walletDetail.private,
			public_address: walletDetail.public,
		});
	} catch (error) {
		console.log(
			'🚀 ~ file: bitcoin.controller.js ~ line 73 ~ exports.createBTCtestnetWal ~ error',
			error
		);
		return res.status(400).json({ error: error.message });
	}
};

exports.estimateBTCTransactionFee = async (req, res) => {
	const { fromAddress, toAddress, amount } = req.body;

	if (fromAddress && toAddress && amount) {
		estimateFeeForBTCTransaction(fromAddress, toAddress, amount, res);
	} else {
		return res.status(400).json({ error: 'All fields are required' });
	}
};

exports.createAndBroadcastBTCTransaction = async (req, res) => {
	const { fromAddress, toAddress, privateKey, amount } = req.body;

	if (fromAddress && toAddress && amount) {
		const feeInSwet = req.feeInSwet;
		sendBtcTransaction(fromAddress, toAddress, amount, privateKey, res);
	} else {
		return res.status(400).json({ error: 'All fields are required' });
	}
};

const estimateFeeForBTCTransaction = async (
	fromAddress,
	toAddress,
	amount,
	res
) => {
	const amountIn = Number(amount) * satoshi;
	var newtx = {
		inputs: [{ addresses: [fromAddress] }],
		outputs: [{ addresses: [toAddress], value: amountIn }],
	};
	try {
		const transactionDetail = await axios.post(
			`https://api.blockcypher.com/v1/btc/main/txs/new?token=${process.env.BLOCKCYPHER_TOKEN}`,
			JSON.stringify(newtx)
		);
		const transactionData = transactionDetail.data;
		const feeInSatoshi = transactionData.tx.fees;
		const balInBTC = feeInSatoshi / satoshi;
		return res.status(200).json({ estimatedGasFee: balInBTC });
	} catch (error) {
		console.log(
			'🚀 ~ file: bitcoin.controller.js:117 ~ estimateFeeForBTCTransaction ~ error:',
			error
		);
		return res.status(400).json({ error: error.message });
	}
};

const sendBtcTransaction = async (
	fromAddress,
	toAddress,
	amount,
	privateKey,
	res
) => {
	try {
		const keyPair = await ECPair.fromPrivateKey(
			Buffer.from(privateKey, 'hex')
		);

		const amountIn = amount * satoshi;
		var newtx = {
			inputs: [{ addresses: [fromAddress] }],
			outputs: [{ addresses: [toAddress], value: amountIn }],
		};

		const transactionDetail = await axios.post(
			`https://api.blockcypher.com/v1/btc/main/txs/new?token=${process.env.BLOCKCYPHER_TOKEN}`,
			JSON.stringify(newtx)
		);
		const tmptx = transactionDetail.data;
		tmptx.pubkeys = [];
		tmptx.signatures = tmptx.tosign.map(function (tosign, n) {
			tmptx.pubkeys.push(keyPair.publicKey.toString('hex'));
			return bitcoin.script.signature
				.encode(keyPair.sign(Buffer.from(tosign, 'hex')), 0x01)
				.toString('hex')
				.slice(0, -2);
		});

		const finalTransaction = await axios.post(
			`https://api.blockcypher.com/v1/btc/main/txs/send?token=${process.env.BLOCKCYPHER_TOKEN}`,
			JSON.stringify(tmptx)
		);

		const transactionData = finalTransaction.data;
		const TransactionHash = transactionData.tx.hash;

		return res.status(200).json({ transactionHash: TransactionHash });
	} catch (error) {
		console.log(
			'🚀 ~ file: bitcoin.controller.js ~ line 111 ~ exports.createBTCTransaction= ~ error',
			error
		);
		return res.status(400).json({ error: error.message });
	}
};

exports.btcCheckBalanceMiddleWare = async (req, res, next) => {
	const { fromAddress, amount } = req.body;
	if (fromAddress && amount) {
		try {
			const checkBal = await axios.get(
				`https://api.blockcypher.com/v1/btc/main/addrs/${fromAddress}/balance?token=${process.env.BLOCKCYPHER_TOKEN}`
			);

			console.log("Check Balance" + checkBal)
			const balData = checkBal.data;
			const balance = balData.final_balance;
			const balInBTC = balance / satoshi;
			console.log(
				'🚀 ~ file: bitcoin.controller.js ~ line 151 ~ exports.btcTransactionMiddleWare= ~ balInBTC',
				balInBTC
			);

			if (balInBTC < Number(amount)) {
				return res.status(400).json({
					error: `You do not have enough BTC. Kindly get more BTC to proceed.`,
				});
			} else {
				return next();
			}
		} catch (error) {
			console.log(
				'🚀 ~ file: bitcoin.controller.js ~ line 157 ~ exports.btcTransactionMiddleWare= ~ error',
				error
			);
			return res.status(400).json({ error: error.message });
		}
	} else {
		return res.status(400).json({ error: 'All fields are required' });
	}
};

/**
 *
 * My address
 * {
  private: '9c8f30701655f9afdc7f420776a113996b4fd7d6e4bce10d6623d8069bb25585',
  public: '029ba27a8d118be18a4ceb57ccfd9a555ff6c23b7c0a9784818b1d942de33a3676',
  address: 'BuymfX3aLJgQbQhtYQkeFUYXHenAsVCRXW',
  wif: 'BtaMvsu1mF4gdTW9puttnMrMvHJyPzv5J9nbqq82WySGAtHw2X5p'
}
 *
 * Recevier Address{
  private: 'c1fa48b5ae27a94467fc75334dc46fdd7c12b69812ceb89933dbdb0d4506aea2',
  public: '03b024ea362bfe31870682905d3186dae6a756fb1525c439ab54df3c4b9da9fad7',
  address: 'CBrQMF7XYSCeww9yQD5Jz7ysngMn92aDad',
  wif: 'Buq6dztFxRvSvtDTUkRqkBFXgGbtP2HNVEmB99dbzwRXbJPjjZu6'
}
 **/

exports.getTestBTC = async (req, res) => {
	const { walletAddress } = req.body;

	let data = { address: walletAddress, amount: 500000 };
	try {
		const responce = await axios.post(
			'https://api.blockcypher.com/v1/bcy/test/faucet?token=40fe436d313a412a9b94890d97cf0d84',
			JSON.stringify(data)
		);
		return res.status(200).json({ data: responce.data });
	} catch (error) {
		console.log(
			'🚀 ~ file: bitcoin.controller.js ~ line 180 ~ exports.getTestBTC= ~ error',
			error
		);
		return res.status(400).json({ error: error.message });
	}
};

exports.validateBitcoinAddress = async (req, res, next) => {
	const { toAddress } = req.body;
	if (toAddress) {
		axios
			.get(
				`https://api.blockcypher.com/v1/btc/main/addrs/${toAddress}/balance?token=${process.env.BLOCKCYPHER_TOKEN}`
			)
			.then(responce => {
				return next();
			})
			.catch(err => {
				return res.status(400).json({ error: err.response.data.error });
			});
	} else {
		return res.status(400).json({ error: 'All fields are required' });
	}
};

exports.getBTCBalance = async (req, res) => {
	const { walletAddress } = req.body;
	if (walletAddress) {
		let symbol = 'BTC';
		let btcAmount = 0.0;
		let balanceInDollar = 0.0;
		try {
			const checkBal = await axios.get(
				`https://api.blockcypher.com/v1/btc/main/addrs/${walletAddress}/balance?token=${process.env.BLOCKCYPHER_TOKEN}`
			);
			const balData = checkBal.data;
			const balance = balData.final_balance;
			const balInBTC = balance / satoshi;
			btcAmount = balInBTC;
			console.log(
				'🚀 ~ file: bitcoin.controller.js ~ line 398 ~ exports.getBTCBalanceByUserId= ~ balInBTC',
				balInBTC
			);

			balanceInDollar = btcAmount;
			if (balInBTC > 0) {
				const btcInDollar = await getCryptoInUsd(symbol);
				const Bindollar =
					btcInDollar[symbol] === undefined ? 1 : btcInDollar[symbol];
				balanceInDollar = Bindollar * balInBTC;
			}
			return res
				.status(200)
				.json({ btcBal: btcAmount, btcBalInDollar: balanceInDollar });
		} catch (error) {
			console.log(
				'🚀 ~ file: bitcoin.controller.js:258 ~ exports.getBTCBalance= ~ error:',
				error
			);

			return res
				.status(400)
				.json({ btcBal: btcAmount, btcBalInDollar: balanceInDollar });
		}
	} else {
		return res.status(400).json({ error: 'Wallet Address is required' });
	}
};

exports.getBtcInDollar = async (req, res) => {
	try {
		const symbol = 'BTC';
		const btcInDollar = await getCryptoInUsd(symbol);
		const Bindollar =
			btcInDollar[symbol] === undefined ? 1 : btcInDollar[symbol];
		return res.status(200).json({ 'current rate ins USD': Bindollar });
	} catch (error) {
		console.log(
			'🚀 ~ file: bitcoin.controller.js:276 ~ exports.getBtcInDollar= ~ error:',
			error
		);
		return res.status(400).json({ error: error.message });
	}
};


exports.newBTCRoute = async (req, res) => {

	let filteredData = [];
	let address = req.params.address;
	const response = await axios.get(
		`https://api.blockcypher.com/v1/btc/main/addrs/${address}?token=${process.env.BLOCKCYPHER_TOKEN}`
	);

	if(response.data.txrefs){
		filteredData = response.data.txrefs.filter(item => item.tx_input_n === -1 && item.tx_output_n === 0);

	}


	res.status(200).json({ data: filteredData});
};

