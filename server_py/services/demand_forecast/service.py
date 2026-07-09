from typing import List

from server_py.services.demand_forecast.storage import DemandForecastStorage


class DemandForecastService:
    def __init__(self, storage: DemandForecastStorage):
        self.storage = storage

    def get_by_basepack(self, basepack: str) -> List[dict]:
        return self.storage.get_by_basepack(basepack)

    def seed_if_empty(self, entries: List[dict]) -> int:
        if self.storage.has_any_data():
            return 0
        return self.storage.bulk_insert(entries)
