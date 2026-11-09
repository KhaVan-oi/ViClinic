import assert from "node:assert/strict";
import test from "node:test";
import { reportFilterSchema } from "../src/modules/reports/contracts";

test("reports accept a single day and default to daily grouping", () => {
  assert.equal(reportFilterSchema.parse({fromDate: "2030-01-01", toDate: "2030-01-01"}).period, "DAY");
});

test("reports reject reversed ranges and invalid calendar dates", () => {
  for (const input of [
    {fromDate: "2030-01-02", toDate: "2030-01-01"},
    {fromDate: "2030-02-29", toDate: "2030-03-01"},
    {fromDate: "invalid", toDate: "2030-03-01"},
  ]) assert.equal(reportFilterSchema.safeParse(input).success, false);
});

test("report grouping accepts day, week, month, quarter and rejects unknown values", () => {
  const range = {fromDate: "2030-01-01", toDate: "2030-12-31"};
  for (const period of ["DAY","WEEK","MONTH","QUARTER"]) assert.equal(reportFilterSchema.safeParse({...range,period}).success, true);
  assert.equal(reportFilterSchema.safeParse({...range,period: "YEAR"}).success, false);
  assert.equal(reportFilterSchema.safeParse({...range,doctorId: -1}).success, false);
});
