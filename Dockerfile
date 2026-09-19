# web — production image (Next.js standalone SSR).
#
# This image is built for a REAL deployment and is production-safe by default:
#   · demo persona hints are OFF unless a caller explicitly builds with
#     NEXT_PUBLIC_DEMO_HINTS=1 (only the demo stack does);
#   · the build REFUSES a NEXT_PUBLIC_DEMO_PASSWORD, because Next inlines
#     NEXT_PUBLIC_* into public JavaScript and that would publish a credential;
#   · the server runs as the non-root `node` user.
#
# Runtime configuration is server-side only and documented in
# .env.production.example + docs/08-delivery/deploying-web.md. Absent service
# base URLs keep that surface on recorded fixtures (the honest default); see
# the "Run modes" table in AGENTS.md.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Demo-hint visibility is inlined into client JS at build time, so it is a build arg.
# Default 0 is the production-safe value; docker-compose.yml (demo) passes 1.
ARG NEXT_PUBLIC_DEMO_HINTS=0
ENV NEXT_PUBLIC_DEMO_HINTS=$NEXT_PUBLIC_DEMO_HINTS
# Guard, not configuration: NEXT_PUBLIC_* values are inlined into public JS, so a
# build arg here would publish the demo password to every visitor. Demo deployments
# use the server-side runtime DEMO_QUICK_FILL pair instead (see .env.example).
ARG NEXT_PUBLIC_DEMO_PASSWORD=
RUN if [ -n "$NEXT_PUBLIC_DEMO_PASSWORD" ]; then \
      echo "ERROR: NEXT_PUBLIC_DEMO_PASSWORD must never be set for a build — Next inlines it into public JavaScript." >&2; \
      exit 1; \
    fi
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Standalone server.js binds to $HOSTNAME when set, and Docker sets HOSTNAME to the
# container id — which would bind the container IP only, so 127.0.0.1 (and the
# healthcheck below) cannot reach it. Pin it to all interfaces explicitly.
ENV HOSTNAME=0.0.0.0
# The app runs as `node`, never root: the standalone bundle, static assets and the
# public folder are copied with node ownership.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Public assets folder is empty today; copied so future additions need no Dockerfile change.
COPY --from=build --chown=node:node /app/public ./public
# Fixture-mode durable stores (lib/api-client/*-store.ts) write under .data/. Create it
# node-owned so a freshly mounted volume inherits a writable owner on first use.
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
EXPOSE 3000
# Liveness: the public home page answers 200 once the server has booted.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
