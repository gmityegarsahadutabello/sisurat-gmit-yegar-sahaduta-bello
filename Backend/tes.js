import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/suratDB')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error', err));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log('connected to db (open event)'));