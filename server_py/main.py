import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server_py.db import create_tables, run_migrations
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

from server_py.services.users.storage import UsersStorage
from server_py.services.users.service import UsersService
from server_py.services.users.router import router as users_router, set_service as set_users_service

from server_py.services.service_requests.storage import ServiceRequestStorage
from server_py.services.service_requests.service import ServiceRequestService
from server_py.services.service_requests.router import router as sr_router, set_service as set_sr_service

from server_py.services.basepack_status.storage import BasepakStatusStorage
from server_py.services.basepack_status.service import BasepakStatusService
from server_py.services.basepack_status.router import router as bp_status_router, set_service as set_bp_status_service

from server_py.services.mstn_doh.storage import MstnDohStorage
from server_py.services.mstn_doh.service import MstnDohService
from server_py.services.mstn_doh.router import router as mstn_doh_router, set_service as set_mstn_doh_service

from server_py.saga.router import router as saga_router, init_saga_services
from server_py.saga.transition_saga import build_transition_saga

from server_py.services.ftr.storage import FtrStorage
from server_py.services.ftr.service import FtrService
from server_py.services.ftr.router import router as ftr_router, set_service as set_ftr_service

from server_py.services.paid_bible.storage import PaidBibleStorage
from server_py.services.paid_bible.service import PaidBibleService
from server_py.services.paid_bible.router import (
    router as paid_bible_router,
    set_service as set_paid_bible_service,
)

from server_py.seed_reference_data import CHANNEL_SEEDS, CLUSTER_SEEDS, DEPOT_SEEDS, NETWORK_CHANGE_TYPE_SEEDS, CLUSTER_REGION_STATE_SEEDS
from server_py.seed_users import USER_SEEDS
from server_py.seed_service_requests import SR_SEEDS

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
app.include_router(sr_router, prefix="/api/service-requests", tags=["Service Requests"])
app.include_router(bp_status_router, prefix="/api/basepack-status", tags=["Basepack Status"])
app.include_router(mstn_doh_router, prefix="/api/mstn-doh", tags=["MSTN & DOH"])
app.include_router(paid_bible_router, prefix="/api/paid-bible", tags=["Paid Bible"])
app.include_router(ftr_router, prefix="/api/ftr", tags=["FTR"])


@app.on_event("startup")
async def startup():
    create_tables()
    run_migrations()

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

    ref_storage = ReferenceDataStorage()
    ref_service = ReferenceDataService(ref_storage)
    set_ref_service(ref_service)
    ref_service.seed_all(CHANNEL_SEEDS, CLUSTER_SEEDS, DEPOT_SEEDS, NETWORK_CHANGE_TYPE_SEEDS, CLUSTER_REGION_STATE_SEEDS)

    users_storage = UsersStorage()
    users_service = UsersService(users_storage)
    set_users_service(users_service)
    users_service.seed_users(USER_SEEDS)

    sr_storage = ServiceRequestStorage()
    sr_service = ServiceRequestService(sr_storage)
    set_sr_service(sr_service)

    bp_status_storage = BasepakStatusStorage()
    bp_status_service = BasepakStatusService(bp_status_storage)
    set_bp_status_service(bp_status_service)

    mstn_doh_storage = MstnDohStorage()
    mstn_doh_service = MstnDohService(mstn_doh_storage)
    mstn_doh_service.set_list_storage(list_storage)
    set_mstn_doh_service(mstn_doh_service)

    paid_bible_storage = PaidBibleStorage()
    paid_bible_service = PaidBibleService(paid_bible_storage, sr_service=sr_service)
    set_paid_bible_service(paid_bible_service)

    sr_service.seed_requests(SR_SEEDS)

    state_service = get_state_service()
    lifecycle_service = get_lifecycle_service()

    if state_service and lifecycle_service:
        init_saga_services(
            state_service,
            list_service,
            lifecycle_service,
            ref_service,
            sr_service=sr_service,
            bp_status_service=bp_status_service,
            paid_bible_service=paid_bible_service,
        )

    ftr_storage = FtrStorage()
    ftr_service = FtrService(ftr_storage)

    def _trigger_ftr_transition(entry_id: str, to_status: str, triggered_by: str | None = None):
        if state_service and lifecycle_service:
            saga = build_transition_saga(
                entry_id=entry_id,
                to_status=to_status,
                triggered_by=triggered_by,
                metadata=None,
                state_service=state_service,
                list_service=list_service,
                lifecycle_service=lifecycle_service,
            )
            saga.execute(context={})

    ftr_service.set_dependencies(
        list_service=list_service,
        transition_fn=_trigger_ftr_transition,
    )
    set_ftr_service(ftr_service)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "services": [
            "list-master",
            "state-management",
            "lifecycle",
            "reference-data",
            "saga",
            "users",
            "service-requests",
            "basepack-status",
            "mstn-doh",
            "paid-bible",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
