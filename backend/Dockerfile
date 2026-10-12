# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# In Google Cloud Run, Application Default Credentials (ADC) or mounted secrets are used
# Optional fallback if local credential file is packaged in non-public deployment
COPY firebase-credentials.json* ./

EXPOSE 8080

CMD ["node", "dist/main.js"]
