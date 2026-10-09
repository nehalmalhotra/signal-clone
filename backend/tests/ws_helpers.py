"""Helpers for WebSocket tests."""

from contextlib import contextmanager


def token_of(headers: dict) -> str:
    return headers["Authorization"].split()[1]


@contextmanager
def socket(client, headers):
    """An authenticated socket whose connect handling has fully finished.

    `ready` is sent BEFORE presence and delivery catch-up run, but the server only starts reading
    this socket's frames afterwards, so a ping/pong round trip proves they are done. Without it,
    a test's first message could race the connect-time catch-up (which marks waiting messages
    delivered).
    """
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": token_of(headers)})
        ready = ws.receive_json()
        assert ready["type"] == "ready"
        ws.ready = ready  # tests that care about the snapshot read it from here
        drain(ws)  # defined below; waits for the pong
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
