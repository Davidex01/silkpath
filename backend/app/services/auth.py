from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Tuple, Optional
from uuid import uuid4
from pathlib import Path
import json

from app.schemas.auth import User, AuthRegisterRequest, AuthLoginRequest
from app.schemas.orgs import Organization, OrganizationRole, KybStatus

# Пути к файлам (можно поменять при желании)
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"
ORGS_FILE = DATA_DIR / "orgs.json"
PASSWORDS_FILE = DATA_DIR / "passwords.json"

users: Dict[str, User] = {}
orgs: Dict[str, Organization] = {}
passwords: Dict[str, str] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _dt_to_str(dt: datetime) -> str:
    return dt.isoformat()


def _dt_from_str(s: str) -> datetime:
    return datetime.fromisoformat(s)


def _save_users() -> None:
    _ensure_data_dir()
    data = []
    for u in users.values():
        d = u.dict()
        d["createdAt"] = _dt_to_str(u.createdAt)
        data.append(d)
    USERS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _save_orgs() -> None:
    _ensure_data_dir()
    data = []
    for o in orgs.values():
        d = o.dict()
        d["createdAt"] = _dt_to_str(o.createdAt)
        data.append(d)
    ORGS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _save_passwords() -> None:
    _ensure_data_dir()
    PASSWORDS_FILE.write_text(json.dumps(passwords, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_users() -> None:
    if not USERS_FILE.exists():
        return
    raw = json.loads(USERS_FILE.read_text(encoding="utf-8"))
    for item in raw:
        item["createdAt"] = _dt_from_str(item["createdAt"])
        u = User(**item)
        users[u.id] = u


def _load_orgs() -> None:
    if not ORGS_FILE.exists():
        return
    raw = json.loads(ORGS_FILE.read_text(encoding="utf-8"))
    for item in raw:
        item["createdAt"] = _dt_from_str(item["createdAt"])
        o = Organization(**item)
        orgs[o.id] = o


def _load_passwords() -> None:
    if not PASSWORDS_FILE.exists():
        return
    raw = json.loads(PASSWORDS_FILE.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        for k, v in raw.items():
            passwords[str(k)] = str(v)


# Инициализация при импортe модуля
_load_users()
_load_orgs()
_load_passwords()


def register(data: AuthRegisterRequest) -> Tuple[User, Organization, dict]:
    # проверяем, нет ли пользователя с таким email
    for u in users.values():
        if u.email == data.email:
            raise ValueError("user_with_email_exists")

    org_id = str(uuid4())
    user_id = str(uuid4())

    org = Organization(
        id=org_id,
        name=data.orgName,
        country=data.orgCountry,
        role=data.orgRole,
        kybStatus=KybStatus.pending,
        createdAt=_now(),
    )

    user = User(
        id=user_id,
        email=data.email,
        name=data.name,
        phone=None,
        orgId=org_id,
        createdAt=_now(),
    )

    orgs[org_id] = org
    users[user_id] = user
    passwords[user_id] = data.password

    # сохраняем всё в файлы
    _save_users()
    _save_orgs()
    _save_passwords()

    tokens = _make_demo_tokens(user_id)
    return user, org, tokens


def login(data: AuthLoginRequest) -> Tuple[User, Organization, dict]:
    user = next((u for u in users.values() if u.email == data.email), None)
    if not user:
        raise ValueError("invalid_credentials")

    stored_pwd = passwords.get(user.id)
    if stored_pwd != data.password:
        raise ValueError("invalid_credentials")

    org = orgs[user.orgId]  # type: ignore[arg-type]
    tokens = _make_demo_tokens(user.id)
    return user, org, tokens


def _make_demo_tokens(user_id: str) -> dict:
    return {
        "accessToken": f"demo-access-{user_id}",
        "refreshToken": f"demo-refresh-{user_id}",
        "expiresIn": 3600,
    }


def get_user_by_access_token(token: str) -> Optional[User]:
    """
    MVP: accessToken is either 'demo-access-<user_id>' or user_id.
    """
    if token.startswith("demo-access-"):
        user_id = token[len("demo-access-") :]
    else:
        user_id = token
    return users.get(user_id)