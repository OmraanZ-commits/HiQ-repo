import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import (
    SessionLocal,
    ChannelsMasterModel,
    ClustersMasterModel,
    DepotsMasterModel,
    NetworkChangeTypeMasterModel,
    RefDataAuditLogModel,
    UserModel,
)


def _channel_row_to_api(row: ChannelsMasterModel) -> dict:
    return {
        "id": str(row.id),
        "code": row.code,
        "name": row.name,
        "type": row.type,
        "parentCode": row.parent_code,
        "isActive": row.is_active,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _cluster_row_to_api(row: ClustersMasterModel) -> dict:
    return {
        "id": str(row.id),
        "name": row.name,
        "region": row.region,
        "depotCount": row.depot_count,
        "stateIds": row.state_ids or [],
        "pinX": row.pin_x,
        "pinY": row.pin_y,
        "isActive": row.is_active,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _depot_row_to_api(row: DepotsMasterModel) -> dict:
    return {
        "id": str(row.id),
        "code": row.code,
        "name": row.name,
        "clusterId": row.cluster_id,
        "isActive": row.is_active,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _network_change_type_row_to_api(row: NetworkChangeTypeMasterModel) -> dict:
    return {
        "id": str(row.id),
        "code": row.code,
        "name": row.name,
        "category": row.category,
        "isActive": row.is_active,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _audit_row_to_api(row: RefDataAuditLogModel) -> dict:
    return {
        "id": str(row.id),
        "entityType": row.entity_type,
        "entityId": row.entity_id,
        "entityCode": row.entity_code,
        "action": row.action,
        "changedByName": row.changed_by_name,
        "changedByUserId": row.changed_by_user_id,
        "oldStatus": row.old_status,
        "newStatus": row.new_status,
        "attachmentFilename": row.attachment_filename,
        "attachmentUrl": row.attachment_url,
        "notes": row.notes,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


class ReferenceDataStorage:
    """Persistence layer for Channel, Cluster & Depot master tables."""

    # ── Users (read-only lookup) ─────────────────────────────────

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not row:
                return None
            return {"id": str(row.id), "name": row.name, "role": row.role, "isActive": row.is_active}
        finally:
            db.close()

    # ── Audit Log ────────────────────────────────────────────────

    def create_audit_entry(
        self,
        entity_type: str,
        entity_id: str,
        entity_code: Optional[str],
        action: str,
        changed_by_name: str,
        changed_by_user_id: Optional[str],
        old_status: Optional[str],
        new_status: Optional[str],
        attachment_filename: Optional[str],
        attachment_url: Optional[str],
        notes: Optional[str],
    ) -> dict:
        db = SessionLocal()
        try:
            entry = RefDataAuditLogModel(
                id=uuid.uuid4(),
                entity_type=entity_type,
                entity_id=entity_id,
                entity_code=entity_code,
                action=action,
                changed_by_name=changed_by_name,
                changed_by_user_id=changed_by_user_id,
                old_status=old_status,
                new_status=new_status,
                attachment_filename=attachment_filename,
                attachment_url=attachment_url,
                notes=notes,
                created_at=datetime.now(timezone.utc),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return _audit_row_to_api(entry)
        finally:
            db.close()

    def get_audit_log(self, entity_type: Optional[str] = None, entity_id: Optional[str] = None, limit: int = 200) -> List[dict]:
        db = SessionLocal()
        try:
            q = db.query(RefDataAuditLogModel)
            if entity_type:
                q = q.filter(RefDataAuditLogModel.entity_type == entity_type)
            if entity_id:
                q = q.filter(RefDataAuditLogModel.entity_id == entity_id)
            rows = q.order_by(RefDataAuditLogModel.created_at.desc()).limit(limit).all()
            return [_audit_row_to_api(r) for r in rows]
        finally:
            db.close()

    # ── Channels ────────────────────────────────────────────────

    def get_all_channels(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(ChannelsMasterModel).order_by(ChannelsMasterModel.code).all()
            return [_channel_row_to_api(r) for r in rows]
        finally:
            db.close()

    def get_channel_by_id(self, channel_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ChannelsMasterModel).filter(ChannelsMasterModel.id == channel_id).first()
            return _channel_row_to_api(row) if row else None
        finally:
            db.close()

    def create_channel(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            entry = ChannelsMasterModel(
                id=uuid.uuid4(),
                code=data["code"],
                name=data.get("name"),
                type=data["type"],
                parent_code=data.get("parentCode"),
                is_active=data.get("isActive", True),
                created_at=datetime.now(timezone.utc),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return _channel_row_to_api(entry)
        finally:
            db.close()

    def update_channel(self, channel_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ChannelsMasterModel).filter(ChannelsMasterModel.id == channel_id).first()
            if not row:
                return None
            field_map = {"code": "code", "name": "name", "type": "type", "parentCode": "parent_code", "isActive": "is_active"}
            for api_key, db_col in field_map.items():
                if api_key in data and data[api_key] is not None:
                    setattr(row, db_col, data[api_key])
            db.commit()
            db.refresh(row)
            return _channel_row_to_api(row)
        finally:
            db.close()

    def update_channel_status(self, channel_id: str, new_is_active: bool) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ChannelsMasterModel).filter(ChannelsMasterModel.id == channel_id).first()
            if not row:
                return None
            row.is_active = new_is_active
            db.commit()
            db.refresh(row)
            return _channel_row_to_api(row)
        finally:
            db.close()

    def delete_channel(self, channel_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(ChannelsMasterModel).filter(ChannelsMasterModel.id == channel_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()

    def seed_channels(self, seeds: List[dict]):
        db = SessionLocal()
        try:
            if db.query(ChannelsMasterModel).count() > 0:
                return
            for s in seeds:
                db.add(ChannelsMasterModel(
                    id=uuid.uuid4(),
                    code=s["code"],
                    name=s.get("name"),
                    type=s["type"],
                    parent_code=s.get("parentCode"),
                    is_active=s.get("isActive", True),
                    created_at=datetime.now(timezone.utc),
                ))
            db.commit()
        finally:
            db.close()

    # ── Clusters ────────────────────────────────────────────────

    def get_all_clusters(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(ClustersMasterModel).order_by(ClustersMasterModel.name).all()
            return [_cluster_row_to_api(r) for r in rows]
        finally:
            db.close()

    def get_cluster_by_id(self, cluster_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ClustersMasterModel).filter(ClustersMasterModel.id == cluster_id).first()
            return _cluster_row_to_api(row) if row else None
        finally:
            db.close()

    def create_cluster(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            entry = ClustersMasterModel(
                id=uuid.uuid4(),
                name=data["name"],
                region=data["region"],
                depot_count=data.get("depotCount"),
                state_ids=data.get("stateIds", []),
                pin_x=data.get("pinX"),
                pin_y=data.get("pinY"),
                is_active=data.get("isActive", True),
                created_at=datetime.now(timezone.utc),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return _cluster_row_to_api(entry)
        finally:
            db.close()

    def update_cluster(self, cluster_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ClustersMasterModel).filter(ClustersMasterModel.id == cluster_id).first()
            if not row:
                return None
            field_map = {
                "name": "name", "region": "region", "depotCount": "depot_count",
                "stateIds": "state_ids", "pinX": "pin_x", "pinY": "pin_y", "isActive": "is_active",
            }
            for api_key, db_col in field_map.items():
                if api_key in data and data[api_key] is not None:
                    setattr(row, db_col, data[api_key])
            db.commit()
            db.refresh(row)
            return _cluster_row_to_api(row)
        finally:
            db.close()

    def update_cluster_status(self, cluster_id: str, new_is_active: bool) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ClustersMasterModel).filter(ClustersMasterModel.id == cluster_id).first()
            if not row:
                return None
            row.is_active = new_is_active
            db.commit()
            db.refresh(row)
            return _cluster_row_to_api(row)
        finally:
            db.close()

    def delete_cluster(self, cluster_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(ClustersMasterModel).filter(ClustersMasterModel.id == cluster_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()

    def seed_clusters(self, seeds: List[dict]):
        db = SessionLocal()
        try:
            if db.query(ClustersMasterModel).count() > 0:
                return
            for s in seeds:
                db.add(ClustersMasterModel(
                    id=uuid.uuid4(),
                    name=s["name"],
                    region=s["region"],
                    depot_count=s.get("depotCount"),
                    state_ids=s.get("stateIds", []),
                    pin_x=s.get("pinX"),
                    pin_y=s.get("pinY"),
                    is_active=s.get("isActive", True),
                    created_at=datetime.now(timezone.utc),
                ))
            db.commit()
        finally:
            db.close()

    # ── Depots ──────────────────────────────────────────────────

    def get_all_depots(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(DepotsMasterModel).order_by(DepotsMasterModel.code).all()
            return [_depot_row_to_api(r) for r in rows]
        finally:
            db.close()

    def get_depot_by_id(self, depot_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(DepotsMasterModel).filter(DepotsMasterModel.id == depot_id).first()
            return _depot_row_to_api(row) if row else None
        finally:
            db.close()

    def create_depot(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            entry = DepotsMasterModel(
                id=uuid.uuid4(),
                code=data["code"],
                name=data.get("name"),
                cluster_id=data.get("clusterId"),
                is_active=data.get("isActive", True),
                created_at=datetime.now(timezone.utc),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return _depot_row_to_api(entry)
        finally:
            db.close()

    def update_depot(self, depot_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(DepotsMasterModel).filter(DepotsMasterModel.id == depot_id).first()
            if not row:
                return None
            field_map = {"code": "code", "name": "name", "clusterId": "cluster_id", "isActive": "is_active"}
            for api_key, db_col in field_map.items():
                if api_key in data and data[api_key] is not None:
                    setattr(row, db_col, data[api_key])
            db.commit()
            db.refresh(row)
            return _depot_row_to_api(row)
        finally:
            db.close()

    def update_depot_status(self, depot_id: str, new_is_active: bool) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(DepotsMasterModel).filter(DepotsMasterModel.id == depot_id).first()
            if not row:
                return None
            row.is_active = new_is_active
            db.commit()
            db.refresh(row)
            return _depot_row_to_api(row)
        finally:
            db.close()

    def delete_depot(self, depot_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(DepotsMasterModel).filter(DepotsMasterModel.id == depot_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()

    def seed_depots(self, seeds: List[dict]):
        db = SessionLocal()
        try:
            if db.query(DepotsMasterModel).count() > 0:
                return
            for s in seeds:
                db.add(DepotsMasterModel(
                    id=uuid.uuid4(),
                    code=s["code"],
                    name=s.get("name"),
                    cluster_id=s.get("clusterId"),
                    is_active=s.get("isActive", True),
                    created_at=datetime.now(timezone.utc),
                ))
            db.commit()
        finally:
            db.close()

    # ── Network Change Types ────────────────────────────────────

    def get_all_network_change_types(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(NetworkChangeTypeMasterModel).order_by(NetworkChangeTypeMasterModel.code).all()
            return [_network_change_type_row_to_api(r) for r in rows]
        finally:
            db.close()

    def get_network_change_type_by_id(self, type_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(NetworkChangeTypeMasterModel).filter(NetworkChangeTypeMasterModel.id == type_id).first()
            return _network_change_type_row_to_api(row) if row else None
        finally:
            db.close()

    def create_network_change_type(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            entry = NetworkChangeTypeMasterModel(
                id=uuid.uuid4(),
                code=data["code"],
                name=data["name"],
                category=data.get("category"),
                is_active=data.get("isActive", True),
                created_at=datetime.now(timezone.utc),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return _network_change_type_row_to_api(entry)
        finally:
            db.close()

    def update_network_change_type(self, type_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(NetworkChangeTypeMasterModel).filter(NetworkChangeTypeMasterModel.id == type_id).first()
            if not row:
                return None
            field_map = {"code": "code", "name": "name", "category": "category", "isActive": "is_active"}
            for api_key, db_col in field_map.items():
                if api_key in data and data[api_key] is not None:
                    setattr(row, db_col, data[api_key])
            db.commit()
            db.refresh(row)
            return _network_change_type_row_to_api(row)
        finally:
            db.close()

    def update_network_change_type_status(self, type_id: str, new_is_active: bool) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(NetworkChangeTypeMasterModel).filter(NetworkChangeTypeMasterModel.id == type_id).first()
            if not row:
                return None
            row.is_active = new_is_active
            db.commit()
            db.refresh(row)
            return _network_change_type_row_to_api(row)
        finally:
            db.close()

    def delete_network_change_type(self, type_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(NetworkChangeTypeMasterModel).filter(NetworkChangeTypeMasterModel.id == type_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()

    def seed_network_change_types(self, seeds: List[dict]):
        db = SessionLocal()
        try:
            if db.query(NetworkChangeTypeMasterModel).count() > 0:
                return
            for s in seeds:
                db.add(NetworkChangeTypeMasterModel(
                    id=uuid.uuid4(),
                    code=s["code"],
                    name=s["name"],
                    category=s.get("category"),
                    is_active=s.get("isActive", True),
                    created_at=datetime.now(timezone.utc),
                ))
            db.commit()
        finally:
            db.close()
