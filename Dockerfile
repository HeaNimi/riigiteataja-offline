FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache libstdc++
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
RUN mkdir -p /data/import /data/work
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
