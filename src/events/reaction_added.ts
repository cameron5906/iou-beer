import { SlackUser } from "../types/SlackUser";
import { SlackReactionAddedEvent } from "../types/SlackReactionAddedEvent";
import MongoService from "../services/MongoService";
import SlackService from "../services/SlackService";
import { SlackMessageEvent } from "../types/SlackMessageEvent";

const { BEER_EMOJI_NAME } = process.env;

/**
 * This handles reaction add events to messages in a channel. Does not respond to anything but beer reactions.
 * @param {SlackUser} user The user who added the reaction 
 * @param {SlackReactionAddedEvent} event Data about the added reaction 
 */
const handleReactionAddedEvent = async(user: SlackUser, event: SlackReactionAddedEvent) => {
    if(user.is_bot) return;

    //Only react to beer
    if(event.reaction === BEER_EMOJI_NAME) {
        const toUser = await SlackService.getUser(event.item_user);
        const message = await SlackService.getMessage(event.item.ts, event.item.channel);
        
        if(user.id === event.item_user) {
            return SlackService.sendEphemeralMessage(
                user.id, 
                event.item.channel, 
                `You're going to go buy your own :${BEER_EMOJI_NAME}:? Good for you!`, 
                { 
                    user: message.user, 
                    channel: message.channel, 
                    ts: message.ts 
                } as SlackMessageEvent
            );
        }

        if(await MongoService.doesBeerAlreadyExist(user, message.user, message)) {
            return SlackService.sendEphemeralMessage(
                user.id,
                event.item.channel,
                `Oh, trying to game the system for :${BEER_EMOJI_NAME}: huh?`,
                {
                    user: message.user,
                    channel: message.channel,
                    ts: message.ts
                } as SlackMessageEvent
            );
        }

        const beersLast5Minutes = await MongoService.getBeersGivenSince(user, new Date().getTime() - (1000 * 60 * 5));
        if(beersLast5Minutes.length >= 5) {
            return SlackService.sendEphemeralMessage(
                user.id,
                event.item.channel, 
                `Woah there ${user.name}, slow down! You're cut off for now (5 beers in 5 minutes.)`, 
                {
                    user: message.user,
                    channel: message.channel,
                    ts: message.ts
                } as SlackMessageEvent
            )
        }

        MongoService.addBeer(user, message.user, message);
    
        SlackService.sendIM(toUser.id, `<@${user.id}> owes you a beer :${BEER_EMOJI_NAME}:!`);
        SlackService.sendEphemeralMessage(
            user.id, 
            event.item.channel, 
            `You owe ${toUser.real_name} a :${BEER_EMOJI_NAME}:!`, 
            { 
                user: message.user, 
                channel: message.channel, 
                ts: message.ts
            } as SlackMessageEvent
        );
    }
}

module.exports = handleReactionAddedEvent;