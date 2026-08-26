FROM node:20-alpine

WORKDIR /app

RUN addgroup app && adduser -S -G app app
RUN apk add --no-cache curl

COPY package*.json .

RUN npm install

COPY . .

USER app

EXPOSE 3000

HEALTHCHECK --start-period=5s --interval=5s  --retries=5 CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "SYSTEME_MISSION_NE_PAS_MODIFIER/app/server.js"]
