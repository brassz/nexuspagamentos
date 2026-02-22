/**
 * Gerador de payload PIX EMV com valor dinâmico e CRC16-CCITT
 * Base: 00020126360014br.gov.bcb.pix0114+55139920569575204000053039865802BR5925BRUNO FELIPE ASSONI DA SI6014RIO DE JANEIRO62070503***6304
 */

function crc16ccitt(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ polynomial : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Insere o valor (campo 54) no payload PIX EMV
 * Formato campo 54: 54 + 2 dígitos tamanho + valor com 2 casas decimais
 */
export function buildPixPayload(amount: number): string {
  const pixKey = process.env.PIX_KEY || '+5513992056957520';
  const merchantName = process.env.PIX_MERCHANT_NAME || 'BRUNO FELIPE ASSONI DA SI';
  const merchantCity = process.env.PIX_MERCHANT_CITY || 'RIO DE JANEIRO';

  const valueStr = amount.toFixed(2);
  const field54 = '54' + valueStr.length.toString().padStart(2, '0') + valueStr;

  // Base: 00 02 01, 26 36..., 52 04 0000, 53 03 986, [54 valor], 58 02 BR, 59 25 nome, 60 14 cidade, 62 07 05 03 ***
  // Inserir campo 54 após 53 (5303986) e antes de 58 (5802BR)
  const before54 = '00020126360014br.gov.bcb.pix0114' + pixKey.length.toString().padStart(2, '0') + pixKey + '520400005303986';
  const after54 = '5802BR59' + merchantName.length.toString().padStart(2, '0') + merchantName +
    '60' + merchantCity.length.toString().padStart(2, '0') + merchantCity + '62070503***';
  const payloadWithValue = before54 + field54 + after54;

  const payloadNoCrc = payloadWithValue + '6304';
  const crc = crc16ccitt(payloadNoCrc);
  return payloadNoCrc + crc;
}
