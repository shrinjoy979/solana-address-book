# Solana Address Book

A lightweight REST API for managing and validating Solana addresses, including wallet addresses, Program Derived Addresses (PDAs), and Associated Token Accounts (ATAs).

This project demonstrates address validation, signature verification, and deterministic account derivation using Solana Web3.js.

---

## Features

- Add and manage Solana addresses  
- Validate Base58 public keys  
- Detect Wallet vs PDA vs ATA  
- Derive Associated Token Accounts (ATA)  
- Verify ed25519 signatures  
- REST API with structured responses  
- In-memory data storage  

---

## Tech Stack

- Node.js  
- Express  
- TypeScript  
- @solana/web3.js  
- bs58  
- tweetnacl  
