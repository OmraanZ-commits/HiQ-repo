import uuid
from datetime import datetime, timezone
from typing import Optional

from server_py.db import SessionLocal, FtrLinkModel, FtrImageModel


class FtrStorage:
    def add_ftr_links(self, entries: list[dict]) -> list[dict]:
        db = SessionLocal()
        try:
            results = []
            for entry in entries:
                link = FtrLinkModel(
                    id=uuid.uuid4(),
                    cbu_code=entry["cbu_code"],
                    ftr_link=entry["ftr_link"],
                    description=entry.get("description"),
                    uploaded_by=entry.get("uploaded_by"),
                    uploaded_at=datetime.now(timezone.utc),
                    source_file=entry.get("source_file"),
                )
                db.add(link)
                results.append(self._link_to_dict(link))
            db.commit()
            return results
        finally:
            db.close()

    def get_ftr_links_for_cbu(self, cbu_code: str) -> list[dict]:
        db = SessionLocal()
        try:
            rows = (
                db.query(FtrLinkModel)
                .filter(FtrLinkModel.cbu_code == cbu_code)
                .order_by(FtrLinkModel.uploaded_at.desc())
                .all()
            )
            return [self._link_to_dict(r) for r in rows]
        finally:
            db.close()

    def delete_ftr_link(self, link_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(FtrLinkModel).filter(FtrLinkModel.id == link_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()

    def has_ftr_links(self, cbu_code: str) -> bool:
        db = SessionLocal()
        try:
            return (
                db.query(FtrLinkModel)
                .filter(FtrLinkModel.cbu_code == cbu_code)
                .count()
                > 0
            )
        finally:
            db.close()

    def add_ftr_image(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            img = FtrImageModel(
                id=uuid.uuid4(),
                cbu_code=data["cbu_code"],
                image_url=data.get("image_url"),
                image_data=data.get("image_data"),
                image_filename=data.get("image_filename"),
                caption=data.get("caption"),
                uploaded_by=data.get("uploaded_by"),
                uploaded_at=datetime.now(timezone.utc),
            )
            db.add(img)
            db.commit()
            return self._image_to_dict(img)
        finally:
            db.close()

    def get_ftr_images_for_cbu(self, cbu_code: str) -> list[dict]:
        db = SessionLocal()
        try:
            rows = (
                db.query(FtrImageModel)
                .filter(FtrImageModel.cbu_code == cbu_code)
                .order_by(FtrImageModel.uploaded_at.asc())
                .all()
            )
            return [self._image_to_dict(r) for r in rows]
        finally:
            db.close()

    def delete_ftr_image(self, image_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(FtrImageModel).filter(FtrImageModel.id == image_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()

    def _link_to_dict(self, row: FtrLinkModel) -> dict:
        return {
            "id": str(row.id),
            "cbuCode": row.cbu_code,
            "ftrLink": row.ftr_link,
            "description": row.description,
            "uploadedBy": row.uploaded_by,
            "uploadedAt": row.uploaded_at.isoformat() if row.uploaded_at else None,
            "sourceFile": row.source_file,
        }

    def _image_to_dict(self, row: FtrImageModel) -> dict:
        return {
            "id": str(row.id),
            "cbuCode": row.cbu_code,
            "imageUrl": row.image_url,
            "imageData": row.image_data,
            "imageFilename": row.image_filename,
            "caption": row.caption,
            "uploadedBy": row.uploaded_by,
            "uploadedAt": row.uploaded_at.isoformat() if row.uploaded_at else None,
        }
