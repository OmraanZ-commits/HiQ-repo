import uuid
from datetime import date

from sqlalchemy.exc import IntegrityError

from server_py.db import DepotStockModel, SessionLocal


def _stock_to_dict(row: DepotStockModel) -> dict:
    return {
        "id": str(row.id),
        "cbuCode": row.cbu_code,
        "basepackCode": row.basepack_code,
        "depotCode": row.depot_code,
        "quantityCases": row.quantity_cases,
        "snapshotDate": row.snapshot_date.isoformat(),
    }


class TransitionRiskStorage:
    def seed_depot_stock(self) -> None:
        """Insert demo evidence only when the logical row is absent; never update it."""
        seeds = [
            ("CBU-50007890", "BP-700", "DLGH", 125.0),
            # ERKH is a valid master depot, but is not mapped to CBU-50007890.
            ("CBU-50007890", "BP-700", "ERKH", 84.0),
            # Clearance-ready single-depot activation candidate.
            ("CBU-99149003", "BP-TR-READY-03", "DLGH", 96.0),
            # Sourcing sample has mapped DLGH/MMDH depots plus positive stock
            # at valid, currently unmapped ERKH.
            ("CBU-99149002", "BP-TR-SOURCE", "DLGH", 46.0),
            ("CBU-99149002", "BP-TR-SOURCE", "MMDH", 39.0),
            ("CBU-99149002", "BP-TR-SOURCE", "ERKH", 88.0),
        ]
        db = SessionLocal()
        try:
            for cbu_code, basepack_code, depot_code, quantity in seeds:
                exists = db.query(DepotStockModel).filter(
                    DepotStockModel.cbu_code == cbu_code,
                    DepotStockModel.basepack_code == basepack_code,
                    DepotStockModel.depot_code == depot_code,
                ).first()
                if exists:
                    continue
                db.add(DepotStockModel(
                    id=uuid.uuid4(),
                    cbu_code=cbu_code,
                    basepack_code=basepack_code,
                    depot_code=depot_code,
                    quantity_cases=quantity,
                    snapshot_date=date.today(),
                ))
                try:
                    db.commit()
                except IntegrityError:
                    # Another startup worker inserted this exact logical row.
                    db.rollback()
        finally:
            db.close()

    def get_depot_stock(self) -> list[dict]:
        db = SessionLocal()
        try:
            rows = db.query(DepotStockModel).order_by(
                DepotStockModel.basepack_code,
                DepotStockModel.cbu_code,
                DepotStockModel.depot_code,
            ).all()
            return [_stock_to_dict(row) for row in rows]
        finally:
            db.close()