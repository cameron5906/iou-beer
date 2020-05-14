import mongoose from 'mongoose';
import messageSchema from './Message.schema';

const beerSchema = new mongoose.Schema({
    from_slack_id: String,
    to_slack_id: String,
    sent_at: Number,
    message: messageSchema
});

export default beerSchema;