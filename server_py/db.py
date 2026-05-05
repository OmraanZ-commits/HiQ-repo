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
    Boolean,
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
    channel_mapping = Column(JSONB, nullable=True, default={})
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    case_config_updated_at = Column(DateTime, nullable=True)
    price_updated_at = Column(DateTime, nullable=True)
    mstn_percentage = Column(Integer, nullable=True)
    mstn_by_depot = Column(JSONB, nullable=True, default={})
    predecessor_doh = Column(Integer, nullable=True)
    successor_doh = Column(Integer, nullable=True)
    doh_snapshot_date = Column(String, nullable=True)
    slob_risk = Column(Boolean, nullable=True, default=False)
    price_active = Column(Boolean, nullable=True)
    launch_type = Column(String, nullable=True)  # "standard" | "relaunch" | "new-launch"
    sourcing_mode = Column(String, nullable=True)  # "decentralized" | "centralized"
    centralized_geos = Column(JSONB, nullable=True, default=[])
    centralized_depots = Column(JSONB, nullable=True, default=[])


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


class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    role = Column(String, nullable=False)
    business_group = Column(String, nullable=True)
    is_bg_lead = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class SagaLogModel(Base):
    __tablename__ = "saga_logs"

    id = Column(String, primary_key=True)
    saga_type = Column(String, nullable=False)
    entry_id = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")
    steps = Column(JSONB, nullable=True)
    started_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    error = Column(String, nullable=True)


# ── Master Tables ──────────────────────────────────────────────


class ChannelsMasterModel(Base):
    __tablename__ = "channels_master"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=True)
    type = Column(String, nullable=False)           # Core | Traditional | Modern Trade
    parent_code = Column(String, nullable=True)     # e.g. "MT" for sub-channels
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class ClustersMasterModel(Base):
    __tablename__ = "clusters_master"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    region = Column(String, nullable=False)          # South | West | North | East
    depot_count = Column(Integer, nullable=True)
    state_ids = Column(ARRAY(Text), nullable=True, default=[])
    pin_x = Column(Float, nullable=True)
    pin_y = Column(Float, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class DepotsMasterModel(Base):
    __tablename__ = "depots_master"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=True)
    cluster_id = Column(String, nullable=True)       # logical FK to clusters_master
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class NetworkChangeTypeMasterModel(Base):
    __tablename__ = "network_change_types_master"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)         # e.g., "Promotion", "Relaunch", "Launch"
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


# ── Paid Bible Tables ───────────────────────────────────────────


class ServiceRequestModel(Base):
    __tablename__ = "service_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sr_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    raised_by = Column(String, nullable=False)
    business_group = Column(String, nullable=True)
    basepack_code = Column(String, nullable=True)
    basepack_name = Column(String, nullable=True)
    business_justification = Column(Text, nullable=True)
    materials = Column(JSONB, nullable=True, default=[])
    approvers = Column(JSONB, nullable=True, default=[])
    rejection_reason = Column(String, nullable=True)
    criteria_met_at_raise = Column(Boolean, nullable=True)
    mstn_coverage_at_raise = Column(Integer, nullable=True)
    cbu_id = Column(String, nullable=True)
    cbu_code = Column(String, nullable=True)
    cbu_description = Column(String, nullable=True)
    current_value = Column(Text, nullable=True)
    requested_value = Column(Text, nullable=True)
    added_geos = Column(JSONB, nullable=True, default=[])
    added_depots = Column(JSONB, nullable=True, default=[])
    added_channels = Column(JSONB, nullable=True, default=[])
    sourcing_mode = Column(String, nullable=True)
    centralized_geo = Column(JSONB, nullable=True, default=[])
    centralized_depots = Column(JSONB, nullable=True, default=[])
    brand = Column(String, nullable=True)
    target_status = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class BasepakStatusOverrideModel(Base):
    __tablename__ = "basepack_status_overrides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bp_id = Column(String, nullable=False, index=True)
    sr_id = Column(String, nullable=True)
    status = Column(String, nullable=False)
    previous_status = Column(String, nullable=True)
    applied_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    applied_by = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class DohSnapshotModel(Base):
    __tablename__ = "doh_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_code = Column(String, nullable=False, index=True)
    doh_value = Column(Integer, nullable=False)
    snapshot_date = Column(Date, nullable=False)
    source_type = Column(String, nullable=True)  # "predecessor" | "successor"
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class MstnAlertModel(Base):
    __tablename__ = "mstn_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(String, nullable=False, index=True)
    cbu_code = Column(String, nullable=True)
    basepack_code = Column(String, nullable=True)
    bg = Column(String, nullable=True)
    mstn_pct = Column(Integer, nullable=True)
    network_status = Column(String, nullable=True)
    alert_type = Column(String, nullable=False)  # "mstn-below-threshold" | "slob-risk"
    check_month = Column(String, nullable=True)  # e.g., "2026-04"
    is_resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class BasepakLifecycleDateModel(Base):
    __tablename__ = "basepack_lifecycle_dates"

    bp_code = Column(String, primary_key=True)
    activation_date = Column(String, nullable=True)
    inactive_date = Column(String, nullable=True)
    delist_date = Column(String, nullable=True)
    updated_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class BasepakStatusHistoryModel(Base):
    __tablename__ = "basepack_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bp_code = Column(String, nullable=False, index=True)
    from_status = Column(String, nullable=False)
    to_status = Column(String, nullable=False)
    effective_date = Column(String, nullable=True)
    sr_id = Column(String, nullable=True)
    actioned_by = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class RefDataAuditLogModel(Base):
    __tablename__ = "ref_data_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String, nullable=False)          # "channel" | "cluster" | "depot" | "network_change_type"
    entity_id = Column(String, nullable=False, index=True)
    entity_code = Column(String, nullable=True)
    action = Column(String, nullable=False)               # "create" | "update_status"
    changed_by_name = Column(String, nullable=False)
    changed_by_user_id = Column(String, nullable=True)
    old_status = Column(String, nullable=True)            # "Active" | "Inactive"
    new_status = Column(String, nullable=True)
    attachment_filename = Column(String, nullable=True)
    attachment_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


def create_tables():
    Base.metadata.create_all(bind=engine)


def run_migrations():
    """Apply additive column migrations that create_all won't handle on existing tables."""
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS launch_type VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS successor_doh INTEGER"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS doh_snapshot_date VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS price_active BOOLEAN"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS cbu_id VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS cbu_code VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS cbu_description VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS current_value TEXT"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requested_value TEXT"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS added_geos JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS added_depots JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS added_channels JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sourcing_mode VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS centralized_geo JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS centralized_depots JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS brand VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS target_status VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS sourcing_mode VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS centralized_geos JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS centralized_depots JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS mstn_by_depot JSONB"
        ))
        conn.execute(text("""
            UPDATE network_entries
            SET mstn_by_depot = (
                SELECT jsonb_object_agg(
                    d.v,
                    GREATEST(0, LEAST(100, mstn_percentage + (hashtext(d.v) % 13) - 6))
                )
                FROM unnest(depot) AS d(v)
            )
            WHERE mstn_percentage IS NOT NULL
              AND depot IS NOT NULL
              AND array_length(depot, 1) > 0
              AND (mstn_by_depot IS NULL OR mstn_by_depot = '{}')
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS basepack_status_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bp_code VARCHAR NOT NULL,
                from_status VARCHAR NOT NULL,
                to_status VARCHAR NOT NULL,
                effective_date VARCHAR,
                sr_id VARCHAR,
                actioned_by VARCHAR,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_bsh_bp_code ON basepack_status_history (bp_code)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ref_data_audit_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                entity_type VARCHAR NOT NULL,
                entity_id VARCHAR NOT NULL,
                entity_code VARCHAR,
                action VARCHAR NOT NULL,
                changed_by_name VARCHAR NOT NULL,
                changed_by_user_id VARCHAR,
                old_status VARCHAR,
                new_status VARCHAR,
                attachment_filename VARCHAR,
                attachment_url VARCHAR,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_rdal_entity ON ref_data_audit_log (entity_type, entity_id)"
        ))
        conn.commit()


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
    "channelMapping": "channel_mapping",
    "createdAt": "created_at",
    "caseConfigUpdatedAt": "case_config_updated_at",
    "priceUpdatedAt": "price_updated_at",
    "mstnPercentage": "mstn_percentage",
    "mstnByDepot": "mstn_by_depot",
    "predecessorDoh": "predecessor_doh",
    "successorDoh": "successor_doh",
    "dohSnapshotDate": "doh_snapshot_date",
    "slobRisk": "slob_risk",
    "priceActive": "price_active",
    "launchType": "launch_type",
    "sourcingMode": "sourcing_mode",
    "centralizedGeos": "centralized_geos",
    "centralizedDepots": "centralized_depots",
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


_DATETIME_COLS = {"created_at", "case_config_updated_at", "price_updated_at"}


def db_row_to_api(row: NetworkEntryModel) -> dict:
    result = {"id": str(row.id)}
    for db_col, api_field in FIELD_MAP_TO_API.items():
        val = getattr(row, db_col, None)
        if db_col in _DATETIME_COLS and val:
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
