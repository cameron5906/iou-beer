import mongoose from 'mongoose';
import { SlackUser } from "../types/SlackUser";
import BeerModel from "../entities/Beer.model";
import MessageModel from "../entities/Message.model";
import { SlackMessage } from "../types/SlackMessage";
import { Beer } from '../types/Beer';
import { wait } from '../helpers';

const { MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_DB_NAME } = process.env;

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
     * Checks if a beer has already been given to this message
     * @param {SlackUser} giver The person giving the beer for a message 
     * @param {string} userId The user receiving the beer 
     * @param {SlackMessage} message The message 
     */
    async doesBeerAlreadyExist(giver: SlackUser, userId: string, message: SlackMessage) {
        return await BeerModel.exists({ from_slack_id: giver.id, to_slack_id: userId, 'message.sent_at': Math.floor(parseInt(message.ts) * 1000) });
    }

    /**
     * Retrieves {@link Beer} documents that have been given by the user since the given date
     * @param {SlackUser} giver The person giving the beer 
     * @param {number} jsTimestamp The earliest time to check 
     */
    async getBeersGivenSince(giver: SlackUser, jsTimestamp: number) {
        const beers = await BeerModel.find({ 
            from_slack_id: giver.id, 
            sent_at: {
                $gte: jsTimestamp
            }
        });

        return beers;
    }

    /**
     * Add a {@link Beer} and the message it was linked to, to the database
     * @param {SlackUser} giver The user giving the beer 
     * @param {SlackMessage} message The message containing the {@link SlackUser} to send the beer to 
     */
    async addBeer(giver: SlackUser, userId: string, message: SlackMessage | null) {
        const beer = await BeerModel.create({
            from_slack_id: giver.id,
            to_slack_id: userId,
            sent_at: new Date().getTime(),
            message: message ? MessageModel.create({ 
                user_slack_id: message.user, 
                text: message.text, 
                channel: message.channel, 
                sent_at: Math.floor(parseInt(message.ts) * 1000) 
            }) : null
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
     * Clear out all the beers
     */
    async clearBeers() {
        await BeerModel.remove({});
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