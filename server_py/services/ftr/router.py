import base64

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List

from server_py.services.ftr.service import FtrService

router = APIRouter()
_service: FtrService | None = None


def set_service(service: FtrService):
    global _service
    _service = service


class FtrLinkEntry(BaseModel):
    cbu_code: str
    ftr_link: str
    description: Optional[str] = None


class UploadFtrLinksRequest(BaseModel):
    entries: List[FtrLinkEntry]
    uploadedBy: Optional[str] = None
    sourceFile: Optional[str] = None


class AddFtrImageRequest(BaseModel):
    cbuCode: str
    imageUrl: str
    caption: Optional[str] = None
    uploadedBy: Optional[str] = None


@router.post("/links/upload")
async def upload_ftr_links(req: UploadFtrLinksRequest):
    if not _service:
        raise HTTPException(status_code=503, detail="FTR service not initialized")
    entries = [e.model_dump() for e in req.entries]
    return _service.upload_ftr_links(entries, req.uploadedBy, req.sourceFile)


@router.get("/links/{cbu_code}")
async def get_ftr_links(cbu_code: str):
    if not _service:
        raise HTTPException(status_code=503, detail="FTR service not initialized")
    return _service.get_ftr_links(cbu_code)


@router.delete("/links/{link_id}")
async def delete_ftr_link(link_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="FTR service not initialized")
    ok = _service.delete_ftr_link(link_id)
    if not ok:
        raise HTTPException(status_code=404, detail="FTR link not found")
    return {"ok": True}


@router.post("/images")
async def add_ftr_image(req: AddFtrImageRequest):
    if not _service:
        raise HTTPException(status_code=503, detail="FTR service not initialized")
    return _service.add_ftr_image(
        {
            "cbu_code": req.cbuCode,
            "image_url": req.imageUrl,
            "caption": req.caption,
            "uploaded_by": req.uploadedBy,
        }
    )


@router.get("/images/{cbu_code}")
async def get_ftr_images(cbu_code: str):
    if not _service:
        raise HTTPException(status_code=503, detail="FTR service not initialized")
    return _service.get_ftr_images(cbu_code)


@router.post("/images/upload-file")
async def upload_ftr_image_file(
    cbu_code: str = Form(...),
    caption: str = Form(None),
    uploaded_by: str = Form(None),
    file: UploadFile = File(...),
):
    if not _service:
        raise HTTPException(status_code=503, detail="FTR service not initialized")
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    image_data = f"data:{content_type};base64,{base64.b64encode(content).decode('utf-8')}"
    return _service.add_ftr_image({
        "cbu_code": cbu_code,
        "image_url": None,
        "image_data": image_data,
        "image_filename": file.filename,
        "caption": caption,
        "uploaded_by": uploaded_by,
    })


@router.delete("/images/{image_id}")
async def delete_ftr_image(image_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="FTR service not initialized")
    ok = _service.delete_ftr_image(image_id)
    if not ok:
        raise HTTPException(status_code=404, detail="FTR image not found")
    return {"ok": True}
