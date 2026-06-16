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

# Install dependencies first (cached layer). Generous fetch timeout/retries
# for large native binaries (e.g. Next SWC) on slow networks.
COPY package.json ./
RUN pnpm install --no-frozen-lockfile \
    --config.fetch-timeout=600000 \
    --config.fetch-retries=5

# Build. Call the binary directly so pnpm's pre-run deps check can't abort on
# the native-build approval gate.
COPY . .
RUN ./node_modules/.bin/next build

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
