"""What a group member can see depends on when they were in the group.

Signal encrypts each message to the people who are members at that moment, so:
- a newly added member never receives anything sent before they joined;
- a removed-then-re-added member keeps what they had, but never receives what was
  sent while they were out.
"""

import pytest

from tests.conftest import CARMEN, HANA, chats, login, user_id

# Known gap found in Phase 3 planning: history is only cut at left_at, never at joined_at.
# strict=True: once fixed these XPASS and fail the run, forcing the marker to be removed.
KNOWN_LEAK = pytest.mark.xfail(strict=True, reason="history visibility ignores joined_at / earlier windows")


def _bodies_and_actions(client, conv_id, headers):
    page = client.get(f"/conversations/{conv_id}/messages", params={"limit": 100}, headers=headers).json()
    return [m["body"] or m["meta"]["action"] for m in page["messages"]]


def _send(client, conv_id, headers, text):
    r = client.post(f"/conversations/{conv_id}/messages", json={"client_id": text, "body": text},
                    headers=headers)
    assert r.status_code == 201


@KNOWN_LEAK
def test_new_member_sees_nothing_from_before_they_joined(client, alice, ticking_clock):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    _send(client, hike, alice, "before Hana")
    client.post(f"/groups/{hike}/members", json={"user_ids": [user_id(client, alice, HANA)]}, headers=alice)
    _send(client, hike, alice, "after Hana")

    hana = login(client, HANA)
    assert _bodies_and_actions(client, hike, hana) == ["member_added", "after Hana"]
    # The chat-list preview must follow the same rule.
    assert chats(client, hana)["Weekend Hike"]["last_message"]["body"] == "after Hana"


def test_new_member_chat_list_preview_is_the_add_line_before_anyone_speaks(client, alice, ticking_clock):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    client.post(f"/groups/{hike}/members", json={"user_ids": [user_id(client, alice, HANA)]}, headers=alice)
    preview = chats(client, login(client, HANA))["Weekend Hike"]["last_message"]
    assert preview["kind"] == "group_update" and preview["meta"]["action"] == "member_added"


@KNOWN_LEAK
def test_re_added_member_keeps_old_history_but_not_the_gap(client, alice, ticking_clock):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    carmen_h, carmen = login(client, CARMEN), user_id(client, alice, CARMEN)
    seen_before = _bodies_and_actions(client, hike, carmen_h)

    client.delete(f"/groups/{hike}/members/{carmen}", headers=alice)
    _send(client, hike, alice, "while Carmen was out")
    client.post(f"/groups/{hike}/members", json={"user_ids": [carmen]}, headers=alice)
    _send(client, hike, alice, "after Carmen returned")

    seen = _bodies_and_actions(client, hike, carmen_h)
    assert seen == seen_before + ["member_removed", "member_added", "after Carmen returned"]
    assert "while Carmen was out" not in seen
