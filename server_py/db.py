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
    mstn_green_lock = Column(JSONB, nullable=True, default={})
    activated_depots = Column(JSONB, nullable=True, default={})
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
    depot_decisions = Column(JSONB, nullable=True)
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
    listing_based = Column(Boolean, nullable=False, default=False)


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


class CcrPostedCbuModel(Base):
    """Records CBUs that have been submitted into the SAP update workflow."""
    __tablename__ = "ccr_posted_cbus"

    cbu_code = Column(String, primary_key=True)
    posted_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    posted_by = Column(String, nullable=True)
    sap_status = Column(String, nullable=False, default="Requested")  # Requested | Validated | Error


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
            "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS depot_decisions JSONB"
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
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS mstn_green_lock JSONB DEFAULT '{}'"
        ))
        conn.execute(text(
            "ALTER TABLE network_entries ADD COLUMN IF NOT EXISTS activated_depots JSONB DEFAULT '{}'"
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
        conn.execute(text("""
            UPDATE network_entries
            SET mstn_green_lock = COALESCE(mstn_green_lock, '{}') || (
                SELECT COALESCE(jsonb_object_agg(key, true), '{}')
                FROM jsonb_each(mstn_by_depot)
                WHERE value::numeric >= 80
            )
            WHERE mstn_by_depot IS NOT NULL
              AND mstn_by_depot != '{}'
        """))
        # ── Explicit MSTN overrides — correct stale hash-generated values ──────
        # BP-2000 / CBU-50020001: depot list and per-depot MSTN levels were
        # auto-generated via hashtext before explicit seed values were added.
        # JSON passed as bind params to avoid SQLAlchemy treating `:N` as placeholders.
        conn.execute(
            text("""
                UPDATE network_entries
                SET depot          = ARRAY['MMDH','CHKH','BNDH','DLGI','KOPH'],
                    mstn_by_depot  = cast(:mstn_2000 as jsonb),
                    mstn_green_lock = cast(:lock_2000 as jsonb)
                WHERE basepack = 'BP-2000' AND cbu_code = 'CBU-50020001'
            """),
            {
                "mstn_2000": '{"MMDH":91,"CHKH":88,"BNDH":85,"DLGI":83,"KOPH":82}',
                "lock_2000": '{"MMDH":true,"CHKH":true,"BNDH":true,"DLGI":true,"KOPH":true}',
            }
        )
        # BP-700 / CBU-50007890: per-depot MSTN values (all < 80 → no green lock)
        conn.execute(
            text("""
                UPDATE network_entries
                SET mstn_by_depot  = cast(:mstn_7890 as jsonb),
                    mstn_green_lock = '{}'::jsonb
                WHERE basepack = 'BP-700' AND cbu_code = 'CBU-50007890'
            """),
            {"mstn_7890": '{"DLGH":18,"VABH":22,"PATH":31,"KOPH":25,"RJ2H":20,"INDH":33,"JPRH":28,"MMDH":29}'}
        )
        # BP-700 / CBU-50007891: per-depot MSTN values (all < 80 → no green lock)
        conn.execute(
            text("""
                UPDATE network_entries
                SET mstn_by_depot  = cast(:mstn_7891 as jsonb),
                    mstn_green_lock = '{}'::jsonb
                WHERE basepack = 'BP-700' AND cbu_code = 'CBU-50007891'
            """),
            {"mstn_7891": '{"DLGH":45,"VABH":62,"RJ2H":38,"INDH":71}'}
        )
        # BP-1700 / CBU-50017001 & 50017002, BP-800 / CBU-50008902 (demo):
        # MSTN ≥ 80% but price_active explicitly false → appear in Price Inactive tile.
        conn.execute(text("""
            UPDATE network_entries
            SET price_active = false
            WHERE (basepack = 'BP-1700' AND cbu_code IN ('CBU-50017001','CBU-50017002'))
               OR (basepack = 'BP-800'  AND cbu_code = 'CBU-50008902')
        """))
        # BP-1800 / CBU-50018001 (demo): Stock Movement Initiated, price active,
        # mixed MSTN — 3 depots cleared (DLGH, MMDH, KOPH) and 2 below threshold
        # (CHKH, BNDH) to showcase the partial-clearance scenario.
        conn.execute(
            text("""
                UPDATE network_entries
                SET depot           = ARRAY['DLGH','MMDH','CHKH','BNDH','KOPH'],
                    mstn_by_depot   = cast(:mstn_1800 as jsonb),
                    mstn_green_lock = cast(:lock_1800 as jsonb),
                    mstn_percentage = 77,
                    price_active    = true
                WHERE basepack = 'BP-1800' AND cbu_code = 'CBU-50018001'
            """),
            {
                "mstn_1800": '{"DLGH":92,"MMDH":85,"KOPH":88,"CHKH":74,"BNDH":46}',
                "lock_1800": '{"DLGH":true,"MMDH":true,"KOPH":true}',
            }
        )
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
        # ── CCR: listing_based flag on customer code mapping ─────────────────
        conn.execute(text(
            "ALTER TABLE ccr_customer_code_mapping ADD COLUMN IF NOT EXISTS listing_based BOOLEAN NOT NULL DEFAULT false"
        ))
        # BRD §1: listing_based is NOT derivable from channel alone.
        # Only SBM accounts (Metro, WalMart — not in this demo dataset) are listing-based.
        # All five demo chains (BigBasket, Blinkit, Swiggy, DMart, Reliance Smart) are Non-Listing.
        # Apply explicit per-chain corrections so any pre-existing rows get the right value
        # regardless of what the old channel-based migration wrote.
        conn.execute(text(
            "UPDATE ccr_customer_code_mapping SET listing_based = false "
            "WHERE customer_chain IN ('BigBasket','Blinkit','Swiggy Instamart','DMart','Reliance Smart')"
        ))

        # ── CCR: predecessor CIC mappings for extension/relaunch demo CBUs ──
        # CBU-50008901 is the predecessor of CBU-50008902 (Closeup, BP-800, EXTENSION).
        # CBU-50016902 is the predecessor of CBU-50017003 (Pepsodent, BP-1700, EXTENSION).
        # Seeding their CIC rows so the MT Listing tab can show the before/after view.
        _pred_cic_rows = [
            # ── CBU-50008901 / BP-800 / Closeup predecessor ──────────────────
            ("CBU-50008901","BP-800","Reliance Smart","RLI-DL-001","CIC-BP800-DL-RLI","MT","DLGH"),
            ("CBU-50008901","BP-800","Reliance Smart","RLI-KA-001","CIC-BP800-KA-RLI","MT","BNDH"),
            ("CBU-50008901","BP-800","Reliance Smart","RLI-TN-001","CIC-BP800-TN-RLI","MT","CHKH"),
            ("CBU-50008901","BP-800","DMart",         "DMT-DL-001","CIC-BP800-DL-DMT","MT Retail","DLGH"),
            ("CBU-50008901","BP-800","DMart",         "DMT-KA-001","CIC-BP800-KA-DMT","MT Retail","BNDH"),
            ("CBU-50008901","BP-800","DMart",         "DMT-TN-001","CIC-BP800-TN-DMT","MT Retail","CHKH"),
            ("CBU-50008901","BP-800","BigBasket",     "BBK-DL-001","CIC-BP800-DL-BBK","Ecom","DLGH"),
            ("CBU-50008901","BP-800","BigBasket",     "BBK-KA-001","CIC-BP800-KA-BBK","Ecom","BNDH"),
            ("CBU-50008901","BP-800","Blinkit",       "BLK-DL-001","CIC-BP800-DL-BLK","Qcom","DLGH"),
            ("CBU-50008901","BP-800","Blinkit",       "BLK-KA-001","CIC-BP800-KA-BLK","Qcom","BNDH"),
            # ── CBU-50016902 / BP-1700 / Pepsodent predecessor ───────────────
            ("CBU-50016902","BP-1700","Reliance Smart","RLI-DL-001","CIC-BP1700-DL-RLI","MT","DLGH"),
            ("CBU-50016902","BP-1700","Reliance Smart","RLI-KA-001","CIC-BP1700-KA-RLI","MT","BNDH"),
            ("CBU-50016902","BP-1700","DMart",         "DMT-DL-001","CIC-BP1700-DL-DMT","MT Retail","DLGH"),
            ("CBU-50016902","BP-1700","DMart",         "DMT-TN-001","CIC-BP1700-TN-DMT","MT Retail","CHKH"),
            ("CBU-50016902","BP-1700","BigBasket",     "BBK-DL-001","CIC-BP1700-DL-BBK","Ecom","DLGH"),
            ("CBU-50016902","BP-1700","Blinkit",       "BLK-DL-001","CIC-BP1700-DL-BLK","Qcom","DLGH"),
            # ── CBU-50018902 / BP-D650 / Dove 650ml predecessor (pred of CBU-50019003) ──
            # Geography: MUMBAI-PUNE (MMDH) / DELHI-GREATER DELHI (DLGH).
            # Channels: MT Retail (DMart), MT (Reliance Smart), Ecom (BigBasket), Qcom (Blinkit).
            # Matches the 5 Action Required line items seeded for CBU-50019003 in seed_ccr.py.
            ("CBU-50018902","BP-D650","DMart",         "DMT-MH-001","CIC-D650-MH-DMT","MT Retail","MMDH"),
            ("CBU-50018902","BP-D650","DMart",         "DMT-DL-001","CIC-D650-DL-DMT","MT Retail","DLGH"),
            ("CBU-50018902","BP-D650","Reliance Smart","RLI-MH-001","CIC-D650-MH-RLI","MT","MMDH"),
            ("CBU-50018902","BP-D650","Blinkit",       "BLK-MH-001","CIC-D650-MH-BLK","Qcom","MMDH"),
            ("CBU-50018902","BP-D650","BigBasket",     "BBK-MH-001","CIC-D650-MH-BBK","Ecom","MMDH"),
            # ── CBU-50018906 / BP-DX500 / Domex 500ml predecessor (pred of CBU-50019007) ─
            # Geography: MUMBAI-PUNE (MMDH) / GUJARAT (AMDH / VJDH for DMart Gujarat).
            # Channels: MT Retail (DMart), MT (Reliance Smart), Qcom (Swiggy Instamart).
            # Matches the 4 line items seeded for CBU-50019007 in seed_ccr.py.
            ("CBU-50018906","BP-DX500","DMart",            "DMT-GJ-001","CIC-DX500-GJ-DMT","MT Retail","VJDH"),
            ("CBU-50018906","BP-DX500","DMart",            "DMT-MH-001","CIC-DX500-MH-DMT","MT Retail","MMDH"),
            ("CBU-50018906","BP-DX500","Reliance Smart",   "RLI-MH-001","CIC-DX500-MH-RLI","MT","MMDH"),
            ("CBU-50018906","BP-DX500","Swiggy Instamart", "SWG-MH-001","CIC-DX500-MH-SWG","Qcom","MMDH"),
            # ── CBU-50006700 / BP-V500 / Vim 500ml predecessor (pred of CBU-50006789) ───
            # Geography: TAMIL NADU (CHKH) / KARNATAKA (BNDH).
            # Channels: Ecom (BigBasket), MT Retail (DMart), MT (Reliance Smart).
            # Matches the 3 Upcoming line items seeded for CBU-50006789 in seed_ccr.py.
            ("CBU-50006700","BP-V500","BigBasket",     "BBK-KA-001","CIC-V500-KA-BBK","Ecom","BNDH"),
            ("CBU-50006700","BP-V500","DMart",         "DMT-TN-001","CIC-V500-TN-DMT","MT Retail","CHKH"),
            ("CBU-50006700","BP-V500","Reliance Smart","RLI-TN-001","CIC-V500-TN-RLI","MT","CHKH"),
            # ── CBU-50018901 / BP-1901 / Sunsilk predecessor (active workspace demo) ─
            # Predecessor of CBU-50019002 (RL_ART_PKG, FTR Approved in CCR workspace).
            # Geography: MUMBAI-PUNE (MMDH) / TAMIL NADU (CHKH) / KARNATAKA (BNDH).
            # Channels: MT, MT LFS (≡ MT Retail for CCR), Ecom, Qcom.
            # Data flows from Network Visibility (network_entries CBU-50018901) and
            # Paid Bible (BP-1901 activation/inactive lifecycle dates seeded below).
            ("CBU-50018901","BP-1901","Reliance Smart","RLI-MH-001","CIC-BP1901-MH-RLI","MT","MMDH"),
            ("CBU-50018901","BP-1901","Reliance Smart","RLI-TN-001","CIC-BP1901-TN-RLI","MT","CHKH"),
            ("CBU-50018901","BP-1901","Reliance Smart","RLI-KA-001","CIC-BP1901-KA-RLI","MT","BNDH"),
            ("CBU-50018901","BP-1901","DMart",         "DMT-MH-001","CIC-BP1901-MH-DMT","MT Retail","MMDH"),
            ("CBU-50018901","BP-1901","DMart",         "DMT-TN-001","CIC-BP1901-TN-DMT","MT Retail","CHKH"),
            ("CBU-50018901","BP-1901","DMart",         "DMT-KA-001","CIC-BP1901-KA-DMT","MT Retail","BNDH"),
            ("CBU-50018901","BP-1901","BigBasket",     "BBK-MH-001","CIC-BP1901-MH-BBK","Ecom","MMDH"),
            ("CBU-50018901","BP-1901","BigBasket",     "BBK-TN-001","CIC-BP1901-TN-BBK","Ecom","CHKH"),
            ("CBU-50018901","BP-1901","BigBasket",     "BBK-KA-001","CIC-BP1901-KA-BBK","Ecom","BNDH"),
            ("CBU-50018901","BP-1901","Blinkit",       "BLK-MH-001","CIC-BP1901-MH-BLK","Qcom","MMDH"),
            ("CBU-50018901","BP-1901","Blinkit",       "BLK-TN-001","CIC-BP1901-TN-BLK","Qcom","CHKH"),
            ("CBU-50018901","BP-1901","Blinkit",       "BLK-KA-001","CIC-BP1901-KA-BLK","Qcom","BNDH"),
        ]
        for (cbu, bp, chain, ccode, cic, ch, depot) in _pred_cic_rows:
            conn.execute(text("""
                INSERT INTO ccr_cic_mapping
                    (id, cbu_code, basepack, customer_chain, customer_code, cic,
                     channel, depot, status, sourcing_depot, sourcing_type, pricing_status, sales_org)
                SELECT gen_random_uuid(), :cbu, :bp, :chain, :ccode, :cic,
                       :ch, :depot, 'Mapped', :depot, 'Decentralized', 'Available', '1000'
                WHERE NOT EXISTS (
                    SELECT 1 FROM ccr_cic_mapping
                    WHERE cbu_code = :cbu AND customer_code = :ccode
                )
            """), {"cbu": cbu, "bp": bp, "chain": chain, "ccode": ccode,
                   "cic": cic, "ch": ch, "depot": depot})
        # ─────────────────────────────────────────────────────────────────────

        # ── Paid Bible: BP-1901 lifecycle dates ──────────────────────────────
        # BP-1901 (Sunsilk predecessor) was activated in June 2024 when it
        # launched as CBU-50018901. Its inactive_date is set to July 2026 because
        # it is being phased out by the RL_ART_PKG relaunch (CBU-50019002 / BP-FTR2).
        # This is the Paid Bible source of truth for the predecessor basepack — the
        # MT Listing page uses it to confirm the "old" CIC rows are on a deactivating SKU.
        conn.execute(text("""
            INSERT INTO basepack_lifecycle_dates (bp_code, activation_date, inactive_date, delist_date)
            VALUES ('BP-1901', '2024-06-15T00:00:00+00:00', '2026-07-01T00:00:00+00:00', NULL)
            ON CONFLICT (bp_code) DO NOTHING
        """))
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
            "ALTER TABLE ccr_posted_cbus ADD COLUMN IF NOT EXISTS sap_status VARCHAR NOT NULL DEFAULT 'Requested'",
        ]:
            try:
                conn.execute(text(col_sql))
            except Exception:
                pass

        # ── Seed customer_mapping for demo network entries ────────────────────
        # customer_mapping drives the "applicable chains" dropdown on the CCR
        # Configure page.  It maps geo regions to lists of 4-letter NV codes
        # that are then translated to CCR chain names via NV_CODE_TO_CCR_CHAIN.
        # For the demo all new-launch CBUs are available to all five chains,
        # so we write a national mapping (keyed by "ALL") with the five codes.
        # Only rows that still have null / empty customer_mapping are touched.
        conn.execute(text("""
            UPDATE network_entries
            SET customer_mapping = '{"ALL": ["BLIT", "BIGB", "SWIN", "RELI", "DMAR"]}'::jsonb
            WHERE (customer_mapping IS NULL OR customer_mapping = '{}'::jsonb)
        """))

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


def migrate_ccr_trigger_stage_actionability():
    """
    One-time migration: enforce BRD §11.1 rule that Action Required only fires at
    Third stage (Stock Movement Initiated) or Fourth (Inventory Threshold Breached).

    Resets any First / Second / None stage items that were incorrectly sitting at
    "Action Required" back to "Upcoming", and promotes CBU-50019003 demo items to
    Third stage (Red) and CBU-50019004 demo items to Fourth stage (Blinking Red).
    Idempotent — safe to run on every startup.
    """
    from sqlalchemy import text
    db_conn = engine.connect()
    try:
        # 1. Demote First/Second/None "Action Required" items → "Upcoming"
        db_conn.execute(text("""
            UPDATE ccr_line_items
            SET ccr_status = 'Upcoming'
            WHERE trigger_stage IN ('First', 'Second', 'None')
              AND ccr_status = 'Action Required'
        """))

        # 2. Promote CBU-50019002 items from First → Second (Post FTR Clearance)
        db_conn.execute(text("""
            UPDATE ccr_line_items
            SET trigger_stage = 'Second', urgency_color = 'Amber'
            WHERE successor_cbu_code = 'CBU-50019002'
              AND trigger_stage = 'First'
        """))

        # 3. Force CBU-50019003 all CIC items → Third (Stock Movement Initiated).
        #    Unconditional — overrides any engine-assigned stage (engine can't downgrade now).
        #    BigBasket row backfilled with its CIC if still NULL.
        db_conn.execute(text("""
            UPDATE ccr_line_items
            SET trigger_stage = 'Third', urgency_color = 'Red', ccr_status = 'Action Required',
                cic = COALESCE(cic, 'CIC-FTR3-MH-BBK')
            WHERE successor_cbu_code = 'CBU-50019003'
              AND customer_chain = 'BigBasket'
        """))
        db_conn.execute(text("""
            UPDATE ccr_line_items
            SET trigger_stage = 'Third', urgency_color = 'Red', ccr_status = 'Action Required'
            WHERE successor_cbu_code = 'CBU-50019003'
              AND cic IS NOT NULL
              AND customer_chain != 'BigBasket'
        """))
        # Also advance network status so the trigger engine stays consistent going forward
        db_conn.execute(text("""
            UPDATE network_entries
            SET network_status = 'Stock Movement Initiated'
            WHERE cbu_code = 'CBU-50019003'
        """))

        # 4. Force CBU-50019004 all CIC items → Fourth (Inventory Threshold Breached).
        db_conn.execute(text("""
            UPDATE ccr_line_items
            SET trigger_stage = 'Fourth', urgency_color = 'Blinking Red', ccr_status = 'Action Required',
                cic = COALESCE(cic, 'CIC-FTR4-DL-BBK')
            WHERE successor_cbu_code = 'CBU-50019004'
              AND customer_chain = 'BigBasket'
        """))
        db_conn.execute(text("""
            UPDATE ccr_line_items
            SET trigger_stage = 'Fourth', urgency_color = 'Blinking Red', ccr_status = 'Action Required'
            WHERE successor_cbu_code = 'CBU-50019004'
              AND cic IS NOT NULL
              AND customer_chain != 'BigBasket'
        """))
        # Set DOH values so trigger engine also arrives at Fourth naturally
        db_conn.execute(text("""
            UPDATE network_entries
            SET network_status = 'Stock Movement Initiated',
                predecessor_doh = 2,
                successor_doh   = 8
            WHERE cbu_code = 'CBU-50019004'
        """))

        db_conn.commit()
    finally:
        db_conn.close()


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
    "mstnGreenLock": "mstn_green_lock",
    "activatedDepots": "activated_depots",
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
