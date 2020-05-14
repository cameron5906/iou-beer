FROM node:latest

WORKDIR /iou-beer

EXPOSE 80
ENV SLACK_BOT_ID=""
ENV SLACK_TOKEN=""
ENV SLACK_SIGNING_SECRET=""
ENV MONGO_HOST=""
ENV MONGO_USERNAME=""
ENV MONGO_PASSWORD=""
ENV MONGO_DB_NAME=""
ENV BEER_EMOJI_NAME=""
ENV CHECKMARK_EMOJI_NAME=""

COPY package.json package.json
COPY tsconfig.json tsconfig.json
RUN npm install
COPY src src

CMD ["npm", "start"]
ENTRYPOINT [ "npm", "start" ]