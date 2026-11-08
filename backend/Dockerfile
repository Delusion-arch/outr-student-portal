FROM node:22-trixie-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-trixie-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The SQLite file lives in /app/data so it can sit on a volume
RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 5000
CMD ["node", "server.js"]
