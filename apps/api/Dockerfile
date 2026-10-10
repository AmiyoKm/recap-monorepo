# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM oven/bun:1.4 AS build
WORKDIR /repo
COPY . .
RUN bun install --frozen-lockfile
RUN bun --filter @recap/api build

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=build /repo/apps/api/dist/server ./server
ENV PORT=8080
EXPOSE 8080
CMD ["./server"]
