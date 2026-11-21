import assert from "node:assert/strict";
import test from "node:test";
import { createPdf, pdfResponse } from "../../src/server/pdf";

test("receipt accepts merged headings and produces a downloadable PDF", async () => {
  const { doc, table } = await createPdf("Phiếu hẹn khám", "VC-000042 · Khám tổng quát");
  table([{ content: "Thông tin lịch hẹn", colSpan: 2 }], [
    ["Người khám bệnh", "Nguyễn Thị Ánh"],
    ["Thời lượng", 30],
  ]);
  assert.equal(doc.getNumberOfPages(), 1);
  const response = pdfResponse(doc, "Phieu-hen-VC-000042", new Date("2030-01-01T00:00:00Z"));
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="Phieu-hen-VC-000042.pdf"');
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
});

test("a long report paginates and allows another table afterward", async () => {
  const { doc, table } = await createPdf("Báo cáo lịch hẹn", "Toàn bộ phòng khám", true);
  table(["Mã lịch hẹn", "Dịch vụ", "Số lịch"], Array.from({ length: 150 }, (_, index) => [
    `VC-${index + 1}`, "Khám tổng quát và tư vấn sức khỏe", index + 1,
  ]));
  const pages = doc.getNumberOfPages();
  assert.ok(pages > 1);
  table(["Tổng cộng"], [[150]]);
  assert.ok(doc.getNumberOfPages() >= pages);
  const response = pdfResponse(doc, "Bao-cao", new Date("2030-01-01T00:00:00Z"));
  assert.ok((await response.arrayBuffer()).byteLength > 1000);
});
