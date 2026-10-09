"""Helpers for WebSocket tests."""

from contextlib import contextmanager


def token_of(headers: dict) -> str:
    return headers["Authorization"].split()[1]


@contextmanager
def socket(client, headers):
    """An authenticated socket; the `ready` frame has already been consumed."""
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": token_of(headers)})
        assert ws.receive_json()["type"] == "ready"
        yield ws


def recv_until(ws, type_: str, **match) -> dict:
    """Skip frames until one of this type (and matching fields) arrives. pytest-timeout turns a
    frame that never comes into a test failure instead of a hang."""
    while True:
        frame = ws.receive_json()
        if frame["type"] == type_ and all(frame.get(k) == v for k, v in match.items()):
            return frame


def drain(ws) -> list[dict]:
    """Everything the server has already pushed to this socket.

    The server handles one socket's frames strictly in order, so once the pong comes back every
    frame sent before it has arrived. That makes "nothing was pushed" a deterministic assertion.
    """
    ws.send_json({"type": "ping"})
    frames = []
    while (frame := ws.receive_json())["type"] != "pong":
        frames.append(frame)
    return frames


def of_type(frames: list[dict], type_: str) -> list[dict]:
    return [f for f in frames if f["type"] == type_]
