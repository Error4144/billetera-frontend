FROM node:22.23.5-alpine AS build
WORKDIR /app
ARG VITE_DATA_MODE=demo
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY index.html tsconfig.json vite.config.ts playwright.config.ts eslint.config.mjs ./
COPY src/ ./src/
COPY tests/ ./tests/
COPY nginx.conf nginx.integration.conf ./
RUN VITE_DATA_MODE=$VITE_DATA_MODE npm run build
RUN if [ "$VITE_DATA_MODE" = "integration" ]; then cp nginx.integration.conf selected-nginx.conf; else cp nginx.conf selected-nginx.conf; fi

FROM nginx:1.30.8-alpine
COPY --from=build /app/selected-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 8080
