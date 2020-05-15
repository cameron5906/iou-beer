import { SlackMessageEvent } from "../types/SlackMessageEvent";
import { SlackUser } from "../types/SlackUser";
import MongoService from "../services/MongoService";
import SlackService from "../services/SlackService";
import { Beer } from "../types/Beer";
import { getRandomAcknowledgementEmoji } from "../helpers";

const { SLACK_BOT_ID, AVG_BEER_PRICE, BEER_EMOJI_NAME, BEER_COOLDOWN_COUNT, BEER_COOLDOWN_MINUTES } = process.env;

/**
 * Handles incoming messages. This will only process non-bot messages that have this bot tagged inside of it.
 * @param {SlackUser} user The user who sent the message
 * @param {SlackMessageEvent} event The message data 
 */
const handleMessageEvent = async(user: SlackUser, event: SlackMessageEvent) => {
    if(user.is_bot) return; //Ignore bot messages

    const messageDetails = await SlackService.getMessage(event.ts, event.channel);
    const mentionsBot = event.text.indexOf(`<@${SLACK_BOT_ID}>`) !== -1;
    const mentionsBeer = event.text.indexOf(`:${BEER_EMOJI_NAME}:`) !== -1;
    let taggedUsers = event.text.match(/(?<=\<@)(.*?)(?=\>)/g) || [];
    taggedUsers = taggedUsers.filter(id => id !== SLACK_BOT_ID && id !== user.id); //don't allow the user themself or this bot

    //Check if they are asking how many beers is owed by a single person
    if(!mentionsBot && taggedUsers.length === 1 && mentionsBeer && event.text.split(`:${BEER_EMOJI_NAME}:`)[1].indexOf('?') > -1) {
        const beers = await MongoService.getBeers(user.id);
        const fromUser = beers.filter(beer => beer.from_slack_id === taggedUsers[0]);
        if(fromUser.length === 0) return SlackService.sendMessageToChannel(event.channel, `<@${taggedUsers[0]}> doesn't owe you anything...`, event);
        
        await SlackService.sendMessageToChannel(event.channel, `<@${taggedUsers[0]}> owes you ${fromUser.length} beer${fromUser.length === 1 ? '' : 's'}`, event);

        return;
    //Otherwise, see if they want to give one or more people a beer directly by name
    } else if(!mentionsBot && mentionsBeer && taggedUsers.length > 0) {
        const beersLast5Minutes = await MongoService.getBeersGivenSince(user, new Date().getTime() - (1000 * 60 * parseInt(BEER_COOLDOWN_MINUTES as string)));
        const availableBeer = parseInt(BEER_COOLDOWN_COUNT as string) - beersLast5Minutes.length;

        if(beersLast5Minutes.length >= parseInt(BEER_COOLDOWN_COUNT as string)) {
            return SlackService.sendMessageToChannel(event.channel, `Woah there ${user.name}, slow down! You're cut off for now (${BEER_COOLDOWN_COUNT} beers in ${BEER_COOLDOWN_MINUTES} minutes.)`, event);
        } else if(availableBeer - taggedUsers.length < 0) {
            return SlackService.sendMessageToChannel(event.channel, `Sorry ${user.name}, you can't owe that many beers right now... (${BEER_COOLDOWN_COUNT} beers in ${BEER_COOLDOWN_MINUTES} minutes, available: ${availableBeer})`, event);
        }

        taggedUsers.forEach(slackId => {
            MongoService.addBeer(user, slackId, null);
            SlackService.sendIM(slackId, `<@${user.id}> owes you a :${BEER_EMOJI_NAME}:!`);
        });

        SlackService.addReaction(getRandomAcknowledgementEmoji(), event.ts, event.channel);
        SlackService.sendEphemeralMessage(user.id, event.channel, `You owe ${taggedUsers.map(id => `<@${id}>`).join(', ')} a :${BEER_EMOJI_NAME}:`, event);

        return;
    }

    if(!mentionsBot) return; //can't send a command without tagging the bot

    const command = event.text.split(`<@${SLACK_BOT_ID}>`)[1].trim();

    //The user wants a list of people who owe them beer
    if(command.indexOf("list") === 0) {
        const includePrice = command.indexOf('price') !== -1;
        const beers = await MongoService.getBeers(user.id);

        if(beers.length === 0) return SlackService.sendMessageToChannel(event.channel, `<@${user.id}>, nobody owes you any :${BEER_EMOJI_NAME}:`, event);

        const totalPrice = (parseFloat(AVG_BEER_PRICE as string) * beers.length).toFixed(2);

        SlackService.sendMessageToChannel(
            event.channel, 
            makeBeerList(`You are owed ${includePrice ? `~$${totalPrice} worth of :${BEER_EMOJI_NAME}:` : `${beers.length} :${BEER_EMOJI_NAME}:'s`}`, 
            beers, 
            includePrice
        ), event);
        return;
    }

    //The user wants a list of beers they owe people
    if(command.indexOf("iou") === 0) {
        const includePrice = command.indexOf('price') !== -1;
        const beers = await MongoService.getBeersSent(user.id);

        if(beers.length === 0) return SlackService.sendMessageToChannel(event.channel, `<@${user.id}>, you don't owe anybody :${BEER_EMOJI_NAME}:`, event);

        const totalPrice = (parseFloat(AVG_BEER_PRICE as string) * beers.length).toFixed(2);

        SlackService.sendMessageToChannel(
            event.channel, 
            makeBeerList(`<@${user.id}>, you owe the following people ${includePrice ? `~$${totalPrice} worth of` : `a`} :${BEER_EMOJI_NAME}:`, 
            beers, 
            includePrice
        ), event);
        return;
    }

    //Requested leaderboard
    if(command.indexOf("leaderboard") === 0) {
        const beers = await MongoService.getAllBeers();

        if(beers.length === 0) return SlackService.sendMessageToChannel(event.channel, `Nobody owes anyone :${BEER_EMOJI_NAME}:!`, event);

        let beerMap = {} as { [slackId: string]: number };

        //Count up the beers per person
        beers.forEach(beer => {
            if(!beerMap[beer.to_slack_id]) {
                beerMap[beer.to_slack_id] = 0;
            }

            beerMap[beer.to_slack_id] += 1;
        });

        //Compile a leaderboard for all the beers
        const leaderboard = Object.keys(beerMap)
            .sort((userId1, userId2) => {
                if(beerMap[userId1] > beerMap[userId2]) return -1;
                return 1;
            })
            .slice(0, 5)
            .map(userId => 
                `<@${userId}>: ${beerMap[userId]}`    
            )
            .join('\n');

        SlackService.sendMessageToChannel(event.channel, `Here are the top 5 people owed :${BEER_EMOJI_NAME}:\n` + leaderboard, event);
        return;
    }

    //Clear the beers
    if(command.indexOf("clear") === 0 && user.is_admin) {
        await SlackService.addReaction(getRandomAcknowledgementEmoji(), event.ts, event.channel);
        await MongoService.clearBeers();
        return;
    }

    SlackService.sendEphemeralMessage(user.id, event.channel, `Sorry, that's not a valid command. Try "list", "iou", or "leaderboard"`, event);
}

/**
 * Generates a list of user tags with their respective beer count
 * @param {string} title The title of the list to show
 * @param {Beer[]} beers The beers that will be accounted for
 * @param {boolean} includePrice Whether or not to include pricing information
 */
const makeBeerList = (title: string, beers: Beer[], includePrice: boolean): string => {
    const avgPriceOfBeer = parseFloat(AVG_BEER_PRICE as string);
    let beerMap = {} as {[userName: string]: number};
        
    //Count up the beers per person
    beers.forEach(beer => {
        if(!beerMap[beer.to_slack_id]) {
            beerMap[beer.to_slack_id] = 0;
        }

        beerMap[beer.to_slack_id] += 1;
    });

    return `${title}\n` + 
        Object.keys(beerMap).map(slackId => {
            let priceText = includePrice ? (avgPriceOfBeer * beerMap[slackId]).toFixed(2) : '';

            return `<@${slackId}>: ${beerMap[slackId]} ${includePrice ? `(~$${priceText})` : ''}`;
        }).join('\n');
}

module.exports = handleMessageEvent;