# FROM node:20-alpine AS build
# WORKDIR /usr/src/app
# COPY package*.json tsconfig.json ./
# RUN npm ci
# COPY src ./src
# RUN npm run build

# FROM node:20-alpine AS production
# WORKDIR /usr/src/app
# ENV NODE_ENV=production
# COPY package*.json ./
# RUN npm ci --omit=dev
# COPY --from=build /usr/src/app/dist ./dist
# COPY src/docs ./src/docs
# EXPOSE 4000
# CMD ["node", "dist/server.js"]

FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /usr/src/app/dist ./dist
COPY src/docs ./src/docs
EXPOSE 4000
CMD ["node", "dist/server.js"]