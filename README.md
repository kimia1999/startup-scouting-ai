<div align="center">

# Startup Scouting AI

![IMG_6497](https://github.com/user-attachments/assets/0d74db53-1d09-4390-83b8-1fe0aa63cebd)


An automated tool that finds European startup accelerators and their portfolio companies using Google Sheets and AI. It verifies all data, tracks relationships between accelerators and startups, and generates value propositions with source citations.

---

**[Live Google Sheet](https://docs.google.com/spreadsheets/d/1inBbXRV6wvGEU6k5n6DvGHsVW7GhkcGL_4weanKSOHk/edit?usp=sharing)** · **[GitHub Repository](https://github.com/kimia1999/startup-scouting-ai)**

</div>

---

## Features

### Core Functions
- **Scout European Accelerators** - Finds accelerators based in Europe using a two step verification process
- **Find Startups (Two Methods)**
  - *AI Knowledge* - Uses AI to find startups from its training data
  - *Web Scraping* - Actually visits accelerator portfolio pages and extracts startup information
- **Generate Value Propositions** - Creates descriptions in the format: "Startup X helps Y do Z so that W"

### Smart Verification
- **URL Validation** - Checks if every URL actually works
- **Self-Correction** - When a URL fails, automatically searches for the correct one
- **URL Variations** - Tries different domain patterns (company.com, company.io, company.ai, etc.)

### Data Quality
- **European Filter** - Only includes startups headquartered in European countries
- **Duplicate Prevention** - Checks both URLs and company names to avoid duplicates
- **Relationship Proof** - Records how each startup is connected to its accelerator
- **Value Source** - Explains what information was used to generate each value proposition

### Reliability
- **Resume After Timeout** - If Google's 6 minute limit hits just run again and it continues where it left off
- **Error Handling** - Skips problematic entries and continues processing
- **Detailed Logging** - Records every step for debugging

---

## Data Quality Measures

We implemented several checks to ensure the data is accurate and useful:

| Check | What It Does |
|-------|--------------|
| URL Verification | Every URL is tested to confirm it actually loads |
| Self-Correction | Failed URLs trigger an automatic search for the correct one |
| European Validation | Non European startups are filtered out |
| Duplicate Detection | Prevents same company from being added twice |
| Proof Tracking | Records evidence for accelerator startup relationships |
| Source Citations | Documents the basis for each value proposition |

---

## Sheet Structure

### accelerators
| Column | Description |
|--------|-------------|
| website | Accelerator URL (unique identifier) |
| name | Accelerator name |
| country | Country (European only) |
| verified | YES/NO - URL works? |
| source | How we found this (AI generated / AI corrected) |

### startups
| Column | Description |
|--------|-------------|
| website | Startup URL (unique identifier) |
| name | Startup name |
| country | Country (European only) |
| accelerator | Link to accelerator URL |
| value_proposition | Generated description |
| verified | YES/NO - URL works? |
| relationship_proof | Evidence of connection to accelerator |
| value_source | Basis for the value proposition |

---

## Setup Instructions

### What You Need
- Google Account
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))
- Node.js installed ([Download here](https://nodejs.org))

### Step 1: Clone the Repository

```bash
git clone https://github.com/kimia1999/startup-scouting-ai.git
cd startup-scouting-ai
```

### Step 2: Install clasp

```bash
npm install -g @google/clasp
clasp login
```

Enable Apps Script API at: https://script.google.com/home/usersettings

### Step 3: Set Up Google Sheet

**Option A: Use the template (Recommended)**
1. Download the blank template: [startup-scouting-template.xlsx](link-to-template)
2. Upload to Google Drive
3. Open with Google Sheets

**Option B: Create manually**
1. Create a new Google Sheet
2. Create tab `accelerators` with headers: `website | name | country | verified | source`
3. Create tab `startups` with headers: `website | name | country | accelerator | value_proposition | verified | relationship_proof | value_source`

### Step 4: Deploy Code

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any default code
3. Copy all content from `Code.js` in this repository
4. Paste into the Apps Script editor
5. Save (Ctrl+S)

### Step 5: Configure API Key

1. In Apps Script, click **Project Settings** (gear icon)
2. Scroll to **Script Properties**
3. Click **Add script property**
4. Name: `OPENAI_API_KEY`
5. Value: Your OpenAI API key
6. Click **Save**

### Step 6: Run the Tool

1. Go back to your Google Sheet
2. Refresh the page
3. New menu appears: **Startup Scouting AI**
4. Run in order:
   - `1-Scout Accelerators (Europe)`
   - `2a-Find Startups (AI Knowledge)` or `2b-Find Startups (Web Scraping)`
   - `3-Generate Value Propositions`

---

## How It Works

### 1. Scout Accelerators (Europe)

```
Ask AI for European accelerator NAMES
        ↓
For each name, ask AI for website and country
        ↓
Verify URL works
        ↓
If URL fails → Try to find correct URL
        ↓
If still fails → Try URL variations (name.com, name.io, etc.)
        ↓
Save with verification status and source
```

### 2a. Find Startups (AI Knowledge)

```
For each verified accelerator:
        ↓
Ask AI for European startups with proof of relationship
        ↓
Verify each startup URL
        ↓
If URL fails → Search for correct URL
        ↓
Validate country is European
        ↓
Save with proof and verification status
```

### 2b. Find Startups (Web Scraping)

```
For each verified accelerator:
        ↓
Find portfolio page URL (try common patterns like /portfolio, /companies)
        ↓
Fetch the HTML content
        ↓
Use AI to extract startup names and websites from HTML
        ↓
If HTML parsing fails → Fall back to AI knowledge
        ↓
Verify URLs and validate European country
        ↓
Save with source: "Scraped from [portfolio URL]"
```

### 3. Generate Value Propositions

```
For each verified startup without value proposition:
        ↓
Ask AI to generate description with source citation
        ↓
Format: "[Name] helps [target] do [what] so that [benefit]"
        ↓
Save value proposition and source explanation
```

---

## Architecture

### Helper Functions
| Function | Purpose |
|----------|---------|
| `getApiKey()` | Gets API key from secure storage |
| `callOpenAI()` | Sends requests to OpenAI API |
| `normalizeUrl()` | Standardizes URLs (lowercase, no trailing slash) |
| `cleanJsonResponse()` | Removes markdown from AI responses |
| `isUrlReachable()` | Tests if URL returns valid response |
| `findCorrectUrl()` | Searches for correct URL when original fails |
| `generateUrlVariations()` | Creates URL patterns to try |
| `isEuropeanCountry()` | Validates country is in Europe |
| `getStartupCountry()` | Asks AI for startup's country |
| `fetchWebsiteContent()` | Downloads webpage HTML |
| `findPortfolioPageUrl()` | Finds accelerator's portfolio page |
| `extractStartupsFromWebpage()` | Parses HTML to find startups |

### Main Functions
| Function | Menu Item |
|----------|-----------|
| `scoutAccelerators()` | 1-Scout Accelerators (Europe) |
| `updateStartupsAI()` | 2a-Find Startups (AI Knowledge) |
| `updateStartupsWebScrape()` | 2b-Find Startups (Web Scraping) |
| `generateValuePropositions()` | 3-Generate Value Propositions |

---

## Challenges and Solutions

### Challenge 1: AI Hallucination

**The Problem**

AI sometimes generates fake or incorrect URLs. For example, it gave `norwayinnovate.com` instead of the correct `innovasjonnorge.no`.

**What We Did**

- Added URL verification that checks if every URL actually loads
- Created a self correction system that asks AI for the correct URL when one fails
- Built a URL variation generator that tries different patterns (name.com, name.io, name.ai, etc.)

---

### Challenge 2: Execution Timeout

**The Problem**

Google Apps Script stops after 6 minutes. With many accelerators and startups, the process couldn't finish.

**What We Did**

- Added tracking of already processed items
- Functions now skip completed work and continue from where they stopped
- Users can simply run the function again to continue

---

### Challenge 3: Wrong URL Formats

**The Problem**

AI gave `nexgenventures.com` but the correct URL was `nexgen.ventures` (different domain format).

**What We Did**

- Built `generateUrlVariations()` that tries multiple domain patterns
- Tries: .com, .co, .io, .org, .ai, and special formats like name.ventures

---

### Challenge 4: No Proof of Relationships

**The Problem**

AI claimed startups belonged to accelerators, but provided no evidence.

**What We Did**

- Updated prompts to require proof (e.g., "Listed on portfolio page 2023")
- Added `relationship_proof` column to track evidence
- Web scraping method records the exact URL where startup was found

---

### Challenge 5: Non European Results

**The Problem**

Some accelerators are global, so AI returned startups from USA, Africa, Asia.

**What We Did**

- Created list of European countries for validation
- Added `isEuropeanCountry()` check
- When country is unknown, asks AI to find it
- Filters out non European startups

---

### Challenge 6: Portfolio Pages Hard to Find

**The Problem**

Every accelerator website uses different URLs for their portfolio (/portfolio, /companies, /our-startups, etc.).

**What We Did**

- Built `findPortfolioPageUrl()` that tries 15+ common URL patterns
- Falls back to asking AI if patterns don't work
- Validates each URL before using it

---

### Challenge 7: Websites Blocking Requests

**The Problem**

Some websites returned errors for automated requests but worked in browsers.

**What We Did**

- Added browser like User Agent header
- Accept more response codes (403 means site exists but blocks scripts)
- Improved error handling to continue despite failures

---

## Version History

### v0.2.0 (Current)
- Two step accelerator scouting with verification
- Two methods for finding startups (AI + Web Scraping)
- Self correcting URL system
- URL variation generator
- European country validation
- Relationship proof tracking
- Value proposition with source citations
- Resume capability after timeout

### v0.1.0
- Basic accelerator scouting
- Basic startup discovery
- Basic value proposition generation
- Simple URL verification

---

## Known Limitations

### AI Accuracy
- AI may still generate incorrect information despite verification
- Relationship proofs are AI generated and may not be verifiable
- Some startups may be outdated (company no longer active)

### Technical Limits
- 6 minute execution limit per function (mitigated with resume capability)
- Some websites block all automated requests
- JavaScript rendered pages may not scrape properly

### Data Quality
- Country detection depends on AI accuracy
- Some URLs may be correct but point to different company with same name
- Value propositions are based on AI knowledge, not live website content

---

## Future Improvements

- [ ] Verify startup is still active (check recent blog posts, social media)
- [ ] Check copyright year on website footer for activity
- [ ] Integration with Crunchbase API for company verification
- [ ] Web scraping of actual startup websites for value propositions
- [ ] Batch processing with checkpoints
- [ ] Dashboard for data quality metrics
- [ ] Export to other formats (CSV, JSON)

---

## Technical Details

### Technologies
- Google Sheets (data storage and interface)
- Google Apps Script (backend logic)
- OpenAI API - GPT-4o-mini (AI processing)
- clasp (deployment and version control)

### API Configuration
```javascript
model: 'gpt-4o-mini'
max_tokens: 1000
temperature: 0.7
```

### Rate Limiting
- 500-2000ms delay between API calls
- Prevents hitting OpenAI rate limits

---

## Repository Structure

```
startup-scouting-ai/
├── .clasp.json          # clasp configuration
├── appsscript.json      # Apps Script manifest
├── Code.js              # Main application code
└── README.md            # This file
```

---

## Author

**Kimia Bahrami**

- GitHub: [kimia1999](https://github.com/kimia1999)
- Email: kimiabahrami1999@gmail.com

