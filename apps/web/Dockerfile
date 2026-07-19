# CCOS Next.js frontend
FROM node:22-bookworm-slim

# Base URL of the API as seen by the user's BROWSER (NEXT_PUBLIC_* is baked in
# at build time). Relative by default: requests go same-origin to the Next BFF,
# which proxies /api/v1/* to the API (see next.config.ts + API_INTERNAL_URL).
ARG NEXT_PUBLIC_API_URL=/api/v1
# Clerk NEXT_PUBLIC_* vars are baked in at build time like the API URL above.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
# Docker build context is the repo root, so pnpm installs the full workspace
# and `next` is hoisted to /app/node_modules. Let next.config.ts pin the
# Turbopack root to the monorepo root (do NOT set NEXT_ISOLATED_BUILD here).
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

WORKDIR /app

# Install dependencies first (cached layer).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

# Build. Call the binary directly so pnpm's pre-run deps check can't abort on
# the native-build approval gate.
COPY apps/web/ ./apps/web/
RUN cd apps/web && ./node_modules/.bin/next build

EXPOSE 3000

WORKDIR /app/apps/web
ENV HOSTNAME=0.0.0.0

# $PORT is set dynamically by Heroku; falls back to 3000 for docker-compose,
# where it isn't set.
CMD ["sh", "-c", "./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
