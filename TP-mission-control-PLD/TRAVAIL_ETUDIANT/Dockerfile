FROM node:20-alpine

WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "SYSTEME_MISSION_NE_PAS_MODIFIER/app/server.js"]
