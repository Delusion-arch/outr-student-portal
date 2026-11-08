# Stage 1: build the static site
FROM node:22-trixie-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite bakes this into the bundle, so it is a build argument
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: serve it with nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
