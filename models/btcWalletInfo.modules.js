const mongoose = require('mongoose');
const btcWalletInfoScheama = new mongoose.Schema(
    {
        wif_address: {
            type: String,
            required: true
        },
        wallet_address: {
            type: String,
            required: true
        },
        public_address: {
            type: String
        },
        symbol: {
            type: String,
            required: true
        },
        privateAddress: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('btcWalletInfo', btcWalletInfoScheama);