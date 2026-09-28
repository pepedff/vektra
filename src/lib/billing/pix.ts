/** PIX "copia e cola" estático (BR Code / EMV MPM), conforme o Manual de Padrões para Iniciação do PIX do BACEN. */

export type PixInput = {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents?: number;
  txid?: string;
};

const TXID_PATTERN = /^[A-Za-z0-9]{1,25}$/;

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string): string {
  if (value.length > 99) throw new Error(`Campo PIX ${id} excede 99 caracteres`);
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function sanitize(value: string, max: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

export function buildPixPayload(input: PixInput): string {
  const key = input.key.trim();
  if (!key) throw new Error("Chave PIX não configurada");
  if (input.txid !== undefined && !TXID_PATTERN.test(input.txid)) throw new Error("txid inválido");
  if (input.amountCents !== undefined && (!Number.isInteger(input.amountCents) || input.amountCents <= 0)) {
    throw new Error("Valor do PIX deve ser positivo");
  }

  const name = sanitize(input.merchantName, 25);
  const city = sanitize(input.merchantCity, 15);
  if (!name || !city) throw new Error("Nome e cidade do recebedor são obrigatórios");

  const body = [
    field("00", "01"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", key)),
    field("52", "0000"),
    field("53", "986"),
    input.amountCents !== undefined ? field("54", (input.amountCents / 100).toFixed(2)) : "",
    field("58", "BR"),
    field("59", name),
    field("60", city),
    field("62", field("05", input.txid ?? "***")),
    "6304",
  ].join("");

  return body + crc16(body);
}
