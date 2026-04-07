import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server_py.db import create_tables
from server_py.seed_data import SEEDS
from server_py.services.list_master.storage import ListMasterStorage
from server_py.services.list_master.service import ListMasterService
from server_py.services.list_master.router import router as list_master_router, set_service as set_list_service
from server_py.services.state_management.router import (
    router as state_router,
    get_state_storage,
    set_list_storage,
    get_service as get_state_service,
)
from server_py.services.lifecycle.router import (
    router as lifecycle_router,
    set_list_storage as lifecycle_set_list_storage,
    get_service as get_lifecycle_service,
)
from server_py.services.reference_data.storage import ReferenceDataStorage
from server_py.services.reference_data.service import ReferenceDataService
from server_py.services.reference_data.router import (
    router as ref_data_router,
    set_service as set_ref_service,
)
from server_py.saga.router import router as saga_router, init_saga_services
from server_py.seed_reference_data import CHANNEL_SEEDS, CLUSTER_SEEDS, DEPOT_SEEDS, NETWORK_CHANGE_TYPE_SEEDS
from server_py.services.users.storage import UsersStorage
from server_py.services.users.service import UsersService
from server_py.services.users.router import router as users_router, set_service as set_users_service
from server_py.seed_users import USER_SEEDS

app = FastAPI(title="Unilever Network Visibility API", version="1.0.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(list_master_router, prefix="/api/list-master", tags=["List Master"])
app.include_router(list_master_router, prefix="/api/network-entries", tags=["Legacy"])
app.include_router(state_router, prefix="/api/state", tags=["State Management"])
app.include_router(lifecycle_router, prefix="/api/lifecycle", tags=["Lifecycle"])
app.include_router(ref_data_router, prefix="/api/reference-data", tags=["Reference Data"])
app.include_router(saga_router, prefix="/api/saga", tags=["Saga"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])


@app.on_event("startup")
async def startup():
    create_tables()

    list_storage = ListMasterStorage()
    list_service = ListMasterService(list_storage)
    set_list_service(list_service)

    list_storage.seed_entries(SEEDS)

    set_list_storage(list_storage)
    lifecycle_set_list_storage(list_storage)

    state_storage = get_state_storage()
    entries = list_storage.get_all()
    state_storage.seed_statuses(
        [{"id": e["id"], "status": e.get("networkStatus", "Draft")} for e in entries]
    )

    # Reference-data microservice
    ref_storage = ReferenceDataStorage()
    ref_service = ReferenceDataService(ref_storage)
    set_ref_service(ref_service)
    ref_service.seed_all(CHANNEL_SEEDS, CLUSTER_SEEDS, DEPOT_SEEDS, NETWORK_CHANGE_TYPE_SEEDS)

    users_storage = UsersStorage()
    users_service = UsersService(users_storage)
    set_users_service(users_service)
    users_service.seed_users(USER_SEEDS)

    state_service = get_state_service()
    lifecycle_service = get_lifecycle_service()

    if state_service and lifecycle_service:
        init_saga_services(state_service, list_service, lifecycle_service, ref_service)


@app.get("/api/health")
async def health():
    return {"status": "ok", "services": ["list-master", "state-management", "lifecycle", "reference-data", "saga", "users"]}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
