import socket

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api", tags=["app-info"])


def _lan_address() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
        finally:
            s.close()
    except OSError:
        return "localhost"


@router.get("/app-info")
def app_info(request: Request):
    origin = f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
    lan_url = f"http://{_lan_address()}:{request.url.port or 8000}"
    return {
        "origin": origin,
        "lan_url": lan_url,
        "card_base_url": f"{lan_url}/card",
    }
