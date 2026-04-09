import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function AmendmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate(`/paid-bible/requests/${id}`, { replace: true });
  }, [id, navigate]);

  return null;
}
