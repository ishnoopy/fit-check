#!/bin/sh
docker ps --filter "name=^/mongo$" --filter "status=running" -q | grep -q . || \
  docker-compose -f docker-compose.local.yml up -d

pnpm -r --parallel run dev
