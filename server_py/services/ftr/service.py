import logging
from typing import Callable, Optional
from server_py.services.ftr.storage import FtrStorage

logger = logging.getLogger(__name__)


def _normalize_cbu(code: str) -> str:
    code = code.strip()
    if code and not code.upper().startswith("CBU-"):
        return f"CBU-{code}"
    return code


class FtrService:
    def __init__(self, storage: FtrStorage):
        self.storage = storage
        self._list_service = None
        self._transition_fn: Optional[Callable] = None

    def set_dependencies(self, list_service=None, transition_fn: Optional[Callable] = None):
        self._list_service = list_service
        self._transition_fn = transition_fn

    def upload_ftr_links(
        self,
        entries: list[dict],
        uploaded_by: Optional[str],
        source_file: Optional[str],
    ) -> dict:
        if not entries:
            return {"added": 0, "triggered": 0, "links": []}

        enriched = [
            {**e, "cbu_code": _normalize_cbu(e.get("cbu_code") or ""), "uploaded_by": uploaded_by, "source_file": source_file}
            for e in entries
        ]
        links = self.storage.add_ftr_links(enriched)

        triggered = 0
        triggered_entries = []
        if self._list_service and self._transition_fn:
            seen: set[str] = set()
            all_entries = self._list_service.get_all()
            entries_by_cbu = {e.get("cbuCode"): e for e in all_entries if e.get("cbuCode")}

            for entry in entries:
                cbu_code = _normalize_cbu(entry.get("cbu_code") or "")
                if not cbu_code or cbu_code in seen:
                    continue
                seen.add(cbu_code)

                match = entries_by_cbu.get(cbu_code)
                if match and match.get("networkStatus") == "Production Started":
                    try:
                        self._transition_fn(
                            entry_id=match["id"],
                            to_status="FTR Approved",
                            triggered_by=uploaded_by or "FTR Upload",
                        )
                        triggered += 1
                        triggered_entries.append(cbu_code)
                    except Exception as e:
                        logger.error("FTR transition failed for %s: %s", cbu_code, e)

        return {
            "added": len(links),
            "triggered": triggered,
            "triggeredEntries": triggered_entries,
            "links": links,
        }

    def get_ftr_links(self, cbu_code: str) -> list[dict]:
        return self.storage.get_ftr_links_for_cbu(cbu_code)

    def delete_ftr_link(self, link_id: str) -> bool:
        return self.storage.delete_ftr_link(link_id)

    def add_ftr_image(self, data: dict) -> dict:
        result = self.storage.add_ftr_image(data)
        self._try_trigger_ftr_approved(data.get("cbu_code", ""), data.get("uploaded_by"))
        return result

    def _try_trigger_ftr_approved(self, cbu_code: str, triggered_by: Optional[str]) -> None:
        cbu_code = _normalize_cbu(cbu_code)
        if not cbu_code or not self._list_service or not self._transition_fn:
            return
        try:
            all_entries = self._list_service.get_all()
            for entry in all_entries:
                if entry.get("cbuCode") == cbu_code and entry.get("networkStatus") == "Production Started":
                    self._transition_fn(
                        entry_id=entry["id"],
                        to_status="FTR Approved",
                        triggered_by=triggered_by or "FTR Image Upload",
                    )
                    break
        except Exception as e:
            logger.error("FTR image trigger failed for %s: %s", cbu_code, e)

    def get_ftr_images(self, cbu_code: str) -> list[dict]:
        return self.storage.get_ftr_images_for_cbu(cbu_code)

    def delete_ftr_image(self, image_id: str) -> bool:
        return self.storage.delete_ftr_image(image_id)
