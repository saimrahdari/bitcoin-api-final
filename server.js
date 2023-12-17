const express = require('express');
const morgan = require('morgan');
const connectDB = require('./db/db')
const cors = require('cors');
const path = require('path');
const app = express();

require('dotenv').config({
    path: './config/config.env'
})
connectDB();
app.use(express.json());

const BTCRoutes = require('./routes/bitcoin.routers')
// Dev Logginf Middleware
const corsOptions = {
    exposedHeaders: ['Authorization', 'New-Token'],
};

app.use(cors(corsOptions));
//app.use(cors())
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
    //Morgon give information about each request
    //Cors it's allow to deal with react for localhost at port 3000 without any problem
}

app.use('/api', BTCRoutes)

app.use((req, res) => {
    res.status(404).json({
        success: false,
        msg: "Page not founded"
    })
})
const PORT = process.env.PORT || 5030

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
