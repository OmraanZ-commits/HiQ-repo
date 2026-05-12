"""
SR Approval Saga
Orchestrates the approval of a Service Request step-by-step.

On full approval:
  - "basepack-status-change" → writes basepack_status_overrides + lifecycle dates
  - "geo-extension"          → merges addedGeos / addedDepots into the CBU record
  - "channel-extension"      → merges addedChannels into the CBU's channel array
  - "sourcing-amendment"     → updates CBU sourcing_mode / centralized_geos / centralized_depots

Supports compensation (rollback) on failure.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from server_py.services.service_requests.service import ServiceRequestService
from server_py.services.basepack_status.service import BasepakStatusService
from server_py.services.list_master.service import ListMasterService
from server_py.models import ApproveStepRequest, RejectStepRequest, InsertBasepakStatusOverride


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SrApprovalSaga:
    def __init__(
        self,
        sr_id: str,
        sr_service: ServiceRequestService,
        bp_status_service: BasepakStatusService,
        list_master_service: Optional[ListMasterService] = None,
        paid_bible_service=None,
    ):
        self.saga_id = str(uuid.uuid4())
        self.sr_id = sr_id
        self.sr_service = sr_service
        self.bp_status_service = bp_status_service
        self.list_master_service = list_master_service
        self.paid_bible_service = paid_bible_service
        self.steps_log: list = []
        self._applied_bp_override: Optional[str] = None
        self._applied_geo_extension: Optional[dict] = None
        self._applied_channel_extension: Optional[dict] = None
        self._applied_sourcing_amendment: Optional[dict] = None

    def _log_step(self, name: str, status: str, result=None, error: Optional[str] = None):
        self.steps_log.append({
            "name": name,
            "status": status,
            "result": result,
            "error": error,
            "at": _now_iso(),
        })

    def approve(self, step_index: int, actioned_by: str) -> dict:
        """
        Advance one approval step.
        On final approval, apply the SR-type-specific effect.
        """
        try:
            sr = self.sr_service.get_by_id(self.sr_id)
            if not sr:
                raise LookupError(f"SR {self.sr_id} not found")

            req = ApproveStepRequest(stepIndex=step_index, actionedBy=actioned_by)
            updated_sr = self.sr_service.approve_step(self.sr_id, req)
            self._log_step("approve_step", "completed", result={
                "stepIndex": step_index,
                "srStatus": updated_sr["status"],
            })

            if updated_sr["status"] == "approved":
                sr_type = sr.get("srType")
                if sr_type == "basepack-status-change":
                    self._apply_bp_status_change(updated_sr, actioned_by)
                elif sr_type == "geo-extension":
                    self._apply_geo_extension(sr, actioned_by)
                elif sr_type == "channel-extension":
                    self._apply_channel_extension(sr, actioned_by)
                elif sr_type == "sourcing-amendment":
                    self._apply_sourcing_amendment(sr, actioned_by)

            return self._result("completed")

        except Exception as exc:
            self._log_step("approve_step", "failed", error=str(exc))
            self._compensate()
            return self._result("compensated", error=str(exc))

    def reject(self, step_index: int, actioned_by: str, reason: str) -> dict:
        try:
            req = RejectStepRequest(stepIndex=step_index, actionedBy=actioned_by, reason=reason)
            updated_sr = self.sr_service.reject_step(self.sr_id, req)
            self._log_step("reject_step", "completed", result={
                "stepIndex": step_index,
                "reason": reason,
            })
            return self._result("completed")
        except Exception as exc:
            self._log_step("reject_step", "failed", error=str(exc))
            return self._result("failed", error=str(exc))

    # ── Effect: basepack-status-change ────────────────────────────────────────

    def _apply_bp_status_change(self, sr: dict, actioned_by: str):
        """
        On full approval of a basepack-status-change SR:
        1. Write a basepack_status_override using requestedValue (targetStatus) from the SR.
        2. Record the lifecycle date (activation / inactive / delist).
        """
        bp_id = sr.get("basepackCode") or sr.get("basepakCode")
        target_status = (
            sr.get("targetStatus")
            or sr.get("requestedValue")
            or "Active Pack"
        )

        if not bp_id:
            self._log_step("apply_bp_status_change", "skipped",
                           result={"reason": "No basepackCode on SR"})
            return

        override = InsertBasepakStatusOverride(
            bpId=bp_id,
            srId=self.sr_id,
            status=target_status,
            appliedBy=actioned_by,
        )
        self.bp_status_service.apply_override(override)
        self._applied_bp_override = bp_id
        self._log_step("apply_bp_override", "completed",
                       result={"bpId": bp_id, "status": target_status})

        # Write lifecycle date AND status history together.
        # Both are mandatory side effects of a fully-approved status-change SR.
        # If either fails the exception propagates up and marks the saga as failed.
        if self.paid_bible_service:
            effective_date = _now_iso()
            prev_status = sr.get("currentValue") or "Draft"

            self.paid_bible_service.apply_status_change_dates(
                bp_code=bp_id,
                target_status=target_status,
                effective_date=effective_date,
            )
            self._log_step("apply_lifecycle_date", "completed",
                           result={"bpId": bp_id, "targetStatus": target_status})

            self.paid_bible_service.add_status_history_entry(
                bp_code=bp_id,
                from_status=prev_status,
                to_status=target_status,
                effective_date=effective_date,
                sr_id=self.sr_id,
                actioned_by=actioned_by,
                notes=f"Approved via SR {self.sr_id}",
            )
            self._log_step("write_status_history", "completed",
                           result={"bpId": bp_id, "from": prev_status, "to": target_status})

    # ── Effect: geo-extension ─────────────────────────────────────────────────

    def _apply_geo_extension(self, sr: dict, actioned_by: str):
        cbu_id = sr.get("cbuId")
        added_geos = sr.get("addedGeos") or []
        added_depots = sr.get("addedDepots") or []
        removed_geos = sr.get("removedGeos") or []
        removed_depots = sr.get("removedDepots") or []

        if not cbu_id:
            self._log_step("apply_geo_extension", "skipped",
                           result={"reason": "No cbuId on SR"})
            return

        if not added_geos and not added_depots and not removed_geos and not removed_depots:
            self._log_step("apply_geo_extension", "skipped",
                           result={"reason": "No geos or depots to add or remove"})
            return

        if not self.list_master_service:
            self._log_step("apply_geo_extension", "skipped",
                           result={"reason": "ListMasterService not available"})
            return

        if added_geos or added_depots:
            result = self.list_master_service.merge_geo_depots(cbu_id, added_geos, added_depots)
            if not result:
                raise LookupError(f"CBU {cbu_id} not found when applying geo extension (add)")
            self._log_step("apply_geo_extension_add", "completed", result={
                "cbuId": cbu_id,
                "addedGeos": added_geos,
                "addedDepots": added_depots,
            })

        if removed_geos or removed_depots:
            result = self.list_master_service.remove_geo_depots(cbu_id, removed_geos, removed_depots)
            if not result:
                raise LookupError(f"CBU {cbu_id} not found when applying geo extension (remove)")
            self._log_step("apply_geo_extension_remove", "completed", result={
                "cbuId": cbu_id,
                "removedGeos": removed_geos,
                "removedDepots": removed_depots,
            })

        self._applied_geo_extension = {
            "cbuId": cbu_id,
            "addedGeos": added_geos,
            "addedDepots": added_depots,
            "removedGeos": removed_geos,
            "removedDepots": removed_depots,
        }
        self._log_step("apply_geo_extension", "completed", result={
            "cbuId": cbu_id,
            "addedGeos": added_geos,
            "addedDepots": added_depots,
            "removedGeos": removed_geos,
            "removedDepots": removed_depots,
        })

    # ── Effect: channel-extension ─────────────────────────────────────────────

    def _apply_channel_extension(self, sr: dict, actioned_by: str):
        cbu_id = sr.get("cbuId")
        added_channels = sr.get("addedChannels") or []

        if not cbu_id:
            self._log_step("apply_channel_extension", "skipped",
                           result={"reason": "No cbuId on SR"})
            return

        if not added_channels:
            self._log_step("apply_channel_extension", "skipped",
                           result={"reason": "No channels to add"})
            return

        if not self.list_master_service:
            self._log_step("apply_channel_extension", "skipped",
                           result={"reason": "ListMasterService not available"})
            return

        result = self.list_master_service.merge_channels(cbu_id, added_channels)
        if not result:
            raise LookupError(f"CBU {cbu_id} not found when applying channel extension")

        self._applied_channel_extension = {
            "cbuId": cbu_id,
            "addedChannels": added_channels,
        }
        self._log_step("apply_channel_extension", "completed", result={
            "cbuId": cbu_id,
            "addedChannels": added_channels,
        })

    # ── Effect: sourcing-amendment ────────────────────────────────────────────

    def _apply_sourcing_amendment(self, sr: dict, actioned_by: str):
        cbu_id = sr.get("cbuId")
        sourcing_mode = sr.get("sourcingMode")
        centralized_geos = sr.get("centralizedGeo") or []
        centralized_depots = sr.get("centralizedDepots") or []

        if not cbu_id:
            self._log_step("apply_sourcing_amendment", "skipped",
                           result={"reason": "No cbuId on SR"})
            return

        if not sourcing_mode:
            self._log_step("apply_sourcing_amendment", "skipped",
                           result={"reason": "No sourcingMode on SR"})
            return

        if not self.list_master_service:
            self._log_step("apply_sourcing_amendment", "skipped",
                           result={"reason": "ListMasterService not available"})
            return

        result = self.list_master_service.update_sourcing(
            cbu_id, sourcing_mode, centralized_geos, centralized_depots
        )
        if not result:
            raise LookupError(f"CBU {cbu_id} not found when applying sourcing amendment")

        self._applied_sourcing_amendment = {
            "cbuId": cbu_id,
            "sourcingMode": sourcing_mode,
            "centralizedGeos": centralized_geos,
            "centralizedDepots": centralized_depots,
        }
        self._log_step("apply_sourcing_amendment", "completed", result={
            "cbuId": cbu_id,
            "sourcingMode": sourcing_mode,
            "centralizedGeos": centralized_geos,
            "centralizedDepots": centralized_depots,
        })

    # ── Compensation ──────────────────────────────────────────────────────────

    def _compensate(self):
        if self._applied_bp_override:
            try:
                self.bp_status_service.revert_override(self._applied_bp_override)
                self._log_step("compensate_bp_override", "completed",
                               result={"bpId": self._applied_bp_override})
            except Exception as exc:
                self._log_step("compensate_bp_override", "failed", error=str(exc))

    def _result(self, status: str, error: Optional[str] = None) -> dict:
        return {
            "sagaId": self.saga_id,
            "sagaType": "sr-approval",
            "srId": self.sr_id,
            "status": status,
            "steps": self.steps_log,
            "error": error,
        }


def build_sr_approval_saga(
    sr_id: str,
    sr_service: ServiceRequestService,
    bp_status_service: BasepakStatusService,
    list_master_service: Optional[ListMasterService] = None,
    paid_bible_service=None,
) -> SrApprovalSaga:
    return SrApprovalSaga(
        sr_id=sr_id,
        sr_service=sr_service,
        bp_status_service=bp_status_service,
        list_master_service=list_master_service,
        paid_bible_service=paid_bible_service,
    )
