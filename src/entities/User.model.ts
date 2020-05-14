import mongoose from 'mongoose';
import userSchema from './User.schema';

const UserModel = mongoose.model('User', userSchema, 'users');
export default UserModel;