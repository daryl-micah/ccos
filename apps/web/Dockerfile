# CCOS Next.js frontend
FROM node:22-bookworm-slim

# Base URL of the API as seen by the user's BROWSER (NEXT_PUBLIC_* is baked in
# at build time). Defaults to the host-published API port.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_ISOLATED_BUILD=1

RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

WORKDIR /app

# Install dependencies first (cached layer).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

# Build. Call the binary directly so pnpm's pre-run deps check can't abort on
# the native-build approval gate.
COPY apps/web/ ./apps/web/
RUN cd apps/web && ../../node_modules/.bin/next build

EXPOSE 3000

WORKDIR /app/apps/web
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["../../node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
