from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from server_py.services.users.service import UsersService

router = APIRouter()
_service: UsersService | None = None


def set_service(service: UsersService):
    global _service
    _service = service


class CreateUserBody(BaseModel):
    name: str
    email: str
    role: str
    businessGroup: Optional[str] = None
    isBgLead: bool = False
    isActive: bool = True


class UpdateUserBody(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    businessGroup: Optional[str] = None
    isBgLead: Optional[bool] = None
    isActive: Optional[bool] = None


@router.get("")
@router.get("/")
async def get_all_users():
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return _service.get_all()


@router.get("/{user_id}")
async def get_user(user_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    user = _service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail={"service": "users", "message": "User not found"})
    return user


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create_user(body: CreateUserBody):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return _service.create(body.model_dump())


@router.patch("/{user_id}")
async def update_user(user_id: str, body: UpdateUserBody):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    user = _service.update(user_id, body.model_dump(exclude_none=True))
    if not user:
        raise HTTPException(status_code=404, detail={"service": "users", "message": "User not found"})
    return user
