import { createEventAdapter } from '@slack/events-api';
import fs from 'fs';
import { SlackEvent } from './types/SlackEvent';
import SlackService from './services/SlackService';
import MongoService from './services/MongoService';

const { SLACK_SIGNING_SECRET } = process.env;

(async() => {
    await MongoService.connect();
    const slackEvents = createEventAdapter(SLACK_SIGNING_SECRET as string);

    const eventHandlerFiles = fs.readdirSync('./events');
    eventHandlerFiles.forEach(fileName => {
        const evtName = fileName.substr(0, fileName.lastIndexOf('.'));
        slackEvents.on(evtName, async(event: SlackEvent) => {
            //New event, look up the user to send to the handler function
            const user = await SlackService.getUser(event.user);
            require(`./events/${evtName}`)(user, event);
        });
    });

    await slackEvents.start(80);
    console.log('Listening for Slack events');
})();