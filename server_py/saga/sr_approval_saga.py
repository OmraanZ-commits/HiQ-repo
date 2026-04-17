"""
SR Approval Saga
Orchestrates the approval of a Service Request step-by-step.
On full approval of a "basepack-status-change" SR, it writes the status override
to the Basepack Status service.
On full approval of a "geo-extension" SR, it merges the addedGeos and addedDepots
into the CBU record permanently.
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
    ):
        self.saga_id = str(uuid.uuid4())
        self.sr_id = sr_id
        self.sr_service = sr_service
        self.bp_status_service = bp_status_service
        self.list_master_service = list_master_service
        self.steps_log: list = []
        self._applied_bp_override: Optional[str] = None  # bpId applied (for compensation)
        self._applied_geo_extension: Optional[dict] = None  # {cbuId, addedGeos, addedDepots} (for compensation)

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
        Advance one approval step. If this is the final step and the SR type is
        'basepack-status-change', also apply the basepack status override.
        If the SR type is 'geo-extension', merge the new geos/depots into the CBU record.
        Returns saga result dict.
        """
        try:
            sr = self.sr_service.get_by_id(self.sr_id)
            if not sr:
                raise LookupError(f"SR {self.sr_id} not found")

            req = ApproveStepRequest(stepIndex=step_index, actionedBy=actioned_by)
            updated_sr = self.sr_service.approve_step(self.sr_id, req)
            self._log_step("approve_step", "completed", result={"stepIndex": step_index, "srStatus": updated_sr["status"]})

            if updated_sr["status"] == "approved" and sr.get("srType") == "basepack-status-change":
                self._apply_bp_override(updated_sr, actioned_by)

            if updated_sr["status"] == "approved" and sr.get("srType") == "geo-extension":
                self._apply_geo_extension(sr, actioned_by)

            return self._result("completed")

        except Exception as exc:
            self._log_step("approve_step", "failed", error=str(exc))
            self._compensate()
            return self._result("compensated", error=str(exc))

    def reject(self, step_index: int, actioned_by: str, reason: str) -> dict:
        try:
            req = RejectStepRequest(stepIndex=step_index, actionedBy=actioned_by, reason=reason)
            updated_sr = self.sr_service.reject_step(self.sr_id, req)
            self._log_step("reject_step", "completed", result={"stepIndex": step_index, "reason": reason})
            return self._result("completed")
        except Exception as exc:
            self._log_step("reject_step", "failed", error=str(exc))
            return self._result("failed", error=str(exc))

    def _apply_bp_override(self, sr: dict, actioned_by: str):
        bp_id = sr.get("basepakCode")
        new_status = "Basepack Status Changed"
        if not bp_id:
            self._log_step("apply_bp_override", "skipped", result={"reason": "No basepakCode on SR"})
            return

        override = InsertBasepakStatusOverride(
            bpId=bp_id,
            srId=self.sr_id,
            status=new_status,
            appliedBy=actioned_by,
        )
        self.bp_status_service.apply_override(override)
        self._applied_bp_override = bp_id
        self._log_step("apply_bp_override", "completed", result={"bpId": bp_id, "status": new_status})

    def _apply_geo_extension(self, sr: dict, actioned_by: str):
        cbu_id = sr.get("cbuId")
        added_geos = sr.get("addedGeos") or []
        added_depots = sr.get("addedDepots") or []

        if not cbu_id:
            self._log_step("apply_geo_extension", "skipped", result={"reason": "No cbuId on SR"})
            return

        if not added_geos and not added_depots:
            self._log_step("apply_geo_extension", "skipped", result={"reason": "No geos or depots to add"})
            return

        if not self.list_master_service:
            self._log_step("apply_geo_extension", "skipped", result={"reason": "ListMasterService not available"})
            return

        result = self.list_master_service.merge_geo_depots(cbu_id, added_geos, added_depots)
        if not result:
            raise LookupError(f"CBU {cbu_id} not found when applying geo extension")

        self._applied_geo_extension = {"cbuId": cbu_id, "addedGeos": added_geos, "addedDepots": added_depots}
        self._log_step("apply_geo_extension", "completed", result={
            "cbuId": cbu_id,
            "addedGeos": added_geos,
            "addedDepots": added_depots,
        })

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
) -> SrApprovalSaga:
    return SrApprovalSaga(
        sr_id=sr_id,
        sr_service=sr_service,
        bp_status_service=bp_status_service,
        list_master_service=list_master_service,
    )
