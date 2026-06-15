"""Shared HTTP helpers for NutriCan research scripts."""
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any

import requests

DEFAULT_BASE = "http://localhost:8080/api/v1"
REPO_ROOT = Path(__file__).resolve().parents[2]


def api_base() -> str:
    return os.environ.get("RESEARCH_API_BASE", DEFAULT_BASE).rstrip("/")


def git_commit_short() -> str:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO_ROOT,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return out.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


class ResearchClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base = (base_url or api_base()).rstrip("/")
        self.session = requests.Session()
        self.token: str | None = None
        self.user: dict[str, Any] | None = None

    def _headers(self) -> dict[str, str]:
        h = {"Accept": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _unwrap(self, resp: requests.Response) -> Any:
        resp.raise_for_status()
        body = resp.json()
        if isinstance(body, dict) and "data" in body:
            return body.get("data")
        return body

    def health_backend(self) -> bool:
        """Return True if API is reachable (auth endpoint responds)."""
        try:
            r = self.session.post(
                f"{self.base}/auth/login",
                json={"email": "health-probe@nutrican.local", "password": "probe"},
                timeout=10,
            )
            return r.status_code in (200, 400, 401, 403)
        except requests.RequestException:
            return False

    def ai_health(self) -> dict[str, Any]:
        r = self.session.get(f"{self.base}/ai/health", headers=self._headers(), timeout=15)
        r.raise_for_status()
        data = r.json().get("data", r.json())
        return data if isinstance(data, dict) else {}

    def login(self, email: str, password: str) -> dict[str, Any]:
        r = self.session.post(
            f"{self.base}/auth/login",
            json={"email": email, "password": password},
            timeout=30,
        )
        if r.status_code == 401 or r.status_code == 400:
            raise requests.HTTPError(f"Login failed for {email}: {r.text}", response=r)
        data = self._unwrap(r)
        self.token = data["accessToken"]
        self.user = data.get("user", {})
        return data

    def register_customer(self, email: str, password: str, full_name: str) -> dict[str, Any]:
        r = self.session.post(
            f"{self.base}/auth/register",
            json={"email": email, "password": password, "fullName": full_name},
            timeout=30,
        )
        if r.status_code == 400 and "already" in r.text.lower():
            return self.login(email, password)
        r.raise_for_status()
        return self.login(email, password)

    def ensure_login(self, email: str, password: str, full_name: str) -> dict[str, Any]:
        try:
            return self.login(email, password)
        except requests.HTTPError:
            return self.register_customer(email, password, full_name)

    def analyze_meal(
        self,
        image_path: Path,
        *,
        meal_type: str = "LUNCH",
        meal_source: str = "HOME_COOKED",
        meal_complexity: str = "SIMPLE",
        restaurant_name: str | None = None,
        hotpot_broth_id: str | None = None,
        hotpot_item_ids: list[str] | None = None,
        composite_item_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        fields: list[tuple[str, str]] = [
            ("meal_type", meal_type),
            ("mealSource", meal_source),
            ("mealComplexity", meal_complexity),
        ]
        if restaurant_name:
            fields.append(("restaurantName", restaurant_name))
        if hotpot_broth_id:
            fields.append(("hotpotBrothId", hotpot_broth_id))
        if hotpot_item_ids:
            for item_id in hotpot_item_ids:
                fields.append(("hotpotItemIds", item_id))
        if composite_item_ids:
            for item_id in composite_item_ids:
                fields.append(("compositeItemIds", item_id))

        with image_path.open("rb") as f:
            files = {"file": (image_path.name, f, "image/jpeg")}
            r = self.session.post(
                f"{self.base}/diet/logs/analyze",
                headers={"Authorization": f"Bearer {self.token}"},
                data=fields,
                files=files,
                timeout=300,
            )
        r.raise_for_status()
        data = r.json().get("data", r.json())
        return data if isinstance(data, dict) else {}

    def get_log(self, log_id: str) -> dict[str, Any]:
        r = self.session.get(
            f"{self.base}/diet/logs/{log_id}",
            headers=self._headers(),
            timeout=30,
        )
        return self._unwrap(r)

    def submit_for_review(self, log_id: str) -> dict[str, Any]:
        r = self.session.put(
            f"{self.base}/diet/logs/{log_id}/submit-for-review",
            headers=self._headers(),
            timeout=30,
        )
        return self._unwrap(r)

    def export_preview(self) -> list[dict[str, Any]]:
        r = self.session.get(
            f"{self.base}/admin/rbl/export/preview",
            headers=self._headers(),
            timeout=60,
        )
        data = self._unwrap(r)
        return data if isinstance(data, list) else []

    def get_log_snapshot(self, log_id: str) -> dict[str, Any]:
        r = self.session.get(
            f"{self.base}/admin/rbl/logs/{log_id}",
            headers=self._headers(),
            timeout=30,
        )
        return self._unwrap(r)

    def export_csv_bytes(self) -> bytes:
        r = self.session.get(
            f"{self.base}/admin/rbl/export",
            params={"cvOnly": "true"},
            headers=self._headers(),
            timeout=120,
        )
        r.raise_for_status()
        return r.content

    def search_foods(self, q: str) -> list[dict[str, Any]]:
        r = self.session.get(
            f"{self.base}/foods/search",
            params={"q": q},
            headers=self._headers(),
            timeout=30,
        )
        data = self._unwrap(r)
        return data if isinstance(data, list) else []

    def assign_client(self, client_id: str) -> None:
        r = self.session.post(
            f"{self.base}/workspace/clients/{client_id}/assign",
            headers=self._headers(),
            timeout=30,
        )
        if r.status_code == 400 and "already assigned" in r.text.lower():
            return
        r.raise_for_status()

    def review_log(
        self,
        log_id: str,
        *,
        action: str = "ADJUST_MACROS",
        calories: float | None = None,
        protein: float | None = None,
        carb: float | None = None,
        fat: float | None = None,
        note: str = "research seed auto-label",
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"action": action, "note": note}
        if action == "ADJUST_MACROS":
            body.update(
                {
                    "adjustedCalories": calories,
                    "adjustedProtein": protein,
                    "adjustedCarb": carb,
                    "adjustedFat": fat,
                }
            )
        r = self.session.put(
            f"{self.base}/workspace/diet-logs/{log_id}/review",
            headers={**self._headers(), "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        r.raise_for_status()
        data = r.json().get("data", r.json())
        return data if isinstance(data, dict) else {}

    def blind_estimate(
        self,
        log_id: str,
        *,
        calories: float,
        protein: float,
        carb: float,
        fat: float,
    ) -> dict[str, Any]:
        r = self.session.put(
            f"{self.base}/workspace/diet-logs/{log_id}/blind-estimate",
            headers={**self._headers(), "Content-Type": "application/json"},
            json={
                "calories": calories,
                "protein": protein,
                "carb": carb,
                "fat": fat,
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json().get("data", r.json())
        return data if isinstance(data, dict) else {}

    def verify_pt(self, user_id: str, *, approved: bool = True, pt_type: str = "FREELANCE") -> None:
        r = self.session.put(
            f"{self.base}/admin/pts/{user_id}/verify",
            headers={**self._headers(), "Content-Type": "application/json"},
            json={"approved": approved, "isVerified": approved, "ptType": pt_type},
            timeout=30,
        )
        if r.status_code == 404:
            return
        r.raise_for_status()


def macro_val(macros: dict[str, Any] | None, key: str) -> float | None:
    if not macros:
        return None
    val = macros.get(key)
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
