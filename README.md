# Startup Scouting AI

An automated tool for scouting European startup accelerators and their portfolio startups using Google Sheets, Apps Script, and OpenAI API.

## Live Demo

**Google Sheet:** [Startup Scouting AI - Live Data](https://docs.google.com/spreadsheets/d/1inBbXRV6wvGEU6k5n6DvGHsVW7GhkcGL_4weanKSOHk/edit?usp=sharing)

## Features

- **Scout Accelerators:** Automatically discovers European startup accelerators using AI
- **Find Startups:** Extracts portfolio startups from each accelerator
- **Generate Value Propositions:** Creates standardized value propositions in the format: "Startup X helps Y do W so that Z"
- **URL Verification:** Validates that discovered URLs are reachable
- **Duplicate Prevention:** Ensures no duplicate entries using URL normalization

## Sheet Structure

### accelerators
| Column | Description |
|--------|-------------|
| website | Accelerator URL (primary key) |
| name | Accelerator name |
| country | Country of operation |
| verified | URL validation status (YES/NO) |

### startups
| Column | Description |
|--------|-------------|
| website | Startup URL (primary key) |
| name | Startup name |
| country | Country of origin |
| accelerator | Reference to accelerator URL |
| value_proposition | Generated value proposition |
| verified | URL validation status (YES/NO) |

## Setup Instructions

### Prerequisites
- Google Account
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))

### Step 1: Clone the Apps Script

Option A - Using clasp (recommended):
```bash
npm install -g @google/clasp
clasp login
clasp clone 
```

Option B - Manual:
1. Create a new Google Sheet
2. Go to Extensions → Apps Script
3. Copy the contents of `Code.js` into the editor

### Step 2: Configure API Key

1. In Apps Script editor, go to Project Settings (gear icon)
2. Scroll to "Script Properties"
3. Click "Add script property"
4. Property name: `OPENAI_API_KEY`
5. Value: Your OpenAI API key
6. Click Save

### Step 3: Create Sheet Tabs

Create two tabs in your Google Sheet:
1. `accelerators` with headers: website, name, country
2. `startups` with headers: website, name, country, accelerator, value_proposition

### Step 4: Run the Tool

1. Refresh the Google Sheet
2. A new menu "Startup Scouting AI" will appear
3. Use the menu options in order:
   - **1-Scout Accelerators:** Find European accelerators
   - **2-Update Startups from Accelerators:** Find startups for each accelerator
   - **3-Generate Value Propositions:** Generate value propositions for startups
   - **4-Verify Accelerators:** Check if accelerator URLs are valid
   - **5-Verify Startups:** Check if startup URLs are valid

## How It Works

### 1. Scout Accelerators
- Sends prompt to OpenAI asking for European accelerators
- Parses JSON response
- Normalizes URLs (lowercase, removes trailing slash)
- Checks for duplicates before adding
- Adds new accelerators to sheet

### 2. Update Startups
- Loops through each accelerator
- Asks OpenAI for startups from that accelerator
- Links each startup to its accelerator
- Prevents duplicates

### 3. Generate Value Propositions
- Finds startups without value propositions
- Generates using format: "[Name] helps [target] do [what] so that [benefit]"
- Skips startups that already have value propositions

### 4-5. Verification
- Attempts to fetch each URL
- Marks as YES (reachable) or NO (not reachable)
- Skips already verified entries (allows resuming after timeout)

## Version History

### v0.1.0 (Current)
- Basic accelerator scouting via OpenAI
- Startup discovery from accelerators
- Value proposition generation
- URL verification with resume capability
- Duplicate prevention

## Known Limitations

### AI Hallucination
- OpenAI may generate incorrect URLs
- Some URLs may be valid but point to wrong companies
- Example: AI might return `norwayinnovate.com` instead of correct `innovasjonnorge.no`

### URL Verification Limits
- Only checks if URL is reachable (HTTP 200-399)
- Does not verify if content matches expected company
- Does not verify accelerator-startup relationships

### Accelerator-Startup Relationship
- Currently relies on OpenAI's knowledge
- No verification that startup actually belongs to accelerator
- Some relationships may be incorrect

### Execution Time
- Google Apps Script has 6-minute timeout
- Large datasets may require multiple runs
- Verification functions skip already-verified entries to handle this

## Planned Improvements (v0.2.0)

- [ ] Self-correcting URL verification (search for correct URL if invalid)
- [ ] Verify startup name appears on their website
- [ ] Verify startup appears on accelerator portfolio page
- [ ] Add relationship proof column
- [ ] Add source citation for value propositions
- [ ] Human verification workflow

## Technical Details

### Technologies Used
- Google Sheets (data storage and UI)
- Google Apps Script (backend logic)
- OpenAI API - GPT-4o-mini (AI generation)

### API Configuration
- Model: `gpt-4o-mini`
- Max tokens: 1000
- Temperature: 0.7

### Rate Limiting
- 500-1000ms delay between API calls
- Prevents hitting OpenAI rate limits

## Repository Structure
```
startup-scouting-ai/
├── .clasp.json        # clasp configuration
├── appsscript.json    # Apps Script manifest
├── Code.js            # Main application code
└── README.md          # This file
```

## Author

Kimia Bahrami



