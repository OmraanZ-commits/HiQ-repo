import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Float,
    Text,
    DateTime,
    Date,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = os.environ.get("DATABASE_URL", "")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class NetworkEntryModel(Base):
    __tablename__ = "network_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cbu_created_date = Column(String, nullable=True)
    network_change_date = Column(String, nullable=True)
    annexure_number = Column(String, nullable=True)
    basepack = Column(String, nullable=True)
    basepack_description = Column(String, nullable=True)
    bg = Column(String, nullable=True)
    profit_centre = Column(String, nullable=True)
    sales_category = Column(String, nullable=True)
    small_c = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    format = Column(String, nullable=True)
    cbu_code = Column(String, nullable=True)
    material_description = Column(String, nullable=True)
    type_of_network = Column(String, nullable=True)
    copy_cbu = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    network_status = Column(String, nullable=True, default="Draft")
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    case_config = Column(String, nullable=True)
    ean = Column(String, nullable=True)
    net_weight = Column(Float, nullable=True)
    gross_weight = Column(Float, nullable=True)
    length = Column(Float, nullable=True)
    width = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    itf = Column(String, nullable=True)
    ftr_images_link = Column(String, nullable=True)
    predecessor_code = Column(String, nullable=True)
    successor_code = Column(String, nullable=True)
    header_code = Column(String, nullable=True)
    csd_index_no = Column(String, nullable=True)
    pc_at_channel_state = Column(String, nullable=True)
    sourcing_matrix_section = Column(String, nullable=True)
    assigned_person = Column(String, nullable=True)
    geography = Column(ARRAY(Text), nullable=True, default=[])
    depot = Column(ARRAY(Text), nullable=True, default=[])
    channel = Column(ARRAY(Text), nullable=True, default=[])
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class EntryStatusModel(Base):
    __tablename__ = "entry_statuses"

    entry_id = Column(UUID(as_uuid=True), primary_key=True)
    current_status = Column(String, nullable=False, default="Draft")
    updated_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class StateTransitionModel(Base):
    __tablename__ = "state_transitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    from_status = Column(String, nullable=False)
    to_status = Column(String, nullable=False)
    transition_date = Column(String, nullable=True)
    triggered_by = Column(String, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


def create_tables():
    Base.metadata.create_all(bind=engine)


FIELD_MAP_TO_DB = {
    "cbuCreatedDate": "cbu_created_date",
    "networkChangeDate": "network_change_date",
    "annexureNumber": "annexure_number",
    "basepackDescription": "basepack_description",
    "profitCentre": "profit_centre",
    "salesCategory": "sales_category",
    "smallC": "small_c",
    "cbuCode": "cbu_code",
    "materialDescription": "material_description",
    "typeOfNetwork": "type_of_network",
    "copyCbu": "copy_cbu",
    "networkStatus": "network_status",
    "startDate": "start_date",
    "endDate": "end_date",
    "caseConfig": "case_config",
    "netWeight": "net_weight",
    "grossWeight": "gross_weight",
    "ftrImagesLink": "ftr_images_link",
    "predecessorCode": "predecessor_code",
    "successorCode": "successor_code",
    "headerCode": "header_code",
    "csdIndexNo": "csd_index_no",
    "pcAtChannelState": "pc_at_channel_state",
    "sourcingMatrixSection": "sourcing_matrix_section",
    "assignedPerson": "assigned_person",
    "createdAt": "created_at",
}

FIELD_MAP_TO_API = {v: k for k, v in FIELD_MAP_TO_DB.items()}

SIMPLE_FIELDS = [
    "basepack", "bg", "brand", "format", "year",
    "ean", "itf", "length", "width", "height",
    "geography", "depot", "channel",
]
for f in SIMPLE_FIELDS:
    FIELD_MAP_TO_DB[f] = f
    FIELD_MAP_TO_API[f] = f


def db_row_to_api(row: NetworkEntryModel) -> dict:
    result = {"id": str(row.id)}
    for db_col, api_field in FIELD_MAP_TO_API.items():
        val = getattr(row, db_col, None)
        if db_col == "created_at" and val:
            val = val.isoformat()
        result[api_field] = val
    return result


def api_data_to_db(data: dict) -> dict:
    result = {}
    for api_field, value in data.items():
        if api_field in ("id", "createdAt"):
            continue
        db_col = FIELD_MAP_TO_DB.get(api_field, api_field)
        if hasattr(NetworkEntryModel, db_col):
            result[db_col] = value
    return result
