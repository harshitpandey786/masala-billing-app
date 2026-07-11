/**
 * Paste this into the Apps Script editor bound to the billing spreadsheet
 * (Extensions -> Apps Script from within the sheet), then deploy as a Web App.
 * See google-sheets-setup.md in this folder for the full walkthrough.
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // Sent as a url-encoded form field (not a raw JSON body) -- Google's Web App
  // proxy unpredictably 404s on POST bodies that start with "{", form-encoded
  // bodies don't have that problem.
  var payload = JSON.parse(e.parameter.payload);
  var rows = payload.rows || [];

  rows.forEach(function (row) {
    sheet.appendRow([
      row.timestamp,
      row.date,
      row.customerName,
      row.phone,
      row.area,
      row.pocName,
      row.billingMode,
      row.store,
      row.masalaType,
      row.quantityKg,
      row.ingredientsSubtotal,
      row.makingCharge,
      row.total,
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', rowsAdded: rows.length })).setMimeType(
    ContentService.MimeType.JSON
  );
}
