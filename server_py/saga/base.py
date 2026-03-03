import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Any, Optional

from server_py.db import SessionLocal, SagaLogModel


@dataclass
class SagaStep:
    name: str
    execute_fn: Callable[..., Any]
    compensate_fn: Optional[Callable[..., Any]] = None


@dataclass
class StepResult:
    name: str
    status: str = "pending"
    result: Any = None
    error: Optional[str] = None
    compensated: bool = False


class SagaOrchestrator:
    def __init__(self, saga_type: str, entry_id: str, steps: list[SagaStep]):
        self.saga_id = str(uuid.uuid4())
        self.saga_type = saga_type
        self.entry_id = entry_id
        self.steps = steps
        self.step_results: list[StepResult] = [StepResult(name=s.name) for s in steps]
        self.status = "pending"
        self.error: Optional[str] = None

    def _persist(self):
        db = SessionLocal()
        try:
            row = db.query(SagaLogModel).filter(SagaLogModel.id == self.saga_id).first()
            steps_data = [
                {
                    "name": sr.name,
                    "status": sr.status,
                    "result": sr.result if isinstance(sr.result, (dict, list, str, int, float, bool, type(None))) else str(sr.result),
                    "error": sr.error,
                    "compensated": sr.compensated,
                }
                for sr in self.step_results
            ]
            if row:
                row.status = self.status
                row.steps = steps_data
                row.error = self.error
                if self.status in ("completed", "failed", "compensated"):
                    row.completed_at = datetime.now(timezone.utc)
            else:
                row = SagaLogModel(
                    id=self.saga_id,
                    saga_type=self.saga_type,
                    entry_id=self.entry_id,
                    status=self.status,
                    steps=steps_data,
                    started_at=datetime.now(timezone.utc),
                    error=self.error,
                )
                db.add(row)
            db.commit()
        finally:
            db.close()

    def execute(self, context: dict) -> dict:
        self.status = "running"
        self._persist()

        completed_indices: list[int] = []

        for i, step in enumerate(self.steps):
            self.step_results[i].status = "running"
            self._persist()

            try:
                result = step.execute_fn(context)
                self.step_results[i].status = "completed"
                self.step_results[i].result = result
                completed_indices.append(i)

                if isinstance(result, dict):
                    context.update(result)

                self._persist()

            except Exception as e:
                self.step_results[i].status = "failed"
                self.step_results[i].error = str(e)
                self.error = f"Step '{step.name}' failed: {str(e)}"
                self.status = "compensating"
                self._persist()

                self._compensate(completed_indices, context)
                return self._build_result()

        self.status = "completed"
        self._persist()
        return self._build_result()

    def _compensate(self, completed_indices: list[int], context: dict):
        for i in reversed(completed_indices):
            step = self.steps[i]
            if step.compensate_fn:
                try:
                    step.compensate_fn(context)
                    self.step_results[i].compensated = True
                except Exception as e:
                    self.step_results[i].error = (
                        (self.step_results[i].error or "") +
                        f" | Compensation failed: {str(e)}"
                    )
                self._persist()

        self.status = "compensated"
        self._persist()

    def _build_result(self) -> dict:
        return {
            "sagaId": self.saga_id,
            "sagaType": self.saga_type,
            "entryId": self.entry_id,
            "status": self.status,
            "error": self.error,
            "steps": [
                {
                    "name": sr.name,
                    "status": sr.status,
                    "result": sr.result if isinstance(sr.result, (dict, list, str, int, float, bool, type(None))) else str(sr.result),
                    "error": sr.error,
                    "compensated": sr.compensated,
                }
                for sr in self.step_results
            ],
        }
