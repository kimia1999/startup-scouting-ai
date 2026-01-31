// This function is for the API key that we stored securely in Script Properties
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}




// Here is for custom menu
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('Startup Scouting AI');
  
  menu.addItem('1-Scout Accelerators (Europe)', 'scoutAccelerators');
  menu.addSeparator();
  menu.addItem('2a-Find Startups (AI Knowledge)', 'updateStartupsAI');
  menu.addItem('2b-Find Startups (Web Scraping)', 'updateStartupsWebScrape');
  menu.addSeparator();
  menu.addItem('3-Generate Value Propositions', 'generateValuePropositions');
  
  menu.addToUi();
}
``


// here is for having the European countries name so we can check with our results 
function isEuropeanCountry(country) {
  
  if (!country || country === 'Unknown') {
    return 'unknown';
  }
  
  var europeanCountries = [
    'albania', 'andorra', 'austria', 'belarus', 'belgium', 'bosnia', 'bosnia and herzegovina',
    'bulgaria', 'croatia', 'cyprus', 'czech republic', 'czechia', 'denmark', 'estonia',
    'finland', 'france', 'germany', 'greece', 'hungary', 'iceland', 'ireland',
    'italy', 'kosovo', 'latvia', 'liechtenstein', 'lithuania', 'luxembourg',
    'malta', 'moldova', 'monaco', 'montenegro', 'netherlands', 'north macedonia', 'norway',
    'poland', 'portugal', 'romania', 'russia', 'san marino', 'serbia', 'slovakia',
    'slovenia', 'spain', 'sweden', 'switzerland', 'ukraine', 'united kingdom', 'uk',
    'vatican', 'vatican city'
  ];
  
  var countryLower = country.toLowerCase().trim();
  
  for (var i = 0; i < europeanCountries.length; i++) {
    if (countryLower === europeanCountries[i] || countryLower.includes(europeanCountries[i])) {
      return 'yes';
    }
  }
  
  return 'no';
}


// function to get country for a startup using AI
function getStartupCountry(startupName, startupWebsite) {
  
  var prompt = 'Where is the startup "' + startupName + '" (website: ' + startupWebsite + ') headquartered? ' +
               'Return ONLY the country name, nothing else. ' +
               'Example: France ' +
               'If you do not know, return: Unknown';
  
  var response = callOpenAI(prompt);
  
  if (response) {
    return response.trim();
  }
  
  return 'Unknown';
}


//function for the OpenAI API 
function callOpenAI(prompt) {
  
  // Get the API key from secure storage
  var apiKey = getApiKey();
  
  
  if (!apiKey) {
    Logger.log('No API key found - Please check the properties');
    return null;
  }
  
  var url = 'https://api.openai.com/v1/chat/completions';
  
  // sending data to OpenAI
  var payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1000,
    temperature: 0.7
  };
  
  // Settings for the HTTP request
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  //  call the API
  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    // OpenAI returned an error log it
    if (json.error) {
      Logger.log('OpenAI Error: ' + json.error.message);
      return null;
    }
    
    // return the text response from OpenAI
    return json.choices[0].message.content;
    
  } catch (error) {
    Logger.log('Error calling OpenAI: ' + error.toString());
    return null;
  }
}

// cleaning URLs 
function normalizeUrl(url) {
  
  // check for empty URL
  if (!url) {
    return '';
  }
  
  
  url = url.trim().toLowerCase();
  
  
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
 
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
}

//function  for getting all websites already in a sheet so no more duplicate 
function getExistingWebsites(sheetName) {
  
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  // getting data from the sheet
  var data = sheet.getDataRange().getValues();
  
  
  var websites = new Set();
  
  
  for (var i = 1; i < data.length; i++) {
    var url = normalizeUrl(data[i][0]);
    if (url) {
      websites.add(url);
    }
  }
  
  return websites;
}


// function for checking if a URL is reachable 
function isUrlReachable(url) {
  
  if (!url) {
    return false;
  }
  
  try {
    var options = {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
  
    // Many real sites return 403 to scripts but still exist
    if (responseCode >= 200 && responseCode < 500) {
      return true;
    } else {
      return false;
    }
    
  } catch (error) {
    Logger.log('URL not reachable: ' + url + ' Error: ' + error.toString());
    return false;
  }
}




//function for getting all names already in a sheet so no more duplicate
function getExistingNames(sheetName) {
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  
  var names = new Set();
  
  // Name is in column B (index 1)
  for (var i = 1; i < data.length; i++) {
    var name = data[i][1];
    if (name) {
      names.add(name.toString().toLowerCase());
    }
  }
  
  return names;
}


// function for cleaning JSON response from AI 
function cleanJsonResponse(response) {
  
  var clean = response.trim();
  
  // Remove markdown code blocks
  if (clean.startsWith('```json')) {
    clean = clean.slice(7);
  }
  if (clean.startsWith('```')) {
    clean = clean.slice(3);
  }
  if (clean.endsWith('```')) {
    clean = clean.slice(0, -3);
  }
  
  return clean.trim();
}

//function for generating possible URL variations from company name
function generateUrlVariations(companyName) {
  
  //clean the company name
  var name = companyName.toLowerCase().trim();
  
  //remove common words
  var cleanName = name.replace(/\s+(accelerator|ventures|capital|labs|lab|fund|partners|inc|ltd|co|company)$/i, '').trim();
  
  // get the suffix word if exists 
  var suffixMatch = name.match(/\s+(ventures|capital|labs|lab|fund|partners)$/i);
  var suffix = suffixMatch ? suffixMatch[1].toLowerCase() : null;
  
  // create base versions
  var noSpaces = cleanName.replace(/\s+/g, '');
  var withDashes = cleanName.replace(/\s+/g, '-');
  
  var variations = [];
  
  // Standard domain variations
  variations.push('https://www.' + noSpaces + '.com');
  variations.push('https://' + noSpaces + '.com');
  variations.push('https://www.' + noSpaces + '.co');
  variations.push('https://' + noSpaces + '.co');
  variations.push('https://www.' + noSpaces + '.io');
  variations.push('https://' + noSpaces + '.io');
  variations.push('https://www.' + noSpaces + '.org');
  variations.push('https://www.' + noSpaces + '.ai');
  variations.push('https://' + noSpaces + '.ai');
  variations.push('https://www.' + withDashes + '.com');
  
  // here is for if has suffix try name.suffix format
  if (suffix) {
    var nameWithoutSuffix = noSpaces.replace(suffix, '');
    variations.push('https://www.' + nameWithoutSuffix + '.' + suffix);
    variations.push('https://' + nameWithoutSuffix + '.' + suffix);
  }
  
  // check for special case for names with multiple words
  var words = cleanName.split(/\s+/);
  if (words.length >= 1 && suffix) {
    variations.push('https://www.' + words[0] + '.' + suffix);
    variations.push('https://' + words[0] + '.' + suffix);
  }
  
  return variations;
}


//function for finding correct URL when first one fails
function findCorrectUrl(companyName, companyType) {
  
  //first try: we ask AI for correct URL
  var prompt = 'The ' + companyType + ' "' + companyName + '" - I need their correct official website URL. ' +
               'Search your knowledge carefully. ' +
               'Return ONLY the URL, nothing else. ' +
               'Format: https://example.com ' +
               'If you are not sure, return: UNKNOWN';
  
  var response = callOpenAI(prompt);
  
  if (response) {
    var url = response.trim();
    
    // If AI gave a URL (not UNKNOWN)
    if (url !== 'UNKNOWN' && !url.includes('UNKNOWN')) {
      url = normalizeUrl(url);
      if (isUrlReachable(url)) {
        return url;
      }
    }
  }
  
  // Second try: generate URL variations and test them
  var urlVariations = generateUrlVariations(companyName);
  
  for (var i = 0; i < urlVariations.length; i++) {
    var testUrl = urlVariations[i];
    Logger.log('Trying URL variation: ' + testUrl);
    
    if (isUrlReachable(testUrl)) {
      Logger.log('Found working URL: ' + testUrl);
      return testUrl;
    }
  }
  
  return null;
}

//function for getting accelerators that already have startups
function getProcessedAccelerators() {
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('startups');
  var data = sheet.getDataRange().getValues();
  
  var accelerators = new Set();
  
  // accelerator is in column D (index 3)
  for (var i = 1; i < data.length; i++) {
    var accUrl = data[i][3];
    if (accUrl) {
      accelerators.add(normalizeUrl(accUrl));
    }
  }
  
  return accelerators;
}


//func for fetching website content
function fetchWebsiteContent(url) {
  
  if (!url) {
    Logger.log('fetchWebsiteContent: No URL provided');
    return null;
  }
  
  Logger.log('Fetching content from: ' + url);
  
  try {
    var options = {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    Logger.log('Response code: ' + responseCode);
    
    // Accept any response that has content (even 403, 404 sometimes have useful content)
    var content = response.getContentText();
    
    if (content && content.length > 0) {
      Logger.log('Content fetched. Length: ' + content.length);
      return content;
    }
    
    Logger.log('Empty content received');
    return null;
    
  } catch (error) {
    Logger.log('Error fetching URL: ' + error.toString());
    return null;
  }
}


//function for finding portfolio startups page URL from accelerator website
function findPortfolioPageUrl(acceleratorUrl, acceleratorName) {
  
  // we ask AI for the correct portfolio URL
  Logger.log('Asking AI for portfolio URL of: ' + acceleratorName);
  
  var prompt = 'What is the exact URL of the portfolio/companies page for the accelerator "' + acceleratorName + '"? ' +
               'Their main website is: ' + acceleratorUrl + ' ' +
               'I need the page that lists all their portfolio companies or startups. ' +
               'Return ONLY the full URL, nothing else. ' +
               'If you do not know the exact URL, return: UNKNOWN';
  
  var aiResponse = callOpenAI(prompt);
  
  if (aiResponse) {
    var aiUrl = aiResponse.trim();
    Logger.log('AI suggested URL: ' + aiUrl);
    
    if (aiUrl !== 'UNKNOWN' && !aiUrl.includes('UNKNOWN') && aiUrl.startsWith('http')) {
      // test if this URL works
      try {
        var options = {
          method: 'get',
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        };
        var response = UrlFetchApp.fetch(aiUrl, options);
        var code = response.getResponseCode();
        Logger.log('AI URL response code: ' + code);
        
        if (code >= 200 && code < 400) {
          Logger.log('AI URL works: ' + aiUrl);
          return aiUrl;
        }
      } catch (e) {
        Logger.log('AI URL failed: ' + e.toString());
      }
    }
  }
  
  //if AI didn't help try common patterns
  Logger.log('AI did not find URL trying common patterns');
  
  var patterns = [
    '/portfolio',
    '/companies',
    '/startups',
    '/our-portfolio',
    '/our-companies',
    '/our-startups',
    '/alumni',
    '/founders',
    '/investments',
    '/backed',
    '/network',
    '/community/companies',
    '/portfolio-companies',
    '/seed-portfolio',
    '/all-companies'
  ];
  
  var baseUrl = acceleratorUrl;
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  for (var i = 0; i < patterns.length; i++) {
    var testUrl = baseUrl + patterns[i];
    Logger.log('Trying pattern: ' + testUrl);
    
    try {
      var options = {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };
      
      var response = UrlFetchApp.fetch(testUrl, options);
      var code = response.getResponseCode();
      
      // Only accept 200-299 
      if (code >= 200 && code < 300) {
        Logger.log('Pattern works: ' + testUrl + ' (code: ' + code + ')');
        return testUrl;
      }
    } catch (e) {
      //Continue to next pattern
    }
    
    Utilities.sleep(200);
  }
  
  Logger.log('Could not find portfolio page for: ' + acceleratorName);
  return null;
}


//function for extracting startup information from webpage content using AI
function extractStartupsFromWebpage(pageContent, acceleratorName) {
  
  Logger.log('extractStartupsFromWebpage called for: ' + acceleratorName);
  Logger.log('Original content length: ' + pageContent.length);
  
  //clean the content
  var contentToSend = pageContent;
  contentToSend = contentToSend.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  contentToSend = contentToSend.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  contentToSend = contentToSend.replace(/<!--[\s\S]*?-->/g, '');
  
  Logger.log('Content length after cleaning: ' + contentToSend.length);
  
  //limit content length
  var maxLength = 30000;
  if (contentToSend.length > maxLength) {
    var portfolioStart = contentToSend.toLowerCase().indexOf('portfolio');
    if (portfolioStart === -1) {
      portfolioStart = contentToSend.toLowerCase().indexOf('companies');
    }
    if (portfolioStart === -1) {
      portfolioStart = contentToSend.toLowerCase().indexOf('startups');
    }
    
    if (portfolioStart > 0 && portfolioStart < contentToSend.length - maxLength) {
      contentToSend = contentToSend.substring(portfolioStart, portfolioStart + maxLength);
    } else {
      var startPos = Math.floor(contentToSend.length * 0.2);
      contentToSend = contentToSend.substring(startPos, startPos + maxLength);
    }
  }
  
  Logger.log('Final content length to send: ' + contentToSend.length);
  
  var prompt = 'I have HTML content from the portfolio page of accelerator "' + acceleratorName + '". ' +
               'Extract startup company names from this page. ' +
               'IMPORTANT: Only include startups that are based in EUROPEAN countries. ' +
               'For each startup: ' +
               '1. Find the company NAME ' +
               '2. Find their ACTUAL website (NOT the accelerator page about them) ' +
               '   - If not visible, guess based on company name (e.g., "Revolut" -> "https://revolut.com") ' +
               '3. Find their COUNTRY - must be in Europe (UK, France, Germany, Spain, Netherlands, etc.) ' +
               '   - Skip any startups from USA, Africa, Asia, etc. ' +
               'IMPORTANT: Do NOT return URLs that contain "' + acceleratorName.toLowerCase() + '". ' +
               'Return ONLY JSON array: [{"name": "Company", "website": "https://company.com", "country": "France"}] ' +
               'Return maximum 5 EUROPEAN startups only. If none found, return: [] ' +
               '\n\nHTML:\n' + contentToSend;
  
  Logger.log('Sending prompt to AI...');
  var response = callOpenAI(prompt);
  
  if (!response) {
    Logger.log('No response from AI');
    return [];
  }
  
  Logger.log('AI response: ' + response.substring(0, 500));
  
  try {
    var cleanResponse = cleanJsonResponse(response);
    var startups = JSON.parse(cleanResponse);
    Logger.log('Parsed ' + startups.length + ' startups');
    return startups;
  } catch (error) {
    Logger.log('Error parsing AI response: ' + error.toString());
    return [];
  }
}



//fallback function -ask AI based on knowledge when HTML parsing fails
function extractStartupsWithAIKnowledge(acceleratorName, portfolioUrl) {
  
  Logger.log('Using AI knowledge fallback for: ' + acceleratorName);
  
  var prompt = 'The accelerator "' + acceleratorName + '" has their portfolio at: ' + portfolioUrl + ' ' +
               'Based on your knowledge, list 5 EUROPEAN startups from their portfolio. ' +
               'IMPORTANT: Only include startups headquartered in European countries (UK, France, Germany, Spain, Netherlands, Sweden, etc.) ' +
               'Do NOT include startups from USA, Africa, Asia, or other non-European regions. ' +
               'For each startup provide: ' +
               '1. name - the startup company name ' +
               '2. website - the startup ACTUAL website (like revolut.com), NOT the accelerator page ' +
               '3. country - must be a European country ' +
               'Return ONLY JSON array: [{"name": "Name", "website": "https://startup.com", "country": "France"}] ' +
               'Only include startups you are confident are European companies.';
  
  var response = callOpenAI(prompt);
  
  if (!response) {
    Logger.log('No response from AI');
    return [];
  }
  
  Logger.log('AI knowledge response: ' + response.substring(0, 500));
  
  try {
    var cleanResponse = cleanJsonResponse(response);
    return JSON.parse(cleanResponse);
  } catch (error) {
    Logger.log('Error parsing response: ' + error.toString());
    return [];
  }
}



//this is a section for main functions  

// func for finding european accelerators using two step process with verification
function scoutAccelerators() {
  
  SpreadsheetApp.getUi().alert('Starting. Please wait');
  
  // access the accelerators sheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('accelerators');
  
  // get websites and names that already exist so no more duplicates
  var existingWebsites = getExistingWebsites('accelerators');
  var existingNames = getExistingNames('accelerators');
  
  // 1: Ask AI for accelerator NAMES only
  var promptNames = 'Give me a list of 10 real startup accelerators that are BASED IN EUROPE. ' +
                  'Only include accelerators with headquarters in European countries like UK, Germany, France, Netherlands, Spain, Italy, Sweden, Denmark, Finland, Norway, Switzerland, Belgium, Ireland, Portugal, Austria, Poland, etc. ' +
                  'Do NOT include US-based accelerators like Y Combinator, 500 Startups, Techstars (US), Plug and Play, etc. ' +
                  'Return ONLY the names, no websites. ' +
                  'Return as JSON array of strings. ' +
                  'Format: ["Name 1", "Name 2", "Name 3"] ' +
                  'Only include well-known, established European accelerators.';
  
  var responseNames = callOpenAI(promptNames);
  
  if (!responseNames) {
    SpreadsheetApp.getUi().alert('Error. Check API key.');
    return;
  }
  
  // parse the names
  var acceleratorNames;
  try {
    var cleanResponse = cleanJsonResponse(responseNames);
    acceleratorNames = JSON.parse(cleanResponse);
  } catch (error) {
    Logger.log('Error parsing names: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error parsing AI response. Check logs.');
    return;
  }
  
  var addedCount = 0;
  var skippedCount = 0;
  
  // 2: For each name find and verify website
  for (var i = 0; i < acceleratorNames.length; i++) {
    
    var accName = acceleratorNames[i];
    
    // Skip if name already exists
    if (existingNames.has(accName.toLowerCase())) {
      Logger.log('Skipping duplicate name: ' + accName);
      skippedCount++;
      continue;
    }
    
    Logger.log('Processing: ' + accName);
    
    //ssk AI for website and country
    
    var promptDetails = 'For the startup accelerator "' + accName + '", provide: ' +
                    '1. Their official website URL ' +
                    '2. The country where they are HEADQUARTERED ' +
                    'Return ONLY JSON format: {"website": "https://...", "country": "Country"} ' +
                    'Make sure the website is the real official website. ' +
                    'The country must be in Europe.';
    
    var responseDetails = callOpenAI(promptDetails);
    
    if (!responseDetails) {
      Logger.log('No response for: ' + accName);
      continue;
    }
    
    //parse details
    var details;
    try {
      var cleanDetails = cleanJsonResponse(responseDetails);
      details = JSON.parse(cleanDetails);
    } catch (error) {
      Logger.log('Error parsing details for ' + accName + ': ' + error.toString());
      continue;
    }
    
    var website = normalizeUrl(details.website);
    var country = details.country;
    
    //checking if website already exists
    if (existingWebsites.has(website)) {
      Logger.log('Skipping duplicate website: ' + website);
      skippedCount++;
      continue;
    }
    
    //verify the URL
    var isValid = isUrlReachable(website);
    var source = 'AI generated';
    
    // here is for if URL is not valid try to find correct one
    if (!isValid) {
      Logger.log('URL not valid for ' + accName + ', searching for correct URL');
      
      var correctedUrl = findCorrectUrl(accName, 'accelerator');
      
      if (correctedUrl) {
        website = correctedUrl;
        isValid = true;
        source = 'AI corrected after first URL failed';
      }
    }
    
    //add to sheet with all 5 columns
    var verified = isValid ? 'YES' : 'NO';
    sheet.appendRow([website, accName, country, verified, source]);
    
    existingWebsites.add(website);
    existingNames.add(accName.toLowerCase());
    addedCount++;
    
    Logger.log('Added: ' + accName + ' - ' + website + ' - Verified: ' + verified);
    
    //pause for not hitting API rate limits
    Utilities.sleep(1000);
  }
  
  var message = 'Done. Added ' + addedCount + ' accelerators. Skipped ' + skippedCount + ' duplicates.';
  SpreadsheetApp.getUi().alert(message);
}



// function for finding startups from each accelerator with verification and proof

function updateStartupsAI() {
  
  SpreadsheetApp.getUi().alert('Finding startups from accelerators. If it times out run again - it will continue where it left off.');
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var acceleratorsSheet = spreadsheet.getSheetByName('accelerators');
  var startupsSheet = spreadsheet.getSheetByName('startups');
  var existingStartups = getExistingWebsites('startups');
  var existingNames = getExistingNames('startups');
  var acceleratorsData = acceleratorsSheet.getDataRange().getValues();
  var processedAccelerators = getProcessedAccelerators();
  
  var totalAdded = 0;
  var totalSkipped = 0;
  var totalCorrected = 0;
  var acceleratorsProcessed = 0;
  var acceleratorsSkipped = 0;
  
  for (var i = 1; i < acceleratorsData.length; i++) {
    
    var accWebsite = acceleratorsData[i][0];
    var accName = acceleratorsData[i][1];
    var accVerified = acceleratorsData[i][3];
    
    //skip if no website
    if (!accWebsite) {
      continue;
    }
    
    //skip accelerators that are not verified 
    if (accVerified !== 'YES') {
      Logger.log('Skipping unverified accelerator: ' + accName);
      continue;
    }
    
    // skip accelerators we already processed 
    if (processedAccelerators.has(normalizeUrl(accWebsite))) {
      Logger.log('Skipping already processed accelerator: ' + accName);
      acceleratorsSkipped++;
      continue;
    }
    
    Logger.log('Processing accelerator: ' + accName);
    
    // prompting for startups with proof of relationship

  var prompt = 'Find 3 startups that graduated from or were part of the accelerator "' + accName + '". ' +
             'IMPORTANT: Only include startups that are HEADQUARTERED IN EUROPE. ' +
             'Do NOT include startups from USA, Africa, Asia, or other non-European regions. ' +
             'European countries include: UK, France, Germany, Spain, Italy, Netherlands, Sweden, Denmark, Finland, Norway, Switzerland, Belgium, Ireland, Portugal, Austria, Poland, etc. ' +
             'For each startup provide: ' +
             '1. website (official website URL) ' +
             '2. name (startup name) ' +
             '3. country (must be a European country) ' +
             '4. proof (brief explanation of how you know they are connected to this accelerator) ' +
             'Return ONLY JSON array. ' +
             'Format: [{"website": "https://...", "name": "Name", "country": "France", "proof": "Listed on accelerator website"}] ' +
             'Only include European startups you are confident about. If none found, return: []';
    
    var response = callOpenAI(prompt);
    
    if (!response) {
      Logger.log('No response for accelerator: ' + accName);
      continue;
    }
    
    var startups;
    try {
      var cleanResponse = cleanJsonResponse(response);
      startups = JSON.parse(cleanResponse);
    } catch (error) {
      Logger.log('Error parsing response for ' + accName + ': ' + error.toString());
      continue;
    }
    
    for (var j = 0; j < startups.length; j++) {
      var startup = startups[j];
      
      var website = normalizeUrl(startup.website);
      var name = startup.name;
      var country = startup.country;
      var proof = startup.proof || 'No proof provided';
      
      // we see if country is European
      var isEuropean = isEuropeanCountry(country);

      // If country is Unknown then try to find it
      if (isEuropean === 'unknown') {
        Logger.log('Country unknown for ' + name + ', asking AI');
        country = getStartupCountry(name, website);
        isEuropean = isEuropeanCountry(country);
      }

      // Skip non European startups
      if (isEuropean === 'no') {
        Logger.log('Skipping non-European startup: ' + name + ' (' + country + ')');
        totalSkipped++;
        continue;
      }
      
      // skip if no website or name
      if (!website || !name) {
        continue;
      }
      
      // check for duplicate website
      if (existingStartups.has(website)) {
        Logger.log('Skipping duplicate startup website: ' + website);
        totalSkipped++;
        continue;
      }
      
      // check for duplicate name
      if (existingNames.has(name.toLowerCase())) {
        Logger.log('Skipping duplicate startup name: ' + name);
        totalSkipped++;
        continue;
      }
      
      // verifing the URL
      var isValid = isUrlReachable(website);
      var source = 'AI generated';
      
      
      if (!isValid) {
        Logger.log('URL not valid for ' + name + ', searching for correct URL');
        
        var correctedUrl = findCorrectUrl(name, 'startup');
        
        if (correctedUrl) {
          website = correctedUrl;
          isValid = true;
          source = 'AI corrected';
          totalCorrected++;
        }
      }
      
      var verified = isValid ? 'YES' : 'NO';
      
      
      // our columns: website, name, country, accelerator, value_proposition, verified, relationship proof
      startupsSheet.appendRow([
        website,
        name,
        country,
        accWebsite,
        '',
        verified,
        proof
      ]);
      
      existingStartups.add(website);
      existingNames.add(name.toLowerCase());
      totalAdded++;
      
      Logger.log('Added startup: ' + name + ' - Verified: ' + verified);
    }
    
    acceleratorsProcessed++;
    
    //pause for rate limits
    Utilities.sleep(1000);
  }
  
  var message = 'Done!\n' +
                'Accelerators processed: ' + acceleratorsProcessed + '\n' +
                'Accelerators skipped (already done): ' + acceleratorsSkipped + '\n' +
                'Startups added: ' + totalAdded + '\n' +
                'URLs corrected: ' + totalCorrected + '\n' +
                'Duplicates skipped: ' + totalSkipped;
  SpreadsheetApp.getUi().alert(message);
}


//function for finding startups by scraping accelerator websites
function updateStartupsWebScrape() {

  SpreadsheetApp.getUi().alert('Finding startups by scraping accelerator websites. PLEASE WAITE');

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var acceleratorsSheet = spreadsheet.getSheetByName('accelerators');
  var startupsSheet = spreadsheet.getSheetByName('startups');
  var existingStartups = getExistingWebsites('startups');
  var existingNames = getExistingNames('startups');
  var acceleratorsData = acceleratorsSheet.getDataRange().getValues();

  var processedAccelerators = getProcessedAccelerators();

  var totalAdded = 0;
  var totalSkipped = 0;
  var totalCorrected = 0;
  var acceleratorsProcessed = 0;
  var acceleratorsSkipped = 0;
  var scrapeFailed = 0;

  for (var i = 1; i < acceleratorsData.length; i++) {

    var accWebsite = acceleratorsData[i][0];
    var accName = acceleratorsData[i][1];
    var accVerified = acceleratorsData[i][3];

    if (!accWebsite) {
      continue;
    }

    if (accVerified !== 'YES') {
      Logger.log('Skipping unverified accelerator: ' + accName);
      continue;
    }

    if (processedAccelerators.has(normalizeUrl(accWebsite))) {
      Logger.log('Skipping already processed accelerator: ' + accName);
      acceleratorsSkipped++;
      continue;
    }

    Logger.log('Processing accelerator: ' + accName);

    // first find portfolio page
    var portfolioUrl = findPortfolioPageUrl(accWebsite, accName);

    if (!portfolioUrl) {
      Logger.log('Could not find portfolio page for: ' + accName);
      scrapeFailed++;
      continue;
    }

    Logger.log('Found portfolio page: ' + portfolioUrl);

    // second fetch portfolio page content
    var pageContent = fetchWebsiteContent(portfolioUrl);

    var startups = [];

    if (pageContent && pageContent.length > 0) {
      //  3a: try to extract from HTML
      startups = extractStartupsFromWebpage(pageContent, accName);
      
      //3b:if HTML parsing failed we use AI knowledge fallback
      if (startups.length === 0) {
        Logger.log('HTML parsing failed for ' + accName + ', trying AI knowledge');
        startups = extractStartupsWithAIKnowledge(accName, portfolioUrl);
      }
    } else {
      //3c:If content fetch failed use AI knowledge
      Logger.log('Could not fetch content for ' + accName + ', trying AI knowledge');
      startups = extractStartupsWithAIKnowledge(accName, portfolioUrl);
    }

    if (startups.length === 0) {
      Logger.log('No startups found for: ' + accName);
      scrapeFailed++;
      continue;
    }

    Logger.log('Found ' + startups.length + ' startups for ' + accName);

    // Step 4: Process each startup
    for (var j = 0; j < startups.length; j++) {
      var startup = startups[j];
      
      var website = normalizeUrl(startup.website);
      var name = startup.name;
      var country = startup.country || 'Unknown';
      var proof = 'Scraped from portfolio page: ' + portfolioUrl;
      
      
      var isEuropean = isEuropeanCountry(country);

      
      if (isEuropean === 'unknown') {
        Logger.log('Country unknown for ' + name + ', asking AI.');
        country = getStartupCountry(name, website);
        isEuropean = isEuropeanCountry(country);
      }

      
      if (isEuropean === 'no') {
        Logger.log('Skipping non-European startup: ' + name + ' (' + country + ')');
        totalSkipped++;
        continue;
      }
      
      if (!website || !name) {
        continue;
      }
      
      if (existingStartups.has(website)) {
        Logger.log('Skipping duplicate startup website: ' + website);
        totalSkipped++;
        continue;
      }
      
      if (existingNames.has(name.toLowerCase())) {
        Logger.log('Skipping duplicate startup name: ' + name);
        totalSkipped++;
        continue;
      }
      
      
      var isValid = isUrlReachable(website);
      var source = 'Web scraped';
      
      if (!isValid) {
        Logger.log('URL not valid for ' + name + ', searching for correct URL');
        
        var correctedUrl = findCorrectUrl(name, 'startup');
        
        if (correctedUrl) {
          website = correctedUrl;
          isValid = true;
          source = 'Web scraped + AI corrected';
          totalCorrected++;
        }
      }
      
      var verified = isValid ? 'YES' : 'NO';
      
      
      startupsSheet.appendRow([
        website,
        name,
        country,
        accWebsite,
        '',
        verified,
        proof
      ]);
      
      existingStartups.add(website);
      existingNames.add(name.toLowerCase());
      totalAdded++;
      
      Logger.log('Added startup: ' + name + ' - Verified: ' + verified);
    }

    acceleratorsProcessed++;

    
    Utilities.sleep(2000);
  }

  var message = 'Done!\n\n' +
    'Accelerators processed: ' + acceleratorsProcessed + '\n' +
    'Accelerators skipped (already done): ' + acceleratorsSkipped + '\n' +
    'Scrape failed: ' + scrapeFailed + '\n' +
    'Startups added: ' + totalAdded + '\n' +
    'URLs corrected: ' + totalCorrected + '\n' +
    'Duplicates skipped: ' + totalSkipped;
  SpreadsheetApp.getUi().alert(message);
}


//this function is for generating value propositions with source explanation
function generateValuePropositions() {
  
  SpreadsheetApp.getUi().alert('Generating value propositions. If it times out run it again - it will continue where it stopped.');
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('startups');
  var data = sheet.getDataRange().getValues();
  
  var generatedCount = 0;
  var skippedCount = 0;
  var errorCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    
    var website = data[i][0];
    var name = data[i][1];
    var country = data[i][2];
    var accelerator = data[i][3];
    var valueProposition = data[i][4];
    var verified = data[i][5];

    // skip if already has a value proposition
    if (valueProposition && valueProposition.trim() !== '') {
      skippedCount++;
      continue;
    }
    
    //skip if no website or name
    if (!website || !name) {
      continue;
    }
    
    //skip if not verified
    if (verified === 'NO') {
      Logger.log('Skipping unverified startup: ' + name);
      skippedCount++;
      continue;
    }
    
    Logger.log('Generating value proposition for: ' + name);
    
    //prompt for value proposition with source
    var prompt = 'For the startup "' + name + '" (website: ' + website + '), provide: ' +
                 '1. A value proposition in this exact format: "' + name + ' helps [target customers] do [what they do] so that [benefit]." ' +
                 '2. The source of your information (what you based this on) ' +
                 'Return ONLY JSON format: ' +
                 '{"value_proposition": "' + name + ' helps...", "source": "Based on homepage description: ..."}' +
                 'Keep value proposition to one sentence. ' +
                 'For source, briefly explain what information you used.';
    
    var response = callOpenAI(prompt);
    
    if (!response) {
      Logger.log('No response for: ' + name);
      errorCount++;
      continue;
    }
    
    //parse the response
    var result;
    try {
      var cleanResponse = cleanJsonResponse(response);
      result = JSON.parse(cleanResponse);
    } catch (error) {
      Logger.log('Error parsing response for ' + name + ': ' + error.toString());
      errorCount++;
      continue;
    }
    
    var valueProp = result.value_proposition || '';
    var source = result.source || 'No source provided';
    
    //clean value proposition
    if (valueProp.startsWith('"') && valueProp.endsWith('"')) {
      valueProp = valueProp.slice(1, -1);
    }
    
    // write to sheet
    // column E (5) = value_proposition
    // column H (8) = value_source
    sheet.getRange(i + 1, 5).setValue(valueProp);
    sheet.getRange(i + 1, 8).setValue(source);
    
    generatedCount++;
    Logger.log('Generated for ' + name + ': ' + valueProp);
    
    
    Utilities.sleep(500);
  }
  
  var message = 'finished \n' +
                'Generated: ' + generatedCount + '\n' +
                'Skipped (already has or not verified): ' + skippedCount + '\n' +
                'Errors: ' + errorCount;
  SpreadsheetApp.getUi().alert(message);
}



