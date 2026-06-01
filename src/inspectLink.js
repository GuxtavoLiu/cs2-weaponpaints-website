// Offline decoder for CS2 "masked" inspect links
// (steam://run/730//+csgo_econ_action_preview <hex>).
//
// Two on-wire variants are supported, both fully offline:
//  - wrapped:  buffer[0] === 0, layout is [0x00][protobuf][crc32-be]
//  - masked:   buffer[0] !== 0, the whole buffer is XOR'd with buffer[0];
//              after un-masking it becomes the wrapped layout above.
//
// Unmasked links (the S/M..A..D pointer form copied from inventory/market)
// carry no item data in the link itself and would need the Steam Game
// Coordinator to resolve — those are rejected here.
//
// The payload is a CEconItemPreviewDataBlock protobuf. We hand-parse just the
// fields we need so the site keeps zero extra dependencies.

// Minimal protobuf reader. Returns a list of [fieldNumber, wireType, value].
// value is: BigInt for varint/fixed64, Number for fixed32, Buffer for len-delim.
function parseProto(b) {
  let p = 0;
  const out = [];
  const varint = () => {
    let shift = 0n;
    let result = 0n;
    while (true) {
      if (p >= b.length) throw new Error("protobuf: truncated varint");
      const byte = b[p++];
      result |= BigInt(byte & 0x7f) << shift;
      if (!(byte & 0x80)) break;
      shift += 7n;
      if (shift > 70n) throw new Error("protobuf: varint too long");
    }
    return result;
  };
  while (p < b.length) {
    const key = Number(varint());
    const field = key >> 3;
    const wire = key & 7;
    if (field === 0) throw new Error("protobuf: invalid field 0");
    if (wire === 0) {
      out.push([field, wire, varint()]);
    } else if (wire === 2) {
      const len = Number(varint());
      if (p + len > b.length) throw new Error("protobuf: truncated length-delimited");
      out.push([field, wire, b.slice(p, p + len)]);
      p += len;
    } else if (wire === 5) {
      out.push([field, wire, b.readUInt32LE(p)]);
      p += 4;
    } else if (wire === 1) {
      out.push([field, wire, b.readBigUInt64LE(p)]);
      p += 8;
    } else {
      throw new Error("protobuf: unsupported wire type " + wire);
    }
  }
  return out;
}

const u32ToFloat = (u) => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(u >>> 0);
  return buf.readFloatLE(0);
};

// Pull the hex blob out of whatever the user pasted (full steam:// link,
// "+csgo_econ_action_preview <hex>", or a bare hex string).
function extractHex(input) {
  let s = String(input || "").trim();
  try { s = decodeURIComponent(s); } catch (_) { /* leave as-is */ }
  const m = s.match(/csgo_econ_action_preview[\s]+([0-9A-Fa-f]+)/);
  if (m) return m[1];
  if (/^[0-9A-Fa-f]+$/.test(s) && s.length % 2 === 0) return s; // bare hex
  // Unmasked pointer links (contain S/M..A..D and a steamid/assetid) can't be
  // decoded offline.
  if (/csgo_econ_action_preview[\s]+[SM]\d+A\d+D\d+/i.test(s)) {
    throw new Error("UNMASKED_LINK");
  }
  throw new Error("INVALID_LINK");
}

// Decode an inspect link/hex into the fields we persist.
// Returns: { defindex, paintindex, wear, seed, stattrak, nametag, stickers: [{slot, id, wear, scale, rotation, offX, offY}] }
function decodeInspectLink(input) {
  const hex = extractHex(input);
  let buf = Buffer.from(hex, "hex");
  if (buf.length < 6) throw new Error("INVALID_LINK");

  if (buf[0] !== 0) {
    const key = buf[0];
    buf = Buffer.from(buf.map((x) => x ^ key)); // XOR-unmask
  }
  if (buf[0] !== 0) throw new Error("INVALID_LINK");

  const payload = buf.slice(1, buf.length - 4); // strip leading 0x00 + trailing crc
  const fields = parseProto(payload);

  const item = { stickers: [] };
  for (const [field, wire, value] of fields) {
    switch (field) {
      case 3: item.defindex = Number(value); break;
      case 4: item.paintindex = Number(value); break;
      case 7: item.wear = u32ToFloat(Number(value)); break; // paintwear (float bits)
      case 8: item.seed = Number(value); break;             // paintseed
      case 9: item.stattrak = true; break;                  // killeaterscoretype present
      case 11: if (wire === 2) item.nametag = value.toString("utf8"); break;
      case 12: { // Sticker
        const sub = parseProto(value);
        const st = { slot: 0, id: 0, wear: 0, scale: 0, rotation: 0, offX: 0, offY: 0 };
        for (const [sf, sw, sv] of sub) {
          if (sf === 1) st.slot = Number(sv);
          else if (sf === 2) st.id = Number(sv);
          else if (sf === 3 && sw === 5) st.wear = u32ToFloat(sv);
          else if (sf === 4 && sw === 5) st.scale = u32ToFloat(sv);
          else if (sf === 5 && sw === 5) st.rotation = u32ToFloat(sv);
          else if (sf === 7 && sw === 5) st.offX = u32ToFloat(sv);
          else if (sf === 8 && sw === 5) st.offY = u32ToFloat(sv);
        }
        if (st.id > 0) item.stickers.push(st);
        break;
      }
      default: break;
    }
  }

  if (!Number.isFinite(item.defindex)) throw new Error("INVALID_LINK");
  return item;
}

module.exports = { decodeInspectLink };
