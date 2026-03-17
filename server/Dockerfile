FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm install -g typescript && tsc && npm uninstall -g typescript

EXPOSE 2567

CMD ["node", "dist/index.js"]
