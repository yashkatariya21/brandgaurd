FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build-time args — passed in from docker-compose.yml or CI.
# Vite bakes these into the bundle at build time, so they must be set here,
# not at runtime. Defaults match the local docker compose setup.
ARG VITE_API_URL=http://localhost:8000
ARG VITE_DEMO_MODE=false
ARG VITE_DEMO_PASSWORD=
ARG VITE_ORG_SLUG=nimbusdesk

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
ENV VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD
ENV VITE_ORG_SLUG=$VITE_ORG_SLUG

RUN npm run build

FROM node:22-alpine AS serve
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
