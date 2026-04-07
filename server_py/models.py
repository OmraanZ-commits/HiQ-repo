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
