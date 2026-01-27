# syntax=docker/dockerfile:1

FROM node:20.19.4-slim AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# -----------------------
# DEV
# -----------------------
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3333
CMD ["npm", "run", "dev"]

# -----------------------
# BUILD
# -----------------------
FROM base AS build
ENV NODE_ENV=production
RUN npm run build

# -----------------------
# PROD
# -----------------------
FROM node:20.19.4-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
