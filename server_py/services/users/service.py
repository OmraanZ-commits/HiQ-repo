from typing import Optional, List

from server_py.services.users.storage import UsersStorage


class UsersService:
    def __init__(self, storage: UsersStorage):
        self.storage = storage

    def get_all(self) -> List[dict]:
        return self.storage.get_all()

    def get_by_id(self, user_id: str) -> Optional[dict]:
        return self.storage.get_by_id(user_id)

    def create(self, data: dict) -> dict:
        return self.storage.create(data)

    def update(self, user_id: str, data: dict) -> Optional[dict]:
        return self.storage.update(user_id, data)

    def seed_users(self, seeds: List[dict]):
        self.storage.seed_users(seeds)
