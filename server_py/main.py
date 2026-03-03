import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server_py.models import InsertNetworkEntry
from server_py.db import create_tables
from server_py.services.list_master.router import router as list_master_router, get_storage as get_list_storage
from server_py.services.state_management.router import (
    router as state_router,
    get_state_storage,
    set_list_storage,
)

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

SEEDS = [
    InsertNetworkEntry(
        cbuCreatedDate="2026-01-15",
        networkChangeDate="2026-02-01",
        annexureNumber="ANN-2026-001",
        basepack="BP-100",
        basepackDescription="Dove Soap Bar 100g",
        bg="Beauty & Personal Care",
        profitCentre="PC-BPC-01",
        salesCategory="Skin Cleansing",
        smallC="SC-001",
        brand="Dove",
        format="Bar",
        cbuCode="CBU-50001234",
        materialDescription="Dove Beauty Bar Original 100g",
        typeOfNetwork="New Launch",
        copyCbu="CBU-50001200",
        year=2026,
        networkStatus="Active",
        startDate="2026-02-01",
        endDate="2026-12-31",
        caseConfig="48x1",
        ean="8901030729881",
        netWeight=100,
        grossWeight=115,
        length=85,
        width=55,
        height=30,
        itf="18901030729888",
        predecessorCode=None,
        successorCode="CBU-50001234",
        csdIndexNo="CSD-4421",
        pcAtChannelState="PC-2026-Q1-North",
        sourcingMatrixSection="Updated",
        assignedPerson="Rajesh Sharma",
        geography=["DELHI-GREATER DELHI", "PUNJAB-HARYANA-HILLS", "UTTAR PRADESH"],
        depot=["DLGH", "JPRH", "VABH"],
        channel=["GT", "MT", "MT Retail"],
    ),
    InsertNetworkEntry(
        cbuCreatedDate="2026-01-20",
        networkChangeDate=None,
        annexureNumber="ANN-2026-002",
        basepack="BP-200",
        basepackDescription="Surf Excel Matic Top Load 2kg",
        bg="Home Care",
        profitCentre="PC-HC-02",
        salesCategory="Fabric Cleaning",
        smallC="SC-002",
        brand="Surf Excel",
        format="Powder",
        cbuCode="CBU-50002345",
        materialDescription="Surf Excel Matic Top Load Detergent Powder 2kg",
        typeOfNetwork="Relaunch",
        copyCbu="CBU-50002300",
        year=2026,
        networkStatus="Draft",
        startDate=None,
        endDate=None,
        caseConfig="6x1",
        ean="8901030865312",
        netWeight=2000,
        grossWeight=2150,
        length=300,
        width=200,
        height=120,
        itf="18901030865319",
        predecessorCode="CBU-50002300",
        successorCode="CBU-50002345",
        csdIndexNo="CSD-5567",
        assignedPerson="Priya Patel",
        geography=[],
        depot=[],
        channel=[],
    ),
    InsertNetworkEntry(
        cbuCreatedDate="2025-11-10",
        networkChangeDate="2026-01-05",
        annexureNumber="ANN-2025-089",
        basepack="BP-300",
        basepackDescription="Lipton Green Tea 25 bags",
        bg="Foods & Refreshment",
        profitCentre="PC-FR-03",
        salesCategory="Tea",
        smallC="SC-003",
        brand="Lipton",
        format="Tea Bag",
        cbuCode="CBU-50003456",
        materialDescription="Lipton Green Tea Pure & Light 25 Tea Bags",
        typeOfNetwork="Pack Change",
        copyCbu="CBU-50003400",
        year=2026,
        networkStatus="Production Started",
        startDate="2026-01-05",
        endDate="2026-06-30",
        caseConfig="24x1",
        ean="8901030741296",
        netWeight=37.5,
        grossWeight=55,
        length=120,
        width=70,
        height=65,
        itf="18901030741293",
        predecessorCode="CBU-50003400",
        successorCode="CBU-50003456",
        csdIndexNo="CSD-6678",
        pcAtChannelState="PC-2026-Q1-Pan",
        sourcingMatrixSection="Updated",
        assignedPerson="Ankit Verma",
        geography=["TAMIL NADU", "KARNATAKA", "MUMBAI-PUNE", "DELHI-GREATER DELHI", "WEST BENGAL", "BIHAR"],
        depot=["CHKH", "BNDH", "MMDH", "DLGH", "KOPH", "PATH"],
        channel=["GT", "MT", "Ecom", "Qcom", "KA"],
    ),
    InsertNetworkEntry(
        cbuCreatedDate="2026-02-05",
        networkChangeDate=None,
        annexureNumber="ANN-2026-015",
        basepack="BP-400",
        basepackDescription="Lux Soft Touch Body Wash 250ml",
        bg="Beauty & Personal Care",
        profitCentre="PC-BPC-04",
        salesCategory="Skin Cleansing",
        smallC="SC-004",
        brand="Lux",
        format="Liquid",
        cbuCode="CBU-50004567",
        materialDescription="Lux Soft Touch French Rose Body Wash 250ml",
        typeOfNetwork="New Launch",
        copyCbu="CBU-50004500",
        year=2026,
        networkStatus="Draft",
        startDate=None,
        endDate=None,
        caseConfig="12x1",
        ean="8901030622489",
        netWeight=250,
        grossWeight=290,
        length=65,
        width=45,
        height=180,
        itf="18901030622486",
        successorCode="CBU-50004567",
        sourcingMatrixSection="Not Updated",
        assignedPerson="Sneha Gupta",
        geography=[],
        depot=[],
        channel=[],
    ),
    InsertNetworkEntry(
        cbuCreatedDate="2025-12-20",
        networkChangeDate="2026-01-15",
        annexureNumber="ANN-2025-095",
        basepack="BP-500",
        basepackDescription="Knorr Soupy Noodles 300g",
        bg="Foods & Refreshment",
        profitCentre="PC-FR-05",
        salesCategory="Savoury",
        smallC="SC-005",
        brand="Knorr",
        format="Noodles",
        cbuCode="CBU-50005678",
        materialDescription="Knorr Soupy Noodles Mast Masala 300g Pack",
        typeOfNetwork="Extension",
        copyCbu="CBU-50005600",
        year=2026,
        networkStatus="FTR Approved",
        startDate="2026-01-15",
        endDate="2026-09-30",
        caseConfig="24x1",
        ean="8901030919527",
        netWeight=300,
        grossWeight=330,
        length=200,
        width=150,
        height=40,
        itf="18901030919524",
        predecessorCode="CBU-50005600",
        successorCode="CBU-50005678",
        headerCode="HDR-KN-01",
        csdIndexNo="CSD-7789",
        pcAtChannelState="PC-2026-Q1-Pan",
        sourcingMatrixSection="Updated",
        assignedPerson="Vikram Singh",
        geography=["DELHI-GREATER DELHI", "PUNJAB-HARYANA-HILLS", "UTTAR PRADESH", "RAJASTHAN", "MADHYA PRADESH", "GUJARAT", "MUMBAI-PUNE", "GREATER MAHARASHTRA", "TAMIL NADU", "KARNATAKA", "WEST BENGAL", "BIHAR"],
        depot=["DLGH", "JPRH", "VABH", "RJ2H", "INDH", "VJDH", "MMDH", "SHAH", "CHKH", "BNDH", "KOPH", "PATH"],
        channel=["GT", "RD", "KA", "MT", "MT Retail", "Ecom"],
    ),
]


@app.on_event("startup")
async def startup():
    create_tables()

    list_storage = get_list_storage()
    list_storage.seed_entries(SEEDS)

    set_list_storage(list_storage)

    state_storage = get_state_storage()
    entries = list_storage.get_all()
    state_storage.seed_statuses(
        [{"id": e["id"], "status": e.get("networkStatus", "Draft")} for e in entries]
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "services": ["list-master", "state-management"]}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
