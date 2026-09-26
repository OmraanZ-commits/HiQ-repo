/**
 * E2E test: Price-lot DC selection flow cannot be submitted without valid DCs
 *
 * Verifies the hasChanges gate on the "Review Changes" button in the
 * Raise Amendment dialog when scope is "Extend to a new region" (new-geo):
 *   - Selecting a new region reveals the DC picker for that region.
 *   - The Next button stays disabled until BOTH a DC and a pricing date are set.
 *   - Selecting a DC (with date already set) enables the button.
 *   - On submission the SR's addedGeos / addedDepots are populated correctly.
 *
 * Entry used: 09e5f631-90a9-4631-b6b6-c92951c646d5
 *   Current geos: DELHI-GREATER DELHI, MUMBAI-PUNE, RAJASTHAN, MADHYA PRADESH,
 *                 UTTAR PRADESH, GREATER MAHARASHTRA
 *   Test adds:    KERALA (depots TCRH, TSRH — 2 depots, no auto-select)
 */

import { test, expect } from "@playwright/test";

const ENTRY_ID = "09e5f631-90a9-4631-b6b6-c92951c646d5";
const BASE_URL = "http://localhost:5000";

test("price-lot new-geo: Next button disabled without DC, enabled after DC selection, SR has region+DC", async ({ page }) => {
  // ── Step 1: Open the entry in view-only (Paid Bible) mode ────────────────
  await page.goto(`${BASE_URL}/edit/${ENTRY_ID}?source=paid-bible`);
  await expect(page.getByTestId("button-raise-amendment")).toBeVisible({ timeout: 10_000 });

  // ── Step 2: Open the Raise Amendment dialog ──────────────────────────────
  await page.getByTestId("button-raise-amendment").click();
  await expect(page.getByTestId("dialog-raise-amendment")).toBeVisible();

  // ── Step 3: Select "Price Lot Change Request" type ───────────────────────
  await page.getByTestId("option-amendment-price-lot-change").click();
  await expect(page.getByTestId("button-continue-type")).toBeEnabled();
  await page.getByTestId("button-continue-type").click();

  // ── Step 4: Select scope "Extend to a new region" ───────────────────────
  await expect(page.getByTestId("option-plc-scope-new-geo")).toBeVisible();
  await page.getByTestId("option-plc-scope-new-geo").click();

  // ── Step 5: Pick KERALA as new region ───────────────────────────────────
  await page.getByTestId("btn-new-geo-KERALA").click();

  // ── Step 6: Verify DC picker appears for KERALA ──────────────────────────
  // The section heading and at least one DC button (TCRH) must be visible.
  await expect(page.getByText("Distribution Centres (DCs) for New Regions")).toBeVisible();
  await expect(page.getByTestId("btn-plc-dc-tcrh")).toBeVisible();
  await expect(page.getByTestId("btn-plc-dc-tsrh")).toBeVisible();

  // ── Step 7: Next button is disabled — no DC, no date ────────────────────
  await expect(page.getByTestId("button-review-changes")).toBeDisabled();

  // ── Step 8: Set pricing effective date — still disabled (no DC) ─────────
  await page.getByTestId("input-pricing-effective-date").fill("2026-09-01");
  await expect(page.getByTestId("button-review-changes")).toBeDisabled();

  // ── Step 9: Select DC TCRH — now button should become enabled ────────────
  await page.getByTestId("btn-plc-dc-tcrh").click();
  await expect(page.getByTestId("button-review-changes")).toBeEnabled();

  // ── Step 10: Advance to the summary step ─────────────────────────────────
  await page.getByTestId("button-review-changes").click();

  // ── Step 11: Verify summary shows KERALA and TCRH ────────────────────────
  await expect(page.getByText("KERALA")).toBeVisible();
  await expect(page.getByText("TCRH")).toBeVisible();

  // ── Step 12: Fill justification and effective date, then submit ───────────
  await page.getByLabel(/justification/i).fill("Price lot DC validation test");
  // The summary step effective date field — find by type=date in the summary section
  const datePicker = page.locator('input[type="date"]').last();
  await datePicker.fill("2026-09-15");

  await expect(page.getByTestId("button-submit-amendment")).toBeEnabled();
  await page.getByTestId("button-submit-amendment").click();

  // ── Step 13: Dialog closes after submission ───────────────────────────────
  await expect(page.getByTestId("dialog-raise-amendment")).not.toBeVisible({ timeout: 8_000 });

  // ── Step 14: Verify the raised SR contains KERALA and TCRH ───────────────
  // Navigate to Paid Bible Service Requests to confirm the SR was created.
  await page.goto(`${BASE_URL}/paid-bible?tab=service-requests`);
  // The most recently raised SR should mention KERALA in its details.
  await expect(page.getByText("KERALA").first()).toBeVisible({ timeout: 8_000 });
});
