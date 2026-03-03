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
    "CBU Transition Complete",
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
