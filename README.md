# iou-beer

A bot for Slack that keeps a tally of beer reactions and provides a leaderboard.

#### Commands

```
@person :beer: - Gives a person a beer directly

@person :beer:? - Gets the amount of beers owed by one person

@iou_beers list [with prices] - List of people who owe you beers, how many, and optionally the prices they pay

@iou_beers iou [with prices] - List of people who you owe beers to, how many, and optionally the prices you'd pay

@iou_beers leaderboard - Displays the top 5 list of people with the most beers owed to them

@iou_beers clear - Admin only, clears out the beer database
```



## Run it yourself with Docker

The process of setting this up for your own Slack workspace is very simple. I've created a docker-compose file that sets an environment up with the latest nodejs to run the app and a MongoDB server, everything is configurable.

##### Step 1. Create a **.env** file in the root of the project

```
SLACK_BOT_ID={the id of the bot in your workspace}
SLACK_TOKEN={a slack bot token for your app}
SLACK_SIGNING_SECRET={your Slack signing secret for your app}
MONGO_USERNAME={the username to create the mongodb instance with}
MONGO_PASSWORD={the password for the root user of the mongodb instance}
MONGO_DB_NAME={the name of the mongodb database}
AVG_BEER_PRICE={a floating point price of avg beer prices}
BEER_EMOJI_NAME={customize which emoji in your workspace represents beer}
ACKNOWLEDGEMENT_EMOJIS={comma separated emoji list that the bot uses to acknowledge certain commands}
```

##### Step 2. Run it!

```
docker-compose build
docker-compose up
```

And bam. Just add the bot to your workspace if it's not already, add it to some channels, and fire off some beer reactions or commands.
