// This function is for the API key that we stored securely in Script Properties
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}


// Here is for custom menu
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('Startup Scouting AI');
  menu.addItem('1-Scout Accelerators', 'scoutAccelerators');
  menu.addItem('2-Update Startups from Accelerators', 'updateStartups');
  menu.addItem('3-Generate Value Propositions', 'generateValuePropositions');
  menu.addSeparator();
  menu.addItem('4-Verify Accelerators', 'verifyAccelerators');
  menu.addItem('5-Verify Startups', 'verifyStartups');
  menu.addToUi();
}


//  function for the OpenAI API 
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

// Cleaning URLs 
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

//  function  for getting all websites already in a sheet so no mor duplicate 
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
    
    // 200-499 are considered "exists" (includes 403 forbidden, 404 not found for some sites)
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






// function for getting all names already in a sheet so no more duplicate
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


// function for cleaning JSON response from AI (removes markdown code blocks)
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



// function for finding correct URL when first one fails
function findCorrectUrl(companyName, companyType) {
  
  // First try: Ask AI for correct URL
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
  
  // Second try: Generate URL variations and test them
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


// function for getting accelerators that already have startups
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


// function for generating possible URL variations from company name
function generateUrlVariations(companyName) {
  
  // Clean the company name
  var name = companyName.toLowerCase().trim();
  
  // Remove common words
  var cleanName = name.replace(/\s+(accelerator|ventures|capital|labs|lab|fund|partners)$/i, '').trim();
  
  // Get the suffix word if exists (like "ventures" in "NexGen Ventures")
  var suffixMatch = name.match(/\s+(ventures|capital|labs|lab|fund|partners)$/i);
  var suffix = suffixMatch ? suffixMatch[1].toLowerCase() : null;
  
  // Create base versions
  var noSpaces = cleanName.replace(/\s+/g, '');
  var withDashes = cleanName.replace(/\s+/g, '-');
  
  var variations = [];
  
  // Standard domain variations
  variations.push('https://www.' + noSpaces + '.com');
  variations.push('https://' + noSpaces + '.com');
  variations.push('https://www.' + noSpaces + '.co');
  variations.push('https://www.' + noSpaces + '.io');
  variations.push('https://www.' + noSpaces + '.org');
  variations.push('https://www.' + withDashes + '.com');
  
  // If has suffix like "ventures", try name.suffix format
  if (suffix) {
    variations.push('https://www.' + noSpaces.replace(suffix, '') + '.' + suffix);
    variations.push('https://' + noSpaces.replace(suffix, '') + '.' + suffix);
  }
  
  // Special case for names like "NexGen Ventures" -> nexgen.ventures
  var words = cleanName.split(/\s+/);
  if (words.length >= 1 && suffix) {
    variations.push('https://www.' + words[0] + '.' + suffix);
    variations.push('https://' + words[0] + '.' + suffix);
  }
  
  return variations;
}





// for finding european accelerators using two-step process with verification
function scoutAccelerators() {
  
  SpreadsheetApp.getUi().alert('Starting. Please wait');
  
  // access the accelerators sheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('accelerators');
  
  // get websites and names that already exist - no more duplicates
  var existingWebsites = getExistingWebsites('accelerators');
  var existingNames = getExistingNames('accelerators');
  
  // Step 1: Ask AI for accelerator NAMES only
  var promptNames = 'Give me a list of 10 real startup accelerators in Europe. ' +
                    'Return ONLY the names, no websites. ' +
                    'Return as JSON array of strings. ' +
                    'Format: ["Name 1", "Name 2", "Name 3"] ' +
                    'Only include well-known, established accelerators.';
  
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
  
  // Step 2: For each name, find and verify website
  for (var i = 0; i < acceleratorNames.length; i++) {
    
    var accName = acceleratorNames[i];
    
    // Skip if name already exists
    if (existingNames.has(accName.toLowerCase())) {
      Logger.log('Skipping duplicate name: ' + accName);
      skippedCount++;
      continue;
    }
    
    Logger.log('Processing: ' + accName);
    
    // Ask AI for website and country
    var promptDetails = 'For the startup accelerator "' + accName + '", provide: ' +
                        '1. Their official website URL ' +
                        '2. The country where they are based ' +
                        'Return ONLY JSON format: {"website": "https://...", "country": "Country"} ' +
                        'Make sure the website is the real official website.';
    
    var responseDetails = callOpenAI(promptDetails);
    
    if (!responseDetails) {
      Logger.log('No response for: ' + accName);
      continue;
    }
    
    // Parse details
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
    
    // Check if website already exists
    if (existingWebsites.has(website)) {
      Logger.log('Skipping duplicate website: ' + website);
      skippedCount++;
      continue;
    }
    
    // Verify the URL
    var isValid = isUrlReachable(website);
    var source = 'AI generated';
    
    // If URL is not valid, try to find correct one
    if (!isValid) {
      Logger.log('URL not valid for ' + accName + ', searching for correct URL...');
      
      var correctedUrl = findCorrectUrl(accName, 'accelerator');
      
      if (correctedUrl) {
        website = correctedUrl;
        isValid = true;
        source = 'AI corrected after first URL failed';
      }
    }
    
    // Add to sheet with all 5 columns
    var verified = isValid ? 'YES' : 'NO';
    sheet.appendRow([website, accName, country, verified, source]);
    
    existingWebsites.add(website);
    existingNames.add(accName.toLowerCase());
    addedCount++;
    
    Logger.log('Added: ' + accName + ' - ' + website + ' - Verified: ' + verified);
    
    // Pause for not hitting API rate limits
    Utilities.sleep(1000);
  }
  
  var message = 'Done. Added ' + addedCount + ' accelerators. Skipped ' + skippedCount + ' duplicates.';
  SpreadsheetApp.getUi().alert(message);
}



// function for finding startups from each accelerator with verification and proof
function updateStartups() {
  
  SpreadsheetApp.getUi().alert('Finding startups from accelerators. If it times out, run again - it will continue where it left off.');
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var acceleratorsSheet = spreadsheet.getSheetByName('accelerators');
  var startupsSheet = spreadsheet.getSheetByName('startups');
  var existingStartups = getExistingWebsites('startups');
  var existingNames = getExistingNames('startups');
  var acceleratorsData = acceleratorsSheet.getDataRange().getValues();
  
  // get accelerators that already have startups (to skip them)
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
    
    // skip if no website
    if (!accWebsite) {
      continue;
    }
    
    // skip accelerators that are not verified
    if (accVerified !== 'YES') {
      Logger.log('Skipping unverified accelerator: ' + accName);
      continue;
    }
    
    // skip accelerators we already processed (have startups for)
    if (processedAccelerators.has(normalizeUrl(accWebsite))) {
      Logger.log('Skipping already processed accelerator: ' + accName);
      acceleratorsSkipped++;
      continue;
    }
    
    Logger.log('Processing accelerator: ' + accName);
    
    // prompt for startups WITH proof of relationship
    var prompt = 'Find 3 startups that graduated from or were part of the accelerator "' + accName + '". ' +
                 'For each startup provide: ' +
                 '1. website (official website URL) ' +
                 '2. name (startup name) ' +
                 '3. country (where startup is based) ' +
                 '4. proof (brief explanation of how you know they are connected to this accelerator) ' +
                 'Return ONLY JSON array. ' +
                 'Format: [{"website": "https://...", "name": "Name", "country": "Country", "proof": "Listed on accelerator website as 2023 batch"}] ' +
                 'Only include startups you are confident about. If unsure, return empty array: []';
    
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
      
      // verify the URL
      var isValid = isUrlReachable(website);
      var source = 'AI generated';
      
      // if URL not valid, try to find correct one
      if (!isValid) {
        Logger.log('URL not valid for ' + name + ', searching for correct URL...');
        
        var correctedUrl = findCorrectUrl(name, 'startup');
        
        if (correctedUrl) {
          website = correctedUrl;
          isValid = true;
          source = 'AI corrected';
          totalCorrected++;
        }
      }
      
      var verified = isValid ? 'YES' : 'NO';
      
      // add to startups sheet
      // columns: website, name, country, accelerator, value_proposition, verified, relationship_proof
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
    
    // pause for rate limits
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



// function for generating value propositions with source explanation
function generateValuePropositions() {
  
  SpreadsheetApp.getUi().alert('Generating value propositions. If it times out, run again - it will continue where it left off.');
  
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
    
    // skip if no website or name
    if (!website || !name) {
      continue;
    }
    
    // skip if not verified (URL doesn't work)
    if (verified === 'NO') {
      Logger.log('Skipping unverified startup: ' + name);
      skippedCount++;
      continue;
    }
    
    Logger.log('Generating value proposition for: ' + name);
    
    // prompt for value proposition WITH source
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
    
    // parse the response
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
    
    // clean value proposition (remove quotes if present)
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
    
    // rate limits
    Utilities.sleep(500);
  }
  
  var message = 'Done!\n' +
                'Generated: ' + generatedCount + '\n' +
                'Skipped (already has or not verified): ' + skippedCount + '\n' +
                'Errors: ' + errorCount;
  SpreadsheetApp.getUi().alert(message);
}







// verifieing accelerators by checking if their URLs are real
function verifyAccelerators() {
  
  SpreadsheetApp.getUi().alert('verification of accelerators. Please Wait');
  
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('accelerators');
  
  var data = sheet.getDataRange().getValues();
  
  if (data[0].length < 4 || data[0][3] !== 'verified') {
    sheet.getRange(1, 4).setValue('verified');
  }
  
  var validCount = 0;
  var invalidCount = 0;
  var skippedCount = 0;
  var invalidList = [];
  
  
  for (var i = 1; i < data.length; i++) {
    
    var website = data[i][0];
    var name = data[i][1];
    var existingStatus = data[i][3];
    
    
    if (!website) {
      continue;
    }
    
    
    if (existingStatus === 'YES' || existingStatus === 'NO') {
      skippedCount++;
      continue;
    }
    
    Logger.log('Verifying: ' + name + ' - ' + website);
    
    
    var isValid = isUrlReachable(website);
    
    
    if (isValid) {
      sheet.getRange(i + 1, 4).setValue('YES');
      validCount++;
    } else {
      sheet.getRange(i + 1, 4).setValue('NO');
      invalidCount++;
      invalidList.push(name + ' (' + website + ')');
    }
    
    Utilities.sleep(300);
  }
  
  
  var message = 'verification done\n\n' +
                'valid URLs: ' + validCount + '\n' +
                'invalid URLs: ' + invalidCount + '\n' +
                'already verified (skipped): ' + skippedCount;
  
  if (invalidCount > 0) {
    message += '\n\nInvalid accelerators:\n' + invalidList.join('\n');
  }
  
  SpreadsheetApp.getUi().alert(message);
}


// verifing startups by checking if their URLs are real
function verifyStartups() {
  
  SpreadsheetApp.getUi().alert('verification for startups. If it times out run it again it will continue where it left off');
  
 
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('startups');
  
  
  var data = sheet.getDataRange().getValues();
  
  if (data[0].length < 6 || data[0][5] !== 'verified') {
    sheet.getRange(1, 6).setValue('verified');
  }
  
  var validCount = 0;
  var invalidCount = 0;
  var skippedCount = 0;
  var invalidList = [];
  
 
  for (var i = 1; i < data.length; i++) {
    
    var website = data[i][0];
    var name = data[i][1];
    var existingStatus = data[i][5];
    
   
    if (!website) {
      continue;
    }
    
    
    if (existingStatus === 'YES' || existingStatus === 'NO') {
      skippedCount++;
      continue;
    }
    
    Logger.log('Verifying: ' + name + ' - ' + website);
    
    
    var isValid = isUrlReachable(website);
    
    
    if (isValid) {
      sheet.getRange(i + 1, 6).setValue('YES');
      validCount++;
    } else {
      sheet.getRange(i + 1, 6).setValue('NO');
      invalidCount++;
      invalidList.push(name);
    }
    
   
    Utilities.sleep(200);
  }
  
 
  var message = 'done \n\n' +
                'valid URLs: ' + validCount + '\n' +
                'Invalid URLs: ' + invalidCount + '\n' +
                'already verified (skipped): ' + skippedCount;
  
  if (invalidCount > 0 && invalidCount <= 10) {
    message += '\n\nInvalid startups:\n' + invalidList.join('\n');
  } else if (invalidCount > 10) {
    message += '\n\n too many invalid to list.check column F for details.';
  }
  
  SpreadsheetApp.getUi().alert(message);
}