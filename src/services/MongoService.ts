import mongoose from 'mongoose';
import { SlackUser } from "../types/SlackUser";
import BeerModel from "../entities/Beer.model";
import MessageModel from "../entities/Message.model";
import { SlackMessage } from "../types/SlackMessage";
import { Beer } from '../types/Beer';

const { MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_DB_NAME } = process.env;

const wait = (millis: number) => new Promise((resolve) => setTimeout(resolve, millis));

class MongoService {
    constructor() {
        
    }

    /**
     * Connect to the Mongo database
     */
    async connect() {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`Connecting to database ${MONGO_HOST}`);
                await mongoose.connect(`mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:27017/${MONGO_DB_NAME}?retryWrites=true&w=majority&authSource=admin`, { autoCreate: true, autoIndex: false, useNewUrlParser: true });
                resolve();
            } catch(ex) {
                console.log(ex);
                console.log(`Failed to connect to MongoDB. Waiting 5s to retry...`);
                await wait(5000);
                resolve(this.connect());
            }
        });
    }

    /**
     * Add a {@link Beer} and the message it was linked to, to the database
     * @param {SlackUser} giver The user giving the beer 
     * @param {SlackMessage} message The message containing the {@link SlackUser} to send the beer to 
     */
    async addBeer(giver: SlackUser, message: SlackMessage) {
        const beer = await BeerModel.create({
            from_slack_id: giver.id,
            to_slack_id: message.user,
            sent_at: new Date().getTime(),
            message: MessageModel.create({ 
                user_slack_id: message.user, 
                text: message.text, 
                channel: message.channel, 
                sent_at: Math.floor(parseInt(message.ts) * 1000) 
            })
        });

        await beer.save();
    }

    /**
     * Gets {@link Beer} documents sent by a user
     * @param {string} userId The Slack user ID
     */
    async getBeersSent(userId: string): Promise<Beer[]> {
        const beers = await BeerModel.find({ from_slack_id: userId }, null, { lean: true }).lean(true); 
        return beers as Beer[];
    }

    /**
     * Get {@link Beer} documents received by a user
     * @param {string} userId The Slack user ID 
     */
    async getBeers(userId: string): Promise<Beer[]> {
        const beers = await BeerModel.find({ to_slack_id: userId }, null, { lean: true }).lean(true); 
        return beers as Beer[];
    }

    /**
     * Get the {@link Beer} documents that were given in a certain channel
     * @param {string} channelId The Slack channel ID 
     */
    async getBeersForChannel(channelId: string): Promise<Beer[]> {
        const beers = await BeerModel.find({ 'message.channel': channelId }, null, { lean: true }).lean(true); 
        return beers as Beer[];
    }

    /**
     * Get all of the beers ever sent
     */
    async getAllBeers(): Promise<Beer[]> {
        const beers = await BeerModel.find({}, null, { lean: true }).lean(true);
        return beers as Beer[];
    }
}

export default new MongoService;