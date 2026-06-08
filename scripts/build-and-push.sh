#!/bin/sh
# Build and push both images to the registry.
# Run from the repository ROOT — the build context (the trailing ".") must be
# the workspace root so both images share the single root pnpm-lock.yaml.
set -e

cd "$(dirname "$0")/.."

docker buildx build --platform linux/amd64 \
  -t ishnoopy/fit-check-frontend:latest \
  -f frontend/Dockerfile --push .

docker buildx build --platform linux/amd64 \
  -t ishnoopy/fit-check-backend:latest \
  -f backend/Dockerfile --push .
