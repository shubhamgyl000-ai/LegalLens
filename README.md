# LegalLens

## Smart India Hackathon 2026

LegalLens is an AI-assisted packaged commodity compliance
screening prototype.

It combines:

- Product image capture
- OCR
- Declaration detection
- Rule engine
- USP verification
- Evidence reporting
- Human review

## Workflow

SCAN
↓
OCR
↓
VERIFY
↓
REPORT

## Features

### 1. Smart Capture

Users can upload a packaged product label.

### 2. OCR

The intended production architecture uses:

YOLO + PaddleOCR

to detect declaration regions and extract text.

### 3. Rule Engine

Extracted declarations are evaluated against
versioned compliance rules.

### 4. USP Verification

Prototype calculation:

Expected USP = MRP / normalized quantity

The result is rounded to two decimal places.

### 5. Evidence Report

The report displays:

- Product
- MRP
- Net quantity
- Manufacturer
- Expected USP
- Printed USP
- Compliance checks

## Important

This repository contains a frontend demonstration.

The current browser prototype uses manually entered
demo data for the verification engine.

A production version should connect:

Frontend
↓
API
↓
YOLO
↓
PaddleOCR
↓
Rule Engine
↓
PostgreSQL/Object Storage
↓
Evidence Report

## Suggested Stack

Frontend:
React PWA

Backend:
FastAPI

Computer Vision:
YOLO

OCR:
PaddleOCR

Database:
PostgreSQL

Storage:
Object Storage

## Disclaimer

LegalLens is an AI-assisted screening system.

It does NOT provide a final legal verdict.

Low-confidence or potentially non-compliant results
should be reviewed by an authorized human officer.
