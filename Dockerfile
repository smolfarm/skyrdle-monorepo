# syntax=docker/dockerfile:1

# --- Builder stage: install deps and build Vite frontend (Bun) ---
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install OS deps if needed (none currently)

# Copy package manifests and Bun lockfile first for better caching
COPY package.json bun.lock ./

# Install all deps (including dev)
RUN bun install --frozen-lockfile

# Copy the rest of the repo
COPY . .

# Build the frontend (outputs to ./dist via "vite build")
RUN bun run build

# --- Runtime stage: minimal prod image (Bun) ---
FROM oven/bun:latest AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy only package manifests and install prod deps
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

# Copy server + built client + required runtime source files
COPY --from=builder /app/dist ./dist
COPY server.js ./server.js
COPY src ./src

# App runs on PORT (default 4000 per server.js)
ENV PORT=4000
EXPOSE 4000

# Default env for local compose; can be overridden
# ENV MONGODB_URI=mongodb://mongo:27017/skyrdle

CMD ["bun", "server.js"]
