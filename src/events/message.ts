import { SlackMessageEvent } from "../types/SlackMessageEvent";
import { SlackUser } from "../types/SlackUser";
import MongoService from "../services/MongoService";
import SlackService from "../services/SlackService";
import { Beer } from "../types/Beer";
import { getRandomAcknowledgementEmoji } from "../helpers";

const { SLACK_BOT_ID, AVG_BEER_PRICE, BEER_EMOJI_NAME } = process.env;

/**
 * Handles incoming messages. This will only process non-bot messages that have this bot tagged inside of it.
 * @param {SlackUser} user The user who sent the message
 * @param {SlackMessageEvent} event The message data 
 */
const handleMessageEvent = async(user: SlackUser, event: SlackMessageEvent) => {
    if(user.is_bot) return; //Ignore bot messages

    const mentionsBot = event.text.indexOf(`<@${SLACK_BOT_ID}>`) !== -1;
    let taggedUsers = event.text.match(/(?<=\<@)(.*?)(?=\>)/g) || [];
    taggedUsers = taggedUsers.filter(id => id !== SLACK_BOT_ID && id !== user.id); //don't allow the user themself or this bot

    //Check if they are asking how many beers is owed by a single person
    if(!mentionsBot && taggedUsers.length === 1 && event.text.indexOf(`:${BEER_EMOJI_NAME}:?`) !== -1) {
        const beers = await MongoService.getBeers(user.id);
        const fromUser = beers.filter(beer => beer.from_slack_id === taggedUsers[0]);
        await SlackService.sendMessageToChannel(event.channel, `<@${taggedUsers[0]}> owes you ${fromUser.length} beer${fromUser.length === 1 ? '' : 's'}`);

        return;
    //Otherwise, see if they want to give one or more people a beer directly by name
    } else if(!mentionsBot && event.text.indexOf(BEER_EMOJI_NAME as string) !== -1 && taggedUsers.length > 0) {
        taggedUsers.forEach(slackId => {
            MongoService.addBeer(user, slackId, null);
            SlackService.sendIM(slackId, `<@${user.id}> owes you a :${BEER_EMOJI_NAME}:!`);
        });

        SlackService.addReaction(getRandomAcknowledgementEmoji(), event.ts, event.channel);
        SlackService.sendEphemeralMessage(user.id, event.channel, `You owe ${taggedUsers.map(id => `<@${id}>`).join(', ')} a :${BEER_EMOJI_NAME}:`);

        return;
    }

    if(!mentionsBot) return; //can't send a command without tagging the bot

    const command = event.text.split(`<@${SLACK_BOT_ID}>`)[1].trim();

    //The user wants a list of people who owe them beer
    if(command.indexOf("list") === 0) {
        const includePrice = command.indexOf('price') !== -1;
        const beers = await MongoService.getBeers(user.id);

        if(beers.length === 0) return SlackService.sendMessageToChannel(event.channel, `<@${user.id}>, nobody owes you any :${BEER_EMOJI_NAME}:`);

        const totalPrice = (parseFloat(AVG_BEER_PRICE as string) * beers.length).toFixed(2);

        SlackService.sendMessageToChannel(event.channel, makeBeerList(`You are owed ${includePrice ? `~$${totalPrice} worth of :${BEER_EMOJI_NAME}:` : `${beers.length} :${BEER_EMOJI_NAME}:'s`}`, beers, includePrice));
        return;
    }

    //The user wants a list of beers they owe people
    if(command.indexOf("iou") === 0) {
        const includePrice = command.indexOf('price') !== -1;
        const beers = await MongoService.getBeersSent(user.id);

        if(beers.length === 0) return SlackService.sendMessageToChannel(event.channel, `<@${user.id}>, you don't owe anybody :${BEER_EMOJI_NAME}:`);

        const totalPrice = (parseFloat(AVG_BEER_PRICE as string) * beers.length).toFixed(2);

        SlackService.sendMessageToChannel(event.channel, makeBeerList(`<@${user.id}>, you owe the following people ${includePrice ? `~$${totalPrice} worth of` : `a`} :${BEER_EMOJI_NAME}:`, beers, includePrice));
        return;
    }

    //Requested leaderboard
    if(command.indexOf("leaderboard") === 0) {
        const beers = await MongoService.getAllBeers();

        if(beers.length === 0) return SlackService.sendMessageToChannel(event.channel, `Nobody owes anyone :${BEER_EMOJI_NAME}:!`);

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

        SlackService.sendMessageToChannel(event.channel, `Here are the top 5 people owed :${BEER_EMOJI_NAME}:\n` + leaderboard);
        return;
    }

    //Clear the beers
    if(command.indexOf("clear") === 0 && user.is_admin) {
        await SlackService.addReaction(getRandomAcknowledgementEmoji(), event.ts, event.channel);
        await MongoService.clearBeers();
        return;
    }

    SlackService.sendEphemeralMessage(user.id, event.channel, `Sorry, that's not a valid command. Try "list", "iou", or "leaderboard"`);
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