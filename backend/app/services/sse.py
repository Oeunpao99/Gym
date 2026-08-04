"""In-memory SSE broadcaster for TV/kiosk scan events, ported from server.js's
Map<branch, Set<res>> pattern using asyncio.Queue per connected client instead of raw
response objects (fits FastAPI's async streaming model)."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict

_clients: dict[str, set[asyncio.Queue]] = defaultdict(set)


def _key(branch: str | None) -> str:
    return (branch or "").strip().lower()


def register(branch: str | None) -> asyncio.Queue:
    queue: asyncio.Queue = asyncio.Queue()
    _clients[_key(branch)].add(queue)
    return queue


def unregister(branch: str | None, queue: asyncio.Queue) -> None:
    key = _key(branch)
    _clients[key].discard(queue)
    if not _clients[key]:
        _clients.pop(key, None)


async def broadcast(branch: str | None, event: str, data: dict) -> None:
    key = _key(branch)
    for queue in list(_clients.get(key, ())):
        await queue.put((event, data))


def format_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"
