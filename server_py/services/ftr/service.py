from typing import Callable, Optional
from server_py.services.ftr.storage import FtrStorage


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
            {**e, "uploaded_by": uploaded_by, "source_file": source_file}
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
                cbu_code = (entry.get("cbu_code") or "").strip()
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
                    except Exception:
                        pass

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
        return self.storage.add_ftr_image(data)

    def get_ftr_images(self, cbu_code: str) -> list[dict]:
        return self.storage.get_ftr_images_for_cbu(cbu_code)

    def delete_ftr_image(self, image_id: str) -> bool:
        return self.storage.delete_ftr_image(image_id)
