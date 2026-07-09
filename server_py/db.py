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
    basepak_doh = Column(Integer, nullable=True)
    prod_plan_moc_1 = Column(Boolean, nullable=True)
    prod_plan_moc_2 = Column(Boolean, nullable=True)
    prod_plan_moc_3 = Column(Boolean, nullable=True)
    price_active = Column(Boolean, nullable=True)
    launch_type = Column(String, nullable=True)  # "standard" | "relaunch" | "new-launch"
    sourcing_mode = Column(String, nullable=True)  # "decentralized" | "centralized"
    centralized_geos = Column(JSONB, nullable=True, default=[])
    centralized_depots = Column(JSONB, nullable=True, default=[])
    customer_mapping = Column(JSONB, nullable=True, default={})


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


class FtrLinkModel(Base):
    __tablename__ = "ftr_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cbu_code = Column(String, nullable=False, index=True)
    ftr_link = Column(String, nullable=False)
    description = Column(String, nullable=True)
    uploaded_by = Column(String, nullable=True)
    uploaded_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    source_file = Column(String, nullable=True)


class FtrImageModel(Base):
    __tablename__ = "ftr_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cbu_code = Column(String, nullable=False, index=True)
    image_url = Column(String, nullable=True)
    image_data = Column(Text, nullable=True)
    image_filename = Column(String, nullable=True)
    caption = Column(String, nullable=True)
    uploaded_by = Column(String, nullable=True)
    uploaded_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


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


class DemandForecastEntryModel(Base):
    __tablename__ = "demand_forecast_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    basepack = Column(String, nullable=False)
    depot = Column(String, nullable=False)
    moc_month = Column(String, nullable=False)
    channel_type = Column(String, nullable=False)
    forecast_channel = Column(String, nullable=True)
    sub_channel = Column(String, nullable=True)
    qty_cases = Column(Float, nullable=True, default=0)
    qty_rpm = Column(Float, nullable=True, default=0)
    qty_units = Column(Float, nullable=True, default=0)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class NetworkChangeTypeMasterModel(Base):
    __tablename__ = "network_change_types_master"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)         # e.g., "Promotion", "Relaunch", "Launch"
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class ClusterRegionStateModel(Base):
    __tablename__ = "cluster_region_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster = Column(String, nullable=False)
    region_code = Column(String, nullable=True)
    state = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=True)
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
    removed_geos = Column(JSONB, nullable=True, default=[])
    removed_depots = Column(JSONB, nullable=True, default=[])
    sourcing_mode = Column(String, nullable=True)
    centralized_geo = Column(JSONB, nullable=True, default=[])
    centralized_depots = Column(JSONB, nullable=True, default=[])
    brand = Column(String, nullable=True)
    target_status = Column(String, nullable=True)
    added_chains = Column(JSONB, nullable=True, default=[])
    removed_chains = Column(JSONB, nullable=True, default=[])
    requested_customer_mapping = Column(JSONB, nullable=True)
    requested_date = Column(String, nullable=True)
    effective_date = Column(String, nullable=True)
    validation_summary = Column(JSONB, nullable=True)
    pricing_complete = Column(Boolean, nullable=True)
    sourcing_complete = Column(Boolean, nullable=True)
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


# ── CCR Tables ──────────────────────────────────────────────────


class CcrCustomerMasterModel(Base):
    __tablename__ = "ccr_customer_master"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_chain = Column(String, nullable=False, unique=True)
    coverage_type = Column(String, nullable=False)    # National | Regional
    behaviour_type = Column(String, nullable=False)   # Listing | Non-Listing
    cse_id = Column(String, nullable=True)            # email of the assigned CSE user
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class CcrCustomerCodeMappingModel(Base):
    __tablename__ = "ccr_customer_code_mapping"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_chain = Column(String, nullable=False, index=True)
    customer_code = Column(String, nullable=False)
    depot = Column(String, nullable=False)
    sub_channel = Column(String, nullable=True)
    channel = Column(String, nullable=False, default="MT")


class CcrCicMappingModel(Base):
    __tablename__ = "ccr_cic_mapping"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cbu_code = Column(String, nullable=False, index=True)
    basepack = Column(String, nullable=True)
    customer_chain = Column(String, nullable=False, index=True)
    customer_code = Column(String, nullable=False)
    cic = Column(String, nullable=True)
    cic_description = Column(String, nullable=True)
    sales_org = Column(String, nullable=True, default="1000")
    channel = Column(String, nullable=True)
    depot = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Mapped")   # Mapped | Non-Mapped | Inactive | Stock Base Delisted | Delisted
    sourcing_depot = Column(String, nullable=True)
    sourcing_type = Column(String, nullable=True)               # Centralized | Decentralized
    pricing_status = Column(String, nullable=True)              # Available | Not Available | Partial
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class CcrRulesetModel(Base):
    __tablename__ = "ccr_ruleset"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    network_change_type = Column(String, nullable=False, unique=True)
    new_cic_required = Column(Boolean, nullable=False, default=False)
    content_update_required = Column(Boolean, nullable=False, default=False)
    rundown_required = Column(Boolean, nullable=False, default=False)
    auto_ccr = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)


class CcrLineItemModel(Base):
    __tablename__ = "ccr_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    predecessor_cbu_code = Column(String, nullable=True, index=True)
    successor_cbu_code = Column(String, nullable=True, index=True)
    customer_chain = Column(String, nullable=False, index=True)
    customer_code = Column(String, nullable=False)
    cic = Column(String, nullable=True)
    trigger_stage = Column(String, nullable=False, default="None")   # None | First | Second | Third | Fourth
    urgency_color = Column(String, nullable=False, default="None")   # None | Amber | Red | Blinking Red
    ccr_status = Column(String, nullable=False, default="Upcoming")  # Upcoming | Action Required | Completed
    execution_type = Column(String, nullable=False, default="Manual")  # Auto | Semi-Auto | Manual | None
    ruleset_outcome = Column(JSONB, nullable=True)
    overrides = Column(JSONB, nullable=True)
    escalation_due_at = Column(DateTime, nullable=True)
    escalated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class CcrAuditLogModel(Base):
    __tablename__ = "ccr_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ccr_line_item_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


# ── CCR Ruleset Reference Tables ─────────────────────────────────────────────


class CcrAccountModel(Base):
    """Customer accounts for the CCR Ruleset (editable reference data)."""
    __tablename__ = "ccr_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_name = Column(String, nullable=False, unique=True)
    ccr_action = Column(String, nullable=False)            # National | Regional
    sbm_listing_based = Column(String, nullable=False)     # SBM | Listing Based | Non-Listing
    pixel_required = Column(String, nullable=False)        # Y | N
    content_required = Column(String, nullable=False)      # Y | N
    customer_update_timeline = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


class CcrRuleModel(Base):
    """Per-account, per-change-type CCR action rules (editable reference data)."""
    __tablename__ = "ccr_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("ccr_accounts.id"), nullable=False, index=True)
    change_type = Column(String, nullable=False)
    ean_scenario = Column(String, nullable=False)          # with_ean | without_ean | na
    new_cic_required = Column(String, nullable=False, default="N")
    content_update_required = Column(String, nullable=False, default="N")
    rundown = Column(String, nullable=False, default="N")
    new_po_required = Column(String, nullable=True)        # Only for no-ean-change type
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))


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
            "ALTER TABLE demand_forecast_entries ADD COLUMN IF NOT EXISTS sub_channel VARCHAR"
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
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS removed_geos JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS removed_depots JSONB"
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
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS added_chains JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS removed_chains JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requested_customer_mapping JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requested_date VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS effective_date VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS validation_summary JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pricing_complete BOOLEAN"
        ))
        conn.execute(text(
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sourcing_complete BOOLEAN"
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
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS basepak_doh INTEGER"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS prod_plan_moc_1 BOOLEAN"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS prod_plan_moc_2 BOOLEAN"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS prod_plan_moc_3 BOOLEAN"
        ))
        conn.execute(text("""
            UPDATE network_entries SET basepak_doh=10, prod_plan_moc_1=true,  prod_plan_moc_2=false, prod_plan_moc_3=false WHERE cbu_code='CBU-50007890'
        """))
        conn.execute(text("""
            UPDATE network_entries SET basepak_doh=10, prod_plan_moc_1=false, prod_plan_moc_2=true,  prod_plan_moc_3=false WHERE cbu_code='CBU-50007891'
        """))
        conn.execute(text("""
            UPDATE network_entries SET basepak_doh=10, prod_plan_moc_1=false, prod_plan_moc_2=false, prod_plan_moc_3=false WHERE cbu_code='CBU-50007892'
        """))
        conn.execute(text("""
            UPDATE network_entries SET basepak_doh=1,  prod_plan_moc_1=false, prod_plan_moc_2=false, prod_plan_moc_3=false WHERE cbu_code='CBU-50005678'
        """))
        conn.execute(text("""
            UPDATE network_entries SET basepak_doh=8,  prod_plan_moc_1=true,  prod_plan_moc_2=false, prod_plan_moc_3=false WHERE cbu_code='CBU-50006789'
        """))
        conn.execute(text("""
            UPDATE network_entries SET basepak_doh=5,  prod_plan_moc_1=false, prod_plan_moc_2=false, prod_plan_moc_3=false WHERE cbu_code='CBU-50003456'
        """))
        conn.execute(text("""
            UPDATE network_entries SET basepak_doh=1,  prod_plan_moc_1=false, prod_plan_moc_2=false, prod_plan_moc_3=false WHERE cbu_code='CBU-50001234'
        """))
        conn.execute(text("""
            UPDATE network_entries SET successor_doh=8   WHERE cbu_code='CBU-50005678' AND successor_doh IS NULL
        """))
        conn.execute(text("""
            UPDATE network_entries SET predecessor_doh=20, successor_doh=8  WHERE cbu_code='CBU-50006789' AND (predecessor_doh IS NULL OR successor_doh IS NULL)
        """))
        conn.execute(text("""
            UPDATE network_entries SET predecessor_doh=18, successor_doh=5  WHERE cbu_code='CBU-50003456' AND (predecessor_doh IS NULL OR successor_doh IS NULL)
        """))
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
        # ── CCR: CLOT (Customer Level of Trade) per depot per chain ────────────
        conn.execute(text(
            "ALTER TABLE ccr_customer_code_mapping ADD COLUMN IF NOT EXISTS clot FLOAT DEFAULT 1.0"
        ))
        # Seed representative CLOT volumes so top-70% National depot gating works.
        # Values reflect relative throughput; real data would come from MIS / DMS.
        for depot_code, clot_val in [
            ("MMDH", 2500.0), ("DLGH", 2000.0), ("CHKH", 1500.0),
            ("VJDH", 1200.0), ("VABH",  900.0), ("JPRH",  800.0),
            ("SHAH",  750.0), ("BNDH",  700.0), ("KOPH",  600.0),
            ("RJ2H",  500.0), ("AMDH",  450.0),
        ]:
            conn.execute(text(
                "UPDATE ccr_customer_code_mapping SET clot = :v "
                "WHERE depot = :d AND (clot IS NULL OR clot = 1.0)"
            ), {"d": depot_code, "v": clot_val})
        # ─────────────────────────────────────────────────────────────────────

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
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cluster_region_states (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cluster VARCHAR NOT NULL,
                region_code VARCHAR,
                state VARCHAR,
                sort_order INTEGER,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_crs_cluster ON cluster_region_states (cluster)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ftr_links (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cbu_code VARCHAR NOT NULL,
                ftr_link VARCHAR NOT NULL,
                description VARCHAR,
                uploaded_by VARCHAR,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                source_file VARCHAR
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ftr_links_cbu ON ftr_links (cbu_code)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ftr_images (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cbu_code VARCHAR NOT NULL,
                image_url VARCHAR,
                image_data TEXT,
                image_filename VARCHAR,
                caption VARCHAR,
                uploaded_by VARCHAR,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ftr_images_cbu ON ftr_images (cbu_code)"
        ))
        for col_sql in [
            "ALTER TABLE ftr_images ADD COLUMN IF NOT EXISTS image_data TEXT",
            "ALTER TABLE ftr_images ADD COLUMN IF NOT EXISTS image_filename VARCHAR",
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS customer_mapping JSONB",
            "ALTER TABLE ftr_images ALTER COLUMN image_url DROP NOT NULL",
            "ALTER TABLE ccr_cic_mapping ADD COLUMN IF NOT EXISTS cic_description VARCHAR",
        ]:
            try:
                conn.execute(text(col_sql))
            except Exception:
                pass

        # ── CCR tables ──────────────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_customer_master (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_chain VARCHAR NOT NULL UNIQUE,
                coverage_type VARCHAR NOT NULL,
                behaviour_type VARCHAR NOT NULL,
                cse_id VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_customer_code_mapping (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_chain VARCHAR NOT NULL,
                customer_code VARCHAR NOT NULL,
                depot VARCHAR NOT NULL,
                sub_channel VARCHAR,
                channel VARCHAR NOT NULL DEFAULT 'MT'
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_ccm_chain ON ccr_customer_code_mapping (customer_chain)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_cic_mapping (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cbu_code VARCHAR NOT NULL,
                basepack VARCHAR,
                customer_chain VARCHAR NOT NULL,
                customer_code VARCHAR NOT NULL,
                cic VARCHAR,
                sales_org VARCHAR DEFAULT '1000',
                channel VARCHAR,
                depot VARCHAR,
                status VARCHAR NOT NULL DEFAULT 'Mapped',
                sourcing_depot VARCHAR,
                sourcing_type VARCHAR,
                pricing_status VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_cic_cbu ON ccr_cic_mapping (cbu_code)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_cic_chain ON ccr_cic_mapping (customer_chain)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_ruleset (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                network_change_type VARCHAR NOT NULL UNIQUE,
                new_cic_required BOOLEAN NOT NULL DEFAULT FALSE,
                content_update_required BOOLEAN NOT NULL DEFAULT FALSE,
                rundown_required BOOLEAN NOT NULL DEFAULT FALSE,
                auto_ccr BOOLEAN NOT NULL DEFAULT FALSE,
                notes TEXT
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_line_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                predecessor_cbu_code VARCHAR,
                successor_cbu_code VARCHAR,
                customer_chain VARCHAR NOT NULL,
                customer_code VARCHAR NOT NULL,
                cic VARCHAR,
                trigger_stage VARCHAR NOT NULL DEFAULT 'None',
                urgency_color VARCHAR NOT NULL DEFAULT 'None',
                ccr_status VARCHAR NOT NULL DEFAULT 'Upcoming',
                execution_type VARCHAR NOT NULL DEFAULT 'Manual',
                ruleset_outcome JSONB,
                overrides JSONB,
                escalation_due_at TIMESTAMP WITH TIME ZONE,
                escalated_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_li_pred ON ccr_line_items (predecessor_cbu_code)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_li_succ ON ccr_line_items (successor_cbu_code)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_li_chain ON ccr_line_items (customer_chain)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_audit_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ccr_line_item_id UUID NOT NULL,
                event_type VARCHAR NOT NULL,
                actor VARCHAR NOT NULL,
                payload JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_al_item ON ccr_audit_log (ccr_line_item_id)"
        ))

        # ── CCR Ruleset reference tables ────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_name VARCHAR NOT NULL UNIQUE,
                ccr_action VARCHAR NOT NULL,
                sbm_listing_based VARCHAR NOT NULL,
                pixel_required VARCHAR NOT NULL DEFAULT 'N',
                content_required VARCHAR NOT NULL DEFAULT 'N',
                customer_update_timeline VARCHAR,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccr_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_id UUID NOT NULL REFERENCES ccr_accounts(id) ON DELETE CASCADE,
                change_type VARCHAR NOT NULL,
                ean_scenario VARCHAR NOT NULL,
                new_cic_required VARCHAR NOT NULL DEFAULT 'N',
                content_update_required VARCHAR NOT NULL DEFAULT 'N',
                rundown VARCHAR NOT NULL DEFAULT 'N',
                new_po_required VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ccr_rules_account ON ccr_rules (account_id)"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_ccr_rules_cell ON ccr_rules (account_id, change_type, ean_scenario)"
        ))
        conn.commit()


def migrate_sr_approval_chain():
    """
    One-time migration: remap any in-flight (status='pending') service requests
    from the old approval chain shape (Network Planner -> Supply Planner ->
    Distribution Planner -> NCSM, or single-step Network Planner) to the new
    4-stage chain (Supply Planner -> Demand Planner -> Network Planner -> NCSM).

    Strategy: preserve assignedTo per role where the role name matches between
    old and new chains (Supply Planner, Network Planner, NCSM); "Demand Planner"
    has no equivalent in the old chain so it is left "Unassigned". The chain is
    restarted at step 0 (Supply Planner pending) since feasibility validation
    must occur before any of the other new-chain checks are meaningful.
    """
    from server_py.models import APPROVER_CHAIN_TEMPLATE

    db = SessionLocal()
    try:
        rows = db.query(ServiceRequestModel).filter(
            ServiceRequestModel.status == "pending"
        ).all()
        new_role_labels = {step["label"] for step in APPROVER_CHAIN_TEMPLATE}
        for row in rows:
            approvers = row.approvers or []
            already_migrated = (
                len(approvers) == len(APPROVER_CHAIN_TEMPLATE)
                and all(a.get("label") in new_role_labels for a in approvers)
                and [a.get("label") for a in approvers] == [s["label"] for s in APPROVER_CHAIN_TEMPLATE]
            )
            if already_migrated:
                continue

            old_by_label = {a.get("label"): a for a in approvers}
            rebuilt = []
            for i, step in enumerate(APPROVER_CHAIN_TEMPLATE):
                old_step = old_by_label.get(step["label"])
                assigned_to = (old_step or {}).get("assignedTo") or step["role"]
                rebuilt.append({
                    "label": step["label"],
                    "assignedTo": assigned_to,
                    "subLabel": step["subLabel"],
                    "status": "pending" if i == 0 else "waiting",
                    "actionedAt": None,
                    "rejectionReason": None,
                    "comments": None,
                    "effectiveDate": None,
                })
            row.approvers = rebuilt
            if not row.effective_date and row.requested_date:
                row.effective_date = row.requested_date
        db.commit()
    finally:
        db.close()


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
    "basepakDoh": "basepak_doh",
    "prodPlanMoc1": "prod_plan_moc_1",
    "prodPlanMoc2": "prod_plan_moc_2",
    "prodPlanMoc3": "prod_plan_moc_3",
    "priceActive": "price_active",
    "launchType": "launch_type",
    "sourcingMode": "sourcing_mode",
    "centralizedGeos": "centralized_geos",
    "centralizedDepots": "centralized_depots",
    "customerMapping": "customer_mapping",
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
