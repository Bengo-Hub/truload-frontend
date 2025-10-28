# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure standalone output
RUN echo "module.exports = { experimental: { forceSwcTransforms: true }, output: 'standalone' }" > next.config.js || true
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime env (can be injected via K8s secret mounted as env)
ENV PORT=3000
EXPOSE 3000

# Copy Next.js standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

CMD ["node", "/app/server.js"]


