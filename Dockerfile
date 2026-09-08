# Production Dockerfile for ContentCraft AI on Render
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Step 1: Install dependencies
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# Step 2: Build frontend client assets
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Step 3: Minimal production runtime image
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.tsx custom-routes.ts tsconfig.json ./
COPY src/lib ./src/lib
COPY src/generated ./src/generated

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "server.tsx"]
