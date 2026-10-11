/** QR codes as inline SVG (printable invitations, table finder at the venue). */
import qrcode from 'qrcode-generator';

export function qrSvg(text: string, size = 160): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" role="img" aria-label="Codice QR" `);
}
