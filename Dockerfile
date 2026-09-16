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
# Demo-hint visibility is inlined into client JS at build time, so it is a build arg.
ARG NEXT_PUBLIC_DEMO_HINTS=1
ENV NEXT_PUBLIC_DEMO_HINTS=$NEXT_PUBLIC_DEMO_HINTS
# Persona password quick-fill is deliberately NOT a build arg: NEXT_PUBLIC_DEMO_PASSWORD
# is inlined into public JS and would publish the credential. Local dev sets it in
# web/.env for `npm run dev` only. Deployed images enable one-click fill at runtime with
# the server-side DEMO_QUICK_FILL (+ DEMO_QUICK_FILL_PASSWORD) — see .env.example.
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
