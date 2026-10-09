import base64

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==")


def test_patch_changes_only_sent_fields_and_clears_with_null(client, alice):
    r = client.patch("/me", json={"about": "Hello there"}, headers=alice)
    assert r.json()["about"] == "Hello there" and r.json()["given_name"] == "Alice"
    r = client.patch("/me", json={"about": None, "family_name": ""}, headers=alice)
    assert r.json()["about"] is None and r.json()["family_name"] is None


def test_given_name_cannot_be_blanked(client, alice):
    assert client.patch("/me", json={"given_name": "  "}, headers=alice).status_code == 400


def test_username_conflict_is_case_insensitive_and_format_checked(client, alice):
    assert client.patch("/me", json={"username": "BOBOKAFOR.11"}, headers=alice).status_code == 409
    assert client.patch("/me", json={"username": "no spaces.1"}, headers=alice).status_code == 422
    assert client.patch("/me", json={"username": "alice.99"}, headers=alice).json()["username"] == "alice.99"


def test_avatar_upload_replace_and_delete(client, alice):
    r = client.put("/me/avatar", files={"file": ("a.png", PNG, "image/png")}, headers=alice)
    assert r.status_code == 200
    first = r.json()["avatar_url"]
    assert first.startswith("/media/avatars/")
    media = client.app.state.media_dir
    assert len(list((media / "avatars").iterdir())) == 1

    second = client.put("/me/avatar", files={"file": ("b.png", PNG, "image/png")}, headers=alice)
    assert second.json()["avatar_url"] != first
    assert len(list((media / "avatars").iterdir())) == 1  # old file was removed

    r = client.delete("/me/avatar", headers=alice)
    assert r.json()["avatar_url"] is None
    assert list((media / "avatars").iterdir()) == []


def test_avatar_rejects_non_images_and_oversize(client, alice):
    bad = client.put("/me/avatar", files={"file": ("a.png", b"not an image", "image/png")}, headers=alice)
    assert bad.status_code == 400
    big = client.put("/me/avatar", files={"file": ("a.png", PNG + b"0" * (5 * 1024 * 1024), "image/png")},
                     headers=alice)
    assert big.status_code == 400
