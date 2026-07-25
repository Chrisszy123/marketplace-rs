##
## Build stage — VITE_API_URL is compiled into the static bundle, so it must be supplied as a
## build arg (not a runtime env var — Vite has no server to read env vars from at runtime).
##
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

##
## Runtime stage — static files served by Nginx, with SPA fallback so client-side routes
## (react-router) resolve on a hard refresh or direct link.
##
FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
