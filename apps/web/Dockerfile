# Build context is apps/web. Serves the static build and forwards /api to the FastAPI service.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Leave unset to call "/api" on the same origin (the nginx proxy below). Set it to an absolute
# URL to call an API on another origin; that API must then list this site in CORS_ORIGINS.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.29-alpine
# nginx renders templates in this folder with the container's environment at start-up.
ENV API_UPSTREAM=http://api:8000
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
