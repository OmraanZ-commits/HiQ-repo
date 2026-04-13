from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

STATUS_FLOW = [
    "Draft",
    "Active",
    "Pricing Updated",
    "Production Started",
    "FTR Approved",
    "Stock Movement Initiated",
    "Network transition complete",
]


class NetworkEntryBase(BaseModel):
    cbuCreatedDate: Optional[str] = None
    networkChangeDate: Optional[str] = None
    annexureNumber: Optional[str] = None
    basepack: Optional[str] = None
    basepackDescription: Optional[str] = None
    bg: Optional[str] = None
    profitCentre: Optional[str] = None
    salesCategory: Optional[str] = None
    smallC: Optional[str] = None
    brand: Optional[str] = None
    format: Optional[str] = None
    cbuCode: Optional[str] = None
    materialDescription: Optional[str] = None
    typeOfNetwork: Optional[str] = None
    copyCbu: Optional[str] = None
    year: Optional[int] = None
    networkStatus: Optional[str] = "Draft"
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    caseConfig: Optional[str] = None
    ean: Optional[str] = None
    netWeight: Optional[float] = None
    grossWeight: Optional[float] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    itf: Optional[str] = None
    ftrImagesLink: Optional[str] = None
    predecessorCode: Optional[str] = None
    successorCode: Optional[str] = None
    headerCode: Optional[str] = None
    csdIndexNo: Optional[str] = None
    pcAtChannelState: Optional[str] = None
    sourcingMatrixSection: Optional[str] = None
    assignedPerson: Optional[str] = None
    geography: Optional[List[str]] = Field(default_factory=list)
    depot: Optional[List[str]] = Field(default_factory=list)
    channel: Optional[List[str]] = Field(default_factory=list)
    channelMapping: Optional[dict] = Field(default_factory=dict)
    caseConfigUpdatedAt: Optional[str] = None
    priceUpdatedAt: Optional[str] = None
    mstnPercentage: Optional[int] = None
    predecessorDoh: Optional[int] = None
    successorDoh: Optional[int] = None
    dohSnapshotDate: Optional[str] = None
    slobRisk: Optional[bool] = None
    launchType: Optional[str] = None  # "standard" | "relaunch" | "new-launch"


class InsertNetworkEntry(NetworkEntryBase):
    pass


class NetworkEntry(NetworkEntryBase):
    id: str
    createdAt: Optional[str] = None


class UpdateNetworkEntry(BaseModel):
    cbuCreatedDate: Optional[str] = None
    networkChangeDate: Optional[str] = None
    annexureNumber: Optional[str] = None
    basepack: Optional[str] = None
    basepackDescription: Optional[str] = None
    bg: Optional[str] = None
    profitCentre: Optional[str] = None
    salesCategory: Optional[str] = None
    smallC: Optional[str] = None
    brand: Optional[str] = None
    format: Optional[str] = None
    cbuCode: Optional[str] = None
    materialDescription: Optional[str] = None
    typeOfNetwork: Optional[str] = None
    copyCbu: Optional[str] = None
    year: Optional[int] = None
    networkStatus: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    caseConfig: Optional[str] = None
    ean: Optional[str] = None
    netWeight: Optional[float] = None
    grossWeight: Optional[float] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    itf: Optional[str] = None
    ftrImagesLink: Optional[str] = None
    predecessorCode: Optional[str] = None
    successorCode: Optional[str] = None
    headerCode: Optional[str] = None
    csdIndexNo: Optional[str] = None
    pcAtChannelState: Optional[str] = None
    sourcingMatrixSection: Optional[str] = None
    assignedPerson: Optional[str] = None
    geography: Optional[List[str]] = None
    depot: Optional[List[str]] = None
    channel: Optional[List[str]] = None
    channelMapping: Optional[dict] = None
    caseConfigUpdatedAt: Optional[str] = None
    priceUpdatedAt: Optional[str] = None
    predecessorDoh: Optional[int] = None
    successorDoh: Optional[int] = None
    dohSnapshotDate: Optional[str] = None
    slobRisk: Optional[bool] = None
    launchType: Optional[str] = None


class StateTransition(BaseModel):
    id: str
    entryId: str
    fromStatus: str
    toStatus: str
    transitionDate: str
    triggeredBy: Optional[str] = None
    metadata: Optional[dict] = None
    createdAt: str


class TransitionRequest(BaseModel):
    toStatus: str
    triggeredBy: Optional[str] = None
    metadata: Optional[dict] = None


# ── Master Table Pydantic Models ───────────────────────────────


class ChannelsMasterBase(BaseModel):
    code: str
    name: Optional[str] = None
    type: str                              # "Core" | "Traditional" | "Modern Trade"
    parentCode: Optional[str] = None
    isActive: Optional[bool] = True


class InsertChannelsMaster(ChannelsMasterBase):
    pass


class ChannelsMasterEntry(ChannelsMasterBase):
    id: str
    createdAt: Optional[str] = None


class UpdateChannelsMaster(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    parentCode: Optional[str] = None
    isActive: Optional[bool] = None


class ClustersMasterBase(BaseModel):
    name: str
    region: str                            # "South" | "West" | "North" | "East"
    depotCount: Optional[int] = None
    stateIds: Optional[List[str]] = Field(default_factory=list)
    pinX: Optional[float] = None
    pinY: Optional[float] = None
    isActive: Optional[bool] = True


class InsertClustersMaster(ClustersMasterBase):
    pass


class ClustersMasterEntry(ClustersMasterBase):
    id: str
    createdAt: Optional[str] = None


class UpdateClustersMaster(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    depotCount: Optional[int] = None
    stateIds: Optional[List[str]] = None
    pinX: Optional[float] = None
    pinY: Optional[float] = None
    isActive: Optional[bool] = None


class DepotsMasterBase(BaseModel):
    code: str
    name: Optional[str] = None
    clusterId: Optional[str] = None
    isActive: Optional[bool] = True


class InsertDepotsMaster(DepotsMasterBase):
    pass


class DepotsMasterEntry(DepotsMasterBase):
    id: str
    createdAt: Optional[str] = None


class UpdateDepotsMaster(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    clusterId: Optional[str] = None
    isActive: Optional[bool] = None


# ── Network Change Type Master Models ───────────────────────────


class NetworkChangeTypeMasterBase(BaseModel):
    code: str
    name: str
    category: Optional[str] = None         # e.g., "Promotion", "Relaunch", "Launch"
    isActive: Optional[bool] = True


class InsertNetworkChangeTypeMaster(NetworkChangeTypeMasterBase):
    pass


class NetworkChangeTypeMasterEntry(NetworkChangeTypeMasterBase):
    id: str
    createdAt: Optional[str] = None


class UpdateNetworkChangeTypeMaster(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    isActive: Optional[bool] = None


# ── Paid Bible Models ───────────────────────────────────────────

SR_TYPES = ["basepack-status-change", "geo-extension", "channel-extension", "sourcing-amendment"]

APPROVER_CHAIN_TEMPLATE = [
    {"role": "Network Planner",      "label": "Network Planner",      "subLabel": "Network Review"},
    {"role": "Supply Planner",       "label": "Supply Planner",       "subLabel": "Production Activities"},
    {"role": "Distribution Planner", "label": "Distribution Planner", "subLabel": "Distribution Review"},
    {"role": "NCSM",                 "label": "NCSM",                 "subLabel": "Final Approval"},
]

MSTN_ACTIVE_STATUSES = {
    "Active",
    "FTR Approved",
    "Stock Movement Initiated",
    "Network transition complete",
}

MSTN_CHECK_STATUSES = {
    "Stock Movement Initiated",
    "Network transition complete",
}

SLOB_RISK_THRESHOLD_DAYS = 5


class MaterialCriteria(BaseModel):
    id: str
    cbuCode: str
    channel: Optional[str] = None
    geography: Optional[str] = None
    matStatus: Optional[str] = None
    mstnPct: Optional[int] = None
    mstnCleared: Optional[bool] = None


class ApproverStep(BaseModel):
    label: str
    assignedTo: str
    subLabel: Optional[str] = None
    status: str = "waiting"  # "pending" | "approved" | "rejected" | "waiting"
    actionedAt: Optional[str] = None
    rejectionReason: Optional[str] = None


class ServiceRequestBase(BaseModel):
    srType: str
    raisedBy: str
    businessGroup: Optional[str] = None
    basepakCode: Optional[str] = None
    basepakName: Optional[str] = None
    businessJustification: Optional[str] = None
    materials: Optional[List[MaterialCriteria]] = Field(default_factory=list)
    approvers: Optional[List[ApproverStep]] = Field(default_factory=list)
    criteriaMetAtRaise: Optional[bool] = None
    mstnCoverageAtRaise: Optional[int] = None


class InsertServiceRequest(ServiceRequestBase):
    pass


class ServiceRequestResponse(ServiceRequestBase):
    id: str
    status: str
    rejectionReason: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ApproveStepRequest(BaseModel):
    stepIndex: int
    actionedBy: str


class RejectStepRequest(BaseModel):
    stepIndex: int
    actionedBy: str
    reason: str


# ── Basepack Status Override ─────────────────────────────────────


class BasepakStatusOverrideBase(BaseModel):
    bpId: str
    status: str
    srId: Optional[str] = None
    previousStatus: Optional[str] = None
    appliedBy: Optional[str] = None


class InsertBasepakStatusOverride(BasepakStatusOverrideBase):
    pass


class BasepakStatusOverrideResponse(BasepakStatusOverrideBase):
    id: str
    appliedAt: Optional[str] = None
    isActive: bool = True


# ── DOH & MSTN Models ───────────────────────────────────────────


class DohIngestItem(BaseModel):
    materialCode: str
    dohValue: int
    sourceType: str  # "predecessor" | "successor"


class DohIngestRequest(BaseModel):
    snapshotDate: str  # ISO date string e.g. "2026-04-13"
    items: List[DohIngestItem]


class MstnCheckRequest(BaseModel):
    checkMonth: Optional[str] = None  # e.g. "2026-04"; defaults to current month


class MstnAlertResponse(BaseModel):
    id: str
    entryId: str
    cbuCode: Optional[str] = None
    basepakCode: Optional[str] = None
    bg: Optional[str] = None
    mstnPct: Optional[int] = None
    networkStatus: Optional[str] = None
    alertType: str
    checkMonth: Optional[str] = None
    isResolved: bool = False
    createdAt: Optional[str] = None


class WindowStatusResponse(BaseModel):
    isOpen: bool
    windowStart: int  # day of month
    windowEnd: int    # day of month
    currentDay: int
    checkMonth: str
