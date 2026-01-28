# ---- build client ----
FROM node:20-bookworm-slim AS client-build
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
# install workspace deps
RUN npm install
COPY client ./client
RUN npm --workspace client run build

# ---- build server deps ----
FROM node:20-bookworm-slim AS server-deps
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
# better-sqlite3 needs build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN npm install --omit=dev

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# copy node_modules for workspaces
COPY --from=server-deps /app/node_modules ./node_modules
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

ENV PORT=5174
EXPOSE 5174

WORKDIR /app/server
CMD ["node", "src/index.js"]
