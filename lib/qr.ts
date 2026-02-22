import QRCode from 'qrcode';

export async function generateQRCodeBase64(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { type: 'image/png', width: 256, margin: 2 });
}
