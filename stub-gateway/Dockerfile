FROM node:22-alpine
WORKDIR /stub
COPY lib/fixtures /fixtures
COPY stub-gateway/server.mjs ./server.mjs
ENV FIXTURES_DIR=/fixtures \
    STUB_PORT=8080
USER node
CMD ["node", "server.mjs"]
