const { ACKNOWLEDGEMENT_EMOJIS } = process.env;

export const getRandomAcknowledgementEmoji = () => {
    const array = (ACKNOWLEDGEMENT_EMOJIS as string).split(',');
    return array[Math.floor(Math.random() * array.length)];
}

export const wait = (millis: number) => new Promise((resolve) => setTimeout(resolve, millis));