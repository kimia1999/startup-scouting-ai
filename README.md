# Startup Scouting AI

An automated tool for scouting European startup accelerators and their portfolio startups using Google Sheets, Apps Script, and OpenAI API. Features self-correcting URL verification, relationship proof tracking, and source citations.

## Live Demo

**Google Sheet:** [Startup Scouting AI - Live Data](https://docs.google.com/spreadsheets/d/1inBbXRV6wvGEU6k5n6DvGHsVW7GhkcGL_4weanKSOHk/edit?usp=sharing)

**GitHub Repository:** [github.com/kimia1999/startup-scouting-ai](https://github.com/kimia1999/startup-scouting-ai)

## Features

### Core Features
- **Scout Accelerators:** Discovers European startup accelerators using AI with two-step verification
- **Find Startups:** Extracts portfolio startups from each accelerator with proof of relationship
- **Generate Value Propositions:** Creates standardized value propositions with source citations
- **URL Verification:** Validates all discovered URLs are reachable
- **Self-Correction:** Automatically attempts to find correct URLs when initial ones fail

### Data Quality Features
- **Duplicate Prevention:** Uses URL normalization and name matching to prevent duplicates
- **Relationship Proof:** Documents how each startup is connected to its accelerator
- **Value Source:** Explains what information was used to generate each value proposition
- **Resume Capability:** Functions can be re-run after timeout and will continue where they left off

## Sheet Structure

### accelerators
| Column | Field | Description |
|--------|-------|-------------|
| A | website | Accelerator URL (primary key) |
| B | name | Accelerator name |
| C | country | Country of operation |
| D | verified | URL validation status (YES/NO) |
| E | source | How URL was obtained (AI generated / AI corrected) |

### startups
| Column | Field | Description |
|--------|-------|-------------|
| A | website | Startup URL (primary key) |
| B | name | Startup name |
| C | country | Country of origin |
| D | accelerator | Reference to accelerator URL |
| E | value_proposition | Generated value proposition |
| F | verified | URL validation status (YES/NO) |
| G | relationship_proof | Evidence of accelerator-startup connection |
| H | value_source | Information source for value proposition |

## Setup Instructions

### Prerequisites
- Google Account
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))
- Node.js (for clasp)

### Step 1: Clone the Repository

```bash
git clone https://github.com/kimia1999/startup-scouting-ai.git
cd startup-scouting-ai
```

### Step 2: Install and Setup clasp

```bash
npm install -g @google/clasp
clasp login
```

Enable Apps Script API at: https://script.google.com/home/usersettings

### Step 3: Create Google Sheet

1. Create a new Google Sheet
2. Create two tabs: `accelerators` and `startups`
3. Add headers as shown in Sheet Structure above

### Step 4: Deploy Code to Apps Script

Option A - Clone existing project:
```bash
clasp clone <SCRIPT_ID>
```

Option B - Create new project:
```bash
clasp create --type sheets --title "Startup Scouting AI"
clasp push
```

### Step 5: Configure API Key

1. In Google Sheet, go to Extensions → Apps Script
2. Click Project Settings (gear icon)
3. Scroll to "Script Properties"
4. Add property:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

### Step 6: Run the Tool

1. Refresh the Google Sheet
2. New menu appears: "Startup Scouting AI"
3. Run functions in order:
   - **1-Scout Accelerators**
   - **2-Update Startups from Accelerators**
   - **3-Generate Value Propositions**
   - **4-Verify Accelerators** (optional re-verification)
   - **5-Verify Startups** (optional re-verification)

## How It Works

### 1. Scout Accelerators (Two-Step Process)

```
Step 1: Ask AI for accelerator NAMES only
        ↓
Step 2: For each name:
        → Ask AI for website and country
        → Verify URL is reachable
        → If URL fails → Try to find correct URL
        → If still fails → Try URL variations (name.com, name.io, name.ventures, etc.)
        → Save with verification status and source
```

### 2. Update Startups (With Proof)

```
For each VERIFIED accelerator:
        ↓
Ask AI for startups WITH proof of relationship
        ↓
For each startup:
        → Verify URL is reachable
        → If URL fails → Try to find correct URL
        → Save with verification status and relationship proof
        ↓
Skip accelerators already processed (resume capability)
```

### 3. Generate Value Propositions (With Source)

```
For each VERIFIED startup without value proposition:
        ↓
Ask AI to generate value proposition AND explain source
        ↓
Format: "[Name] helps [target] do [what] so that [benefit]"
        ↓
Save value proposition and source citation
```

## Architecture

### Helper Functions
| Function | Purpose |
|----------|---------|
| `getApiKey()` | Retrieves API key from secure storage |
| `callOpenAI()` | Makes requests to OpenAI API |
| `normalizeUrl()` | Standardizes URLs (lowercase, no trailing slash) |
| `cleanJsonResponse()` | Removes markdown formatting from AI responses |
| `getExistingWebsites()` | Returns Set of URLs already in sheet |
| `getExistingNames()` | Returns Set of names already in sheet |
| `getProcessedAccelerators()` | Returns Set of accelerators that have startups |
| `isUrlReachable()` | Checks if URL returns valid HTTP response |
| `findCorrectUrl()` | Attempts to find correct URL when first fails |
| `generateUrlVariations()` | Generates URL patterns to try |

### Main Functions
| Function | Menu Item | Purpose |
|----------|-----------|---------|
| `scoutAccelerators()` | 1-Scout Accelerators | Find and verify accelerators |
| `updateStartups()` | 2-Update Startups | Find startups with proof |
| `generateValuePropositions()` | 3-Generate Value Propositions | Create value props with source |
| `verifyAccelerators()` | 4-Verify Accelerators | Re-verify accelerator URLs |
| `verifyStartups()` | 5-Verify Startups | Re-verify startup URLs |

## Challenges and Solutions

### Challenge 1: AI Hallucination
**Problem:** AI generated fake or incorrect URLs
**Solution:** URL verification with `isUrlReachable()` function

### Challenge 2: Execution Timeout
**Problem:** Google Apps Script has 6-minute execution limit
**Solution:** Skip already-processed rows, allowing resume after timeout

### Challenge 3: Invalid URLs Need Fixing
**Problem:** When URL verification fails, data was just marked "NO"
**Solution:** Self-correction system with `findCorrectUrl()` that asks AI for correct URL

### Challenge 4: URL Format Variations
**Problem:** AI gave `nexgenventures.com` but correct was `nexgen.ventures`
**Solution:** `generateUrlVariations()` tries multiple URL patterns

### Challenge 5: No Proof of Data
**Problem:** No way to verify AI's claims about relationships
**Solution:** Require AI to provide proof/source for all generated content

### Challenge 6: False Negatives in URL Checking
**Problem:** Some real sites (Coinbase, Crowdcube) blocked script requests
**Solution:** Added User-Agent header, accept 403 responses as valid

## Version History

### v0.2.0 (Current)
- Two-step accelerator scouting with verification
- Self-correcting URL system
- URL variation generator
- Relationship proof for startups
- Value proposition source citations
- Resume capability for all functions
- Improved URL checking (handles 403 responses)

### v0.1.0
- Basic accelerator scouting
- Basic startup discovery
- Basic value proposition generation
- Simple URL verification

## Known Limitations

### AI Limitations
- OpenAI may still generate incorrect information despite verification
- Relationship proofs are AI-generated and may not be verifiable
- Value propositions are based on AI's knowledge, not live website scraping

### Technical Limitations
- 6-minute execution limit per function (mitigated with resume capability)
- Some websites block all automated requests (even with User-Agent)
- URL variations cannot cover all possible domain formats

### Data Quality
- Duplicate detection based on URL and name may miss variations
- Country information depends on AI accuracy
- No real-time verification against accelerator portfolio pages

## Future Improvements

- [ ] Web scraping of accelerator portfolio pages for verification
- [ ] Integration with Crunchbase or PitchBook API for cross-reference
- [ ] Batch processing with time-based checkpoints
- [ ] Human verification workflow with approval flags
- [ ] Automatic retry queue for failed URLs
- [ ] Dashboard for data quality metrics

## Technical Details

### Technologies
- Google Sheets (data storage and UI)
- Google Apps Script (backend logic)
- OpenAI API - GPT-4o-mini (AI generation)
- clasp (deployment and version control)

### API Configuration
- Model: `gpt-4o-mini`
- Max tokens: 1000
- Temperature: 0.7

### Rate Limiting
- 500-1000ms delay between API calls
- Prevents hitting OpenAI rate limits
- Allows URL verification time

## Repository Structure

```
startup-scouting-ai/
├── .clasp.json          # clasp configuration
├── appsscript.json      # Apps Script manifest
├── Code.js              # Main application code
└── README.md            # Documentation
```

## Author

**Kimia Bahrami**
- GitHub: [kimia1999](https://github.com/kimia1999)
