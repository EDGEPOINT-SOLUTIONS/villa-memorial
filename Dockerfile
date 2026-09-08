# web standalone SSR container (template DoD: compose boots → SSR on $PORT).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* is inlined into client JS at build time, so demo-hint behaviour is a build
# arg, not runtime config. Both default EMPTY: a deployed build fills the persona email
# only. NEVER pass a real seed password here — it would ship admin credentials in public JS.
ARG NEXT_PUBLIC_DEMO_HINTS=1
ARG NEXT_PUBLIC_DEMO_PASSWORD=
ENV NEXT_PUBLIC_DEMO_HINTS=$NEXT_PUBLIC_DEMO_HINTS
ENV NEXT_PUBLIC_DEMO_PASSWORD=$NEXT_PUBLIC_DEMO_PASSWORD
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Public assets folder is empty today; copied so future additions need no Dockerfile change.
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
