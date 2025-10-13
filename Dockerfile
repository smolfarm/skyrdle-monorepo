# syntax=docker/dockerfile:1

# --- Builder stage: install deps and build Vite frontend ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install OS deps if needed (none currently)

# Copy package manifests first for better caching
COPY package*.json ./

# Install all deps (including dev) without running lifecycle scripts
RUN npm ci --ignore-scripts

# Copy the rest of the repo
COPY . .

# Build the frontend (outputs to ./dist via "vite build")
RUN npm run build

# --- Runtime stage: minimal prod image ---
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy only package manifests and install prod deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy server + built client + required runtime source files
COPY --from=builder /app/dist ./dist
COPY server.js ./server.js
COPY src ./src

# App runs on PORT (default 4000 per server.js)
ENV PORT=4000
EXPOSE 4000

# Default env for local compose; can be overridden
# ENV MONGODB_URI=mongodb://mongo:27017/skyrdle

CMD ["node", "server.js"]
