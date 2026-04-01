import express from "express";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const app = express();
app.use(express.json());

type ContactType = "wallet" | "pda";

type Contact = {
  id: number;
  name: string;
  address: string;
  type: ContactType;
  createdAt: string;
};

const contacts: Contact[] = [];
let nextId = 1;

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const parsePublicKey = (value: unknown): PublicKey | null => {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const decoded = bs58.decode(value);
    if (decoded.length !== 32) return null;
    return new PublicKey(decoded);
  } catch {
    return null;
  }
};

const getContactById = (idParam: string): Contact | undefined => {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return undefined;
  return contacts.find((contact) => contact.id === id);
};

app.post("/api/contacts", (req, res) => {
  const { name, address } = req.body ?? {};

  if (typeof name !== "string" || name.trim() === "" || typeof address !== "string" || address.trim() === "") {
    return res.status(400).json({ error: "Invalid input" });
  }

  const pubkey = parsePublicKey(address);
  if (!pubkey) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const exists = contacts.some((contact) => contact.address === address);
  if (exists) {
    return res.status(409).json({ error: "Address already exists" });
  }

  const type: ContactType = PublicKey.isOnCurve(pubkey.toBytes()) ? "wallet" : "pda";

  const contact: Contact = {
    id: nextId++,
    name: name.trim(),
    address,
    type,
    createdAt: new Date().toISOString(),
  };

  contacts.push(contact);
  return res.status(201).json(contact);
});

app.get("/api/contacts", (req, res) => {
  const { type } = req.query;

  let result = [...contacts].sort((a, b) => a.id - b.id);

  if (type === "wallet" || type === "pda") {
    result = result.filter((contact) => contact.type === type);
  }

  return res.status(200).json(result);
});

app.get("/api/contacts/:id", (req, res) => {
  const contact = getContactById(req.params.id);

  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  return res.status(200).json(contact);
});

app.put("/api/contacts/:id", (req, res) => {
  const contact = getContactById(req.params.id);

  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const { name } = req.body ?? {};

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Missing name" });
  }

  contact.name = name.trim();
  return res.status(200).json(contact);
});

app.delete("/api/contacts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const index = contacts.findIndex((contact) => contact.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Contact not found" });
  }

  contacts.splice(index, 1);
  return res.status(200).json({ message: "Contact deleted" });
});

app.post("/api/contacts/:id/derive-ata", (req, res) => {
  const contact = getContactById(req.params.id);

  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const { mintAddress } = req.body ?? {};
  const mintPubkey = parsePublicKey(mintAddress);

  if (!mintPubkey) {
    return res.status(400).json({ error: "Invalid mint address" });
  }

  const ownerPubkey = new PublicKey(contact.address);
  const [ata] = PublicKey.findProgramAddressSync(
    [ownerPubkey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return res.status(200).json({
    ata: ata.toBase58(),
    owner: ownerPubkey.toBase58(),
    mint: mintPubkey.toBase58(),
  });
});

app.post("/api/verify-ownership", (req, res) => {
  const { address, message, signature } = req.body ?? {};

  if (
    typeof address !== "string" ||
    address.trim() === "" ||
    typeof message !== "string" ||
    typeof signature !== "string" ||
    signature.trim() === ""
  ) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const pubkey = parsePublicKey(address);
  if (!pubkey) {
    return res.status(400).json({ error: "Invalid input" });
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = bs58.decode(signature);
  } catch {
    return res.status(400).json({ error: "Invalid input" });
  }

  const messageBytes = Buffer.from(message, "utf8");
  const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, pubkey.toBytes());

  return res.status(200).json({ valid });
});

app.post("/api/derive-pda", (req, res) => {
  const { programId, seeds } = req.body ?? {};

  const programPubkey = parsePublicKey(programId);

  if (!programPubkey || !Array.isArray(seeds)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const seedBuffers: Buffer[] = [];

  for (const seed of seeds) {
    if (typeof seed !== "string") {
      return res.status(400).json({ error: "Invalid input" });
    }
    const buffer = Buffer.from(seed, "utf8");
    if (buffer.length > 32) {
      return res.status(400).json({ error: "Invalid input" });
    }
    seedBuffers.push(buffer);
  }

  const [pda, bump] = PublicKey.findProgramAddressSync(seedBuffers, programPubkey);

  return res.status(200).json({
    pda: pda.toBase58(),
    bump,
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});


