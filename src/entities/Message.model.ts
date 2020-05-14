import mongoose from 'mongoose';
import messageSchema from './Message.schema';

const MessageModel = mongoose.model('Message', messageSchema, 'messages');
export default MessageModel;