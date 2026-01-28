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

// function  for checking if a URL is reachable 
function isUrlReachable(url) {
  
  
  if (!url) {
    return false;
  }
  
  try {
    // fetch the URL
    var options = {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    // check for success or redirect codes
    if (responseCode >= 200 && responseCode < 400) {
      return true;
    } else {
      return false;
    }
    
  } catch (error) {

    Logger.log('URL not reachable: ' + url + ' Error: ' + error.toString());
    return false;
  }
}


function scoutAccelerators() {
 // for finding european accelerators using OpenAI 
  
  // Show a message that we are starting
  SpreadsheetApp.getUi().alert('Starting.Please wait ');
  
  // access the accelerators sheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('accelerators');
  
  //get websites that already exist - no more duplicates
  var existingWebsites = getExistingWebsites('accelerators');
  
  //  prompting OpenAI
  var prompt = 'Give me a list of 10 startup accelerators in Europe. ' +
               'For each accelerator provide: website, name, and country. ' +
               'Return ONLY a JSON array with no extra text. ' +
               'Format: [{"website": "https://example.com", "name": "Example Name", "country": "Country"}]';
  
  // Calling OpenAI
  var response = callOpenAI(prompt);
  
  // check for response
  if (!response) {
    SpreadsheetApp.getUi().alert('Error.Check API key.');
    return;
  }
  
  // log raw response 
  Logger.log('OpenAI Response: ' + response);
  
  // parse the JSON response
  var accelerators;
  try {
    // clean the response
    var cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7);
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3);
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3);
    }
    cleanResponse = cleanResponse.trim();
    
    accelerators = JSON.parse(cleanResponse);
  } catch (error) {
    Logger.log('Error parsing JSON: ' + error.toString());
    Logger.log('Response was: ' + response);
    SpreadsheetApp.getUi().alert('Error: Could not understand OpenAI response. Check the logs.');
    return;
  }
  
  // counting how many we add
  var addedCount = 0;
  var skippedCount = 0;
  
 
  for (var i = 0; i < accelerators.length; i++) {
    var acc = accelerators[i];
    
    // normalize URL
    var website = normalizeUrl(acc.website);
    
    // Check for  website already exists
    if (existingWebsites.has(website)) {
      Logger.log('Skipping duplicate: ' + website);
      skippedCount++;
      continue;
    }
    
    // new row to the sheet
    sheet.appendRow([website, acc.name, acc.country]);
    
   
    existingWebsites.add(website);
    
    addedCount++;
    Logger.log('Added: ' + acc.name);
  }
  
  
  var message = 'Done. Added ' + addedCount + ' new accelerators.';
  if (skippedCount > 0) {
    message += ' Skipped ' + skippedCount + ' duplicates.';
  }
  SpreadsheetApp.getUi().alert(message);
}



//function for finding startups from each accelerator and adding them to the startups sheet
function updateStartups() {
  
  
  SpreadsheetApp.getUi().alert('tryiny to find startups from accelerators. Please Wait');
  
  // both sheets
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var acceleratorsSheet = spreadsheet.getSheetByName('accelerators');
  var startupsSheet = spreadsheet.getSheetByName('startups');
  var existingStartups = getExistingWebsites('startups');
  var acceleratorsData = acceleratorsSheet.getDataRange().getValues();
  var totalAdded = 0;
  var totalSkipped = 0;
  var acceleratorsProcessed = 0;
  
  for (var i = 1; i < acceleratorsData.length; i++) {
    
    var accWebsite = acceleratorsData[i][0];
    var accName = acceleratorsData[i][1];
    var accCountry = acceleratorsData[i][2];
    
    if (!accWebsite) {
      continue;
    }
    
    Logger.log('Processing accelerator: ' + accName);
    
    // prompt for find startups from this accelerator
    var prompt = 'Find 5 startups that are part of or graduated from the accelerator "' + accName + '" (' + accWebsite + '). ' +
                 'For each startup provide: website, name, and country. ' +
                 'Return ONLY a JSON array with no extra text. ' +
                 'Format: [{"website": "https://example.com", "name": "Startup Name", "country": "Country"}] ' +
                 'If you cannot find startups, return an empty array: []';
    
    // call OpenAI
    var response = callOpenAI(prompt);
    
    
    if (!response) {
      Logger.log('No response for accelerator: ' + accName);
      continue;
    }
    
    //parse the response
    var startups;
    try {
      //clean the response
      var cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      cleanResponse = cleanResponse.trim();
      
      startups = JSON.parse(cleanResponse);
    } catch (error) {
      Logger.log('error parsing response for ' + accName + ': ' + error.toString());
      continue;
    }
    
    for (var j = 0; j < startups.length; j++) {
      var startup = startups[j];
      
      var website = normalizeUrl(startup.website);
      
      if (!website) {
        continue;
      }
      
      if (existingStartups.has(website)) {
        Logger.log('skipping duplicate startup: ' + website);
        totalSkipped++;
        continue;
      }
      
      
      // Columns adding to startup sheet
      startupsSheet.appendRow([
        website,
        startup.name,
        startup.country,
        accWebsite,
        ''  
      ]);
      
     
      existingStartups.add(website);
      
      totalAdded++;
      Logger.log('Added startup: ' + startup.name);
    }
    
    acceleratorsProcessed++;
    
    //pause for not hitting API rate limits
    Utilities.sleep(1000);
  }
  
 
  var message = 'Processed ' + acceleratorsProcessed + ' accelerators. ' +
                'Added ' + totalAdded + ' new startups. ' +
                'Skipped ' + totalSkipped + ' duplicates.';
  SpreadsheetApp.getUi().alert(message);
}


//function for generating value propositions for startups that don't have 
function generateValuePropositions() {
  
 
  SpreadsheetApp.getUi().alert(' generating value propositions.Please Wait');
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

    if (valueProposition && valueProposition.trim() !== '') {
      skippedCount++;
      continue;
    }
    
   
    if (!website || !name) {
      continue;
    }
    
    Logger.log('value proposition for: ' + name);
    
    //prompt for value proposition
    var prompt = 'Write a short value proposition for the startup "' + name + '" (website: ' + website + '). ' +
                 'Use exactly this format: "' + name + ' helps [target customers] do [what they do] so that [benefit]." ' +
                 'Keep it to one sentence only. ' +
                 'Return ONLY the value proposition text nothing else.';
    
    
    var response = callOpenAI(prompt);
    
    if (!response) {
      Logger.log('No response for: ' + name);
      errorCount++;
      continue;
    }
    
    var cleanValue = response.trim();
    
    // Remove quotes
    if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
      cleanValue = cleanValue.slice(1, -1);
    }
    
    sheet.getRange(i + 1, 5).setValue(cleanValue);
    
    generatedCount++;
    Logger.log('Generated: ' + cleanValue);
    
    //rate limits
    Utilities.sleep(500);
  }
  

  var message = 'Generated ' + generatedCount + ' value propositions. ' +
                'Skipped ' + skippedCount + ' (already had one). ' +
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