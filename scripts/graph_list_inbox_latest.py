import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request


def _post_form(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    tenant = os.environ.get("GRAPH_TENANT_ID", "").strip()
    client_id = os.environ.get("GRAPH_CLIENT_ID", "").strip()

    if not tenant or not client_id:
        raise SystemExit(
            "Missing env vars. Set GRAPH_TENANT_ID and GRAPH_CLIENT_ID before running."
        )

    scope = "Mail.Read offline_access"
    device_url = (
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/devicecode"
    )
    token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"

    dc = _post_form(device_url, {"client_id": client_id, "scope": scope})

    # This includes verification URL + user code.
    print(dc["message"], flush=True)

    interval = int(dc.get("interval", 5))
    expires_at = time.time() + int(dc["expires_in"])

    access_token: str | None = None

    while time.time() < expires_at:
        try:
            token = _post_form(
                token_url,
                {
                    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                    "client_id": client_id,
                    "device_code": dc["device_code"],
                },
            )
            access_token = token.get("access_token")
            if access_token:
                break
        except urllib.error.HTTPError as e:
            payload = e.read().decode("utf-8")
            err = json.loads(payload)
            code = err.get("error")
            if code == "authorization_pending":
                time.sleep(interval)
                continue
            if code == "slow_down":
                time.sleep(interval + 5)
                continue
            raise

    if not access_token:
        raise SystemExit("Timed out waiting for sign-in.")

    graph_url = (
        "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages"
        "?$top=5"
        "&$select=subject,receivedDateTime,from,isRead"
        "&$orderby=receivedDateTime%20desc"
    )

    req = urllib.request.Request(
        graph_url, headers={"Authorization": f"Bearer {access_token}"}
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode("utf-8"))

    rows = data.get("value", [])

    print("\n--- Latest 5 Inbox messages ---")
    for m in rows:
        received = m.get("receivedDateTime", "")
        is_read = bool(m.get("isRead", False))
        frm = (m.get("from") or {}).get("emailAddress") or {}
        from_addr = frm.get("address", "")
        subject = (m.get("subject") or "").replace("\n", " ").strip()
        status = "READ" if is_read else "UNREAD"
        print(f"{received} | {status} | {from_addr} | {subject}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
