import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    slack_id: String,
    total_beers_received: Number,
    total_beers_sent: Number,
    beers: { type: mongoose.Schema.Types.ObjectId, ref: 'Beer' }
});

export default userSchema;