import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    user_slack_id: String,
    text: String,
    channel: String,
    sent_at: Number
});

export default messageSchema;