from typing import Optional, List

from server_py.services.ccr.storage import CcrStorage


class CcrService:
    def __init__(self, storage: CcrStorage):
        self.storage = storage

    # ── Customer Master ─────────────────────────────────────────

    def get_all_customers(self) -> List[dict]:
        return self.storage.get_all_customers()

    def get_code_mappings_for_chain(self, customer_chain: str) -> List[dict]:
        return self.storage.get_code_mappings_for_chain(customer_chain)

    # ── CIC Mapping ─────────────────────────────────────────────

    def get_cic_mappings(self, cbu_code: Optional[str] = None, customer_chain: Optional[str] = None) -> List[dict]:
        return self.storage.get_cic_mappings(cbu_code=cbu_code, customer_chain=customer_chain)

    def upsert_cic_mappings(self, mappings: List[dict]) -> List[dict]:
        return self.storage.upsert_cic_mappings(mappings)

    # ── Ruleset ─────────────────────────────────────────────────

    def get_ruleset(self) -> List[dict]:
        return self.storage.get_all_ruleset()

    # ── Line Items ──────────────────────────────────────────────

    def get_line_items(
        self,
        cse_id: Optional[str] = None,
        ccr_status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        return self.storage.get_line_items(cse_id=cse_id, ccr_status=ccr_status, limit=limit, offset=offset)

    def get_line_item_by_id(self, item_id: str) -> Optional[dict]:
        return self.storage.get_line_item_by_id(item_id)

    def update_line_item_status(self, item_id: str, data: dict) -> Optional[dict]:
        return self.storage.update_line_item_status(item_id, data)

    def append_audit_log(self, item_id: str, data: dict) -> dict:
        return self.storage.append_audit_log(item_id, data)

    # ── Trigger Engine ──────────────────────────────────────────

    def evaluate_triggers(self, network_entries: List[dict]) -> dict:
        """Evaluate and update CCR trigger stages from current network entry statuses."""
        return self.storage.evaluate_triggers(network_entries)

    # ── Seed ────────────────────────────────────────────────────

    def seed_all(
        self,
        customers: List[dict],
        code_mappings: List[dict],
        cic_mappings: List[dict],
        ruleset: List[dict],
        line_items: List[dict],
    ) -> None:
        self.storage.seed_customers(customers)
        self.storage.seed_code_mappings(code_mappings)
        self.storage.seed_cic_mappings(cic_mappings)
        self.storage.seed_ruleset(ruleset)
        self.storage.seed_line_items(line_items)
