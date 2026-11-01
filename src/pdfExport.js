import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 8;

/**
 * Renders a DOM node to a multi-page A4 PDF, for printing a bill rather than
 * just sharing it as an image. Reuses the same html2canvas snapshot approach
 * as the WhatsApp image share so the PDF matches what's on screen exactly,
 * just paginated to fit standard paper.
 */
export async function nodeToPdfBlob(node) {
  const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 });

  const usableWidthMm = A4_WIDTH_MM - MARGIN_MM * 2;
  const usableHeightMm = A4_HEIGHT_MM - MARGIN_MM * 2;
  const pxPerMm = canvas.width / usableWidthMm;
  const pageHeightPx = usableHeightMm * pxPerMm;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let renderedPx = 0;
  let pageIndex = 0;

  while (renderedPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const imgData = pageCanvas.toDataURL('image/png');
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, usableWidthMm, sliceHeightPx / pxPerMm);

    renderedPx += sliceHeightPx;
    pageIndex += 1;
  }

  return pdf.output('blob');
}
