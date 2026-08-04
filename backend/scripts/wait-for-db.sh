#!/bin/sh
# Belt-and-suspenders TCP poll on top of compose's depends_on healthcheck -
# Postgres reporting "healthy" doesn't always mean it's accepting connections yet.
host="$1"
port="$2"

until python -c "import socket; socket.create_connection(('$host', $port), timeout=2)" 2>/dev/null; do
  echo "Waiting for $host:$port..."
  sleep 1
done
echo "$host:$port is up."
