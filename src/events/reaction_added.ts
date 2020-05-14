import { SlackUser } from "../types/SlackUser";
import { SlackReactionAddedEvent } from "../types/SlackReactionAddedEvent";
import MongoService from "../services/MongoService";
import SlackService from "../services/SlackService";

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
        MongoService.addBeer(user, message);
    
        SlackService.sendIM(toUser.id, `<@${toUser.id}> owes you a beer! :${BEER_EMOJI_NAME}:`);
        SlackService.sendEphemeralMessage(user.id, event.item.channel, `You owe ${toUser.real_name} a :${BEER_EMOJI_NAME}:!`);
    }
}

module.exports = handleReactionAddedEvent;