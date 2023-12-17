const mongoose = require('mongoose');

const connectDB = async () => {
  mongoose.set('strictQuery', false); // Add this line to set strictQuery to false
  mongoose.connect(process.env.MONGO_URL_LIVE, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log(`MongoDB Connected`);
  }).catch((err) => console.log(err));
}

module.exports = connectDB;
