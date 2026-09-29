import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomerOrderingMaster } from "./customer-ordering-master";
import { customerOrderingSample } from "./customer-ordering-sample";

test("supplied sample sources produce four consolidated rows with text IDs and pivoted licenses", () => {
  const rows = buildCustomerOrderingMaster(customerOrderingSample);
  assert.deepEqual(rows.map(row => row.customer), ["0000100003", "0000100006", "0000101024", "0000101075"]);
  assert.equal(rows[0].vendorCode, "0025010452");
  assert.equal(rows[0].licenseFDL, "0000010615");
  assert.equal(rows[0].license20B, null);
  assert.equal(rows[1].shippingPoint, "BND");
  assert.equal(rows[2].roundingProfile, "ZRR4");
  assert.equal(rows[2].license20B, "0000013624");
  assert.equal(rows[2].license21BExpiry, "31-Dec-2026");
  assert.equal(rows[2].licenseFDL, "0000010533");
  assert.equal(rows[3].licenseFDLExpiry, "11-Dec-2029");
});

test("joins by the specified keys and pivots licenses without multiplying customer rows", () => {
  const rows = buildCustomerOrderingMaster({
    customerDepots: [
      { customerCode: "0000101024", depot: "PATH" },
      { customerCode: "0000101024", depot: "PATH" },
      { customerCode: "0000100003", depot: "ABDH" },
    ],
    vendors: [
      { customerCode: "0000101024", depot: "PATH", vendorCode: "0025016777" },
      { customerCode: "0000101024", depot: "ABDH", vendorCode: "WRONG-DEPOT" },
    ],
    poValidity: [{ customerCode: "0000101024", validity: "7", leadTime: "3", roundingProfile: "ZRR4" }],
    pdp: [{ customerCode: "0000101024", tsId: "CLOSED", shippingPoint: "PAT" }],
    licenses: [
      { customerCode: "0000101024", type: "20B", licenseNo: "0000013624", status: "C", endDate: "31-Dec-2026" },
      { customerCode: "0000101024", type: "21B", licenseNo: "0000013239", status: "C", endDate: "31-Dec-2026" },
      { customerCode: "0000101024", type: "FDL", licenseNo: "0000010533", status: "C", endDate: "10-Dec-2027" },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].customer, "0000100003");
  assert.equal(rows[0].vendorCode, null);
  assert.deepEqual(rows[1], {
    customer: "0000101024", depot: "PATH", vendorCode: "0025016777",
    poValidity: "7", leadTime: "3", roundingProfile: "ZRR4",
    tsId: "CLOSED", shippingPoint: "PAT",
    license20B: "0000013624", license20BExpiry: "31-Dec-2026",
    license21B: "0000013239", license21BExpiry: "31-Dec-2026",
    licenseFDL: "0000010533", licenseFDLExpiry: "10-Dec-2027",
  });
});

test("prefers current licenses, then the latest end date within the same priority", () => {
  const [row] = buildCustomerOrderingMaster({
    customerDepots: [{ customerCode: "00001", depot: "ABDH" }],
    licenses: [
      { customerCode: "00001", type: "20B", licenseNo: "old", status: "C", endDate: "2025-01-01" },
      { customerCode: "00001", type: "20B", licenseNo: "inactive-later", status: "E", endDate: "2030-01-01" },
      { customerCode: "00001", type: "20B", licenseNo: "latest-current", status: "C", endDate: "2027-01-01" },
      { customerCode: "00001", type: "21B", licenseNo: "latest-inactive", status: "E", endDate: "2028-01-01" },
      { customerCode: "00001", type: "21B", licenseNo: "older-inactive", status: "X", endDate: "2026-01-01" },
    ],
  });
  assert.equal(row.license20B, "latest-current");
  assert.equal(row.license21B, "latest-inactive");
});

test("keeps one row when a customer has several depots and avoids ambiguous source joins", () => {
  const [row] = buildCustomerOrderingMaster({
    customerDepots: [{ customerCode: "00001", depot: "BNDH" }, { customerCode: "00001", depot: "ABDH" }],
    vendors: [{ customerCode: "00001", depot: "ABDH", vendorCode: "00002" }],
  });
  assert.equal(row.depot, "ABDH, BNDH");
  assert.equal(row.vendorCode, "ABDH: 00002");
  assert.throws(() => buildCustomerOrderingMaster({
    customerDepots: [{ customerCode: "00001", depot: "ABDH" }],
    poValidity: [
      { customerCode: "00001", validity: "7", leadTime: null, roundingProfile: null },
      { customerCode: "00001", validity: "8", leadTime: null, roundingProfile: null },
    ],
  }), /Conflicting PO validity/);
});