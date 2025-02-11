// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const xlsx = require('xlsx');

// const scrapeData = async (url) => {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening page...");

//         //Retry mechanism for page navigation
//         const maxRetries = 5;
//         let retries = 0;
//         let pageLoaded = false;

//         while (retries < maxRetries && !pageLoaded) {
//             try {
//                 await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
//                 pageLoaded = true;
//             } catch (error) {
//                 retries++;
//                 console.error(`❌ Navigation failed (Attempt ${retries}/${maxRetries}): ${error.message}`);
//                 if (retries >= maxRetries) {
//                     console.error("❌ Failed to load the page after multiple attempts.");
//                     throw new Error("Network issue - unable to load page.");
//                 }
//                 await new Promise(res => setTimeout(res, 5000)); // Wait before retrying
//             }
//         }

//         console.log("Page loaded successfully!");


//         //Extract county list
//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll('a'))
//                 .filter(a => a.textContent.trim().endsWith('NJ')) // Only NJ counties
//                 .map(a => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith('http') ? a.href : window.location.origin + a.getAttribute('href')
//                 }));
//         });

//        // Display the results
//         console.log("Counties ending with NJ:", counties);

//         let extractedData = [];

//         for (const county of counties) {
//             console.log(`Visiting County: ${county.name}`);

//             await page.goto(county.link, { waitUntil: 'domcontentloaded' });

//            // ✅ Wait for dropdown menu to appear
//             const dropdownSelector = "#PropertyStatusDate";
//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//                // ✅ Get first available date from the dropdown
//                 const firstDate = await page.evaluate((dropdownSelector) => {
//                     const dropdown = document.querySelector(dropdownSelector);
//                     return dropdown ? dropdown.options[1]?.value : null; // Get the first option (excluding placeholder)
//                 }, dropdownSelector);

//                 if (firstDate) {
//                     await page.select(dropdownSelector, firstDate);
//                     console.log(`✅ Selected First Available Date: ${firstDate}`);
//                 } else {
//                     console.log(`⚠️ No date available in dropdown for ${county.name}`);
//                     return;
//                 }

//                // ✅ Wait for results to update
//                 await page.waitForTimeout(5000);
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date`);
//             }

//            // Wait until sale rows are loaded
//             try {
//                 await page.waitForSelector('a[href*="/Sales/SaleDetails?PropertyId="]', { timeout: 10000 });
//             } catch (error) {
//                 console.log(`No sales data found for ${county.name}`);
//                 continue; // Skip this county if no data is found
//             }

//             const salesData = await page.evaluate(() => {
//                 return Array.from(document.querySelectorAll('tr')).map(row => {
//                     const cells = row.querySelectorAll('td');

//                     return {  // Extracts link from first <td>
//                         detailsLink: cells[0]?.querySelector('a')?.href || '',
//                         sheriffNumber: cells[1]?.innerText.trim() || '',
//                         saleDate: cells[2]?.innerText.trim() || '',
//                         status: cells[6]?.innerText.trim() || '',


//                     };
//                 }).filter(data => data.sheriffNumber); // Filter out empty rows
//             });
//             console.log("Extracted Sales Data:", salesData);

//            // **✅ Visit each sale detail page**
//             for (let sale of salesData) {
//                 if (sale.detailsLink) {
//                     try {
//                         await page.goto(sale.detailsLink, { waitUntil: 'domcontentloaded' });

//                        // **Extract additional sale details**
//                         sale.additionalInfo = await page.evaluate(() => {
//                             let details = {};
//                             document.querySelectorAll('table tr').forEach(row => {
//                                 const cells = row.querySelectorAll('td');
//                                 if (cells.length === 2) {
//                                     details[cells[0].innerText.trim()] = cells[1].innerText.trim();
//                                 }
//                             });
//                             return details;
//                         });

//                         console.log(`📌 Details Extracted for Sheriff #${sale.sheriffNumber}`);
//                         await page.goBack(); // Return to listing page
//                     } catch (error) {
//                         console.error(`❌ Failed to load details for Sheriff #${sale.sheriffNumber}`);
//                         continue;
//                     }
//                 }
//             }

//             extractedData = extractedData.concat(salesData);
//             console.log(extractedData, 'extract--')
//         }

//        // Compare with last database
//         const changes = analyzeChanges(previousData, extractedData);

//        // Save to JSON (or push to DB)
//         fs.writeFileSync(dbFile, JSON.stringify(extractedData, null, 2));

//         console.log("Data extraction completed.");
//         console.table(changes, 'changes--');
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// };

// function analyzeChanges(previousData, newData) {
//     let changes = [];
//     const prevMap = new Map(previousData.map(item => [item.sheriffNumber, item]));

//     newData.forEach(entry => {
//         const oldEntry = prevMap.get(entry.sheriffNumber);

//         if (!oldEntry) {
//             changes.push({ ...entry, changeType: "Newly Added" });
//         } else if (oldEntry.saleDate !== entry.saleDate) {
//             changes.push({ ...entry, changeType: "Active New Date" });
//         } else {
//             changes.push({ ...entry, changeType: "Active" });
//         }
//     });

//     previousData.forEach(entry => {
//         if (!newData.find(newEntry => newEntry.sheriffNumber === entry.sheriffNumber)) {
//             changes.push({ ...entry, changeType: "Not in the System" });
//         }
//     });

//     return changes;
// };


// **Run the script**
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("Starting Scraper...");
//     await scrapeData(url);
// })();


//.......................................................................................................
//a2

// const scrapeData = async (url) => {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening page...");

//         // Retry mechanism for page navigation
//         const maxRetries = 5;
//         let retries = 0;
//         let pageLoaded = false;

//         while (retries < maxRetries && !pageLoaded) {
//             try {
//                 await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
//                 pageLoaded = true;
//             } catch (error) {
//                 retries++;
//                 console.error(`❌ Navigation failed (Attempt ${retries}/${maxRetries}): ${error.message}`);
//                 if (retries >= maxRetries) {
//                     console.error("❌ Failed to load the page after multiple attempts.");
//                     throw new Error("Network issue - unable to load page.");
//                 }
//                 await new Promise(res => setTimeout(res, 5000)); // Wait before retrying
//             }
//         }

//         console.log("Page loaded successfully!");

//         // Extract county list
//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll('a'))
//                 .filter(a => a.textContent.trim().endsWith('NJ')) // Only NJ counties
//                 .map(a => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith('http') ? a.href : window.location.origin + a.getAttribute('href')
//                 }));
//         });

//         console.log("Counties ending with NJ:", counties);
//         let extractedData = [];

//         for (const county of counties) {
//             console.log(`Visiting County: ${county.name}`);
//             await page.goto(county.link, { waitUntil: 'domcontentloaded' });

//             // ✅ Wait for dropdown menu to appear
//             const dropdownSelector = "#PropertyStatusDate";
//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//                 // ✅ Get first available date from the dropdown
//                 const firstDate = await page.evaluate((dropdownSelector) => {
//                     const dropdown = document.querySelector(dropdownSelector);
//                     return dropdown ? dropdown.options[1]?.value : null;
//                 }, dropdownSelector);

//                 if (firstDate) {
//                     await page.select(dropdownSelector, firstDate);
//                     console.log(`✅ Selected First Available Date: ${firstDate}`);
//                 } else {
//                     console.log(`⚠️ No date available in dropdown for ${county.name}`);
//                     return;
//                 }

//                 // ✅ Wait for results to update
//                 await page.waitForTimeout(5000);
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date`);
//             }

//             // Wait until sale rows are loaded
//             try {
//                 await page.waitForSelector('a[href*="/Sales/SaleDetails?PropertyId="]', { timeout: 10000 });
//             } catch (error) {
//                 console.log(`No sales data found for ${county.name}`);
//                 continue;
//             }

//             // Extract sales data
//             const salesData = await page.evaluate(() => {
//                 const rows = document.querySelectorAll('table tbody tr');
//                 const data = [];

//                 rows.forEach(row => {
//                     const cells = row.querySelectorAll('td');
//                     if (cells.length >= 7) { // Ensure enough columns are present
//                         const detailsLink = cells[0]?.querySelector('a')?.href || '';
//                         const sheriffNumber = cells[1]?.innerText.trim() || '';
//                         const status = cells[2]?.innerText.trim() || '';
//                         const saleDate = cells[3]?.innerText.trim() || '';

//                         data.push({
//                             detailsLink,
//                             sheriffNumber,
//                             status,
//                             saleDate
//                         });
//                     }
//                 });

//                 return data;
//             });

//             console.log("Extracted Sales Data:", salesData);

//             // **✅ Visit each sale detail page**
//             for (let sale of salesData) {
//                 if (sale.detailsLink) {
//                     try {
//                         await page.goto(sale.detailsLink, { waitUntil: 'domcontentloaded' });

//                         // **Extract additional sale details**
//                         sale.additionalInfo = await page.evaluate(() => {
//                             let details = {};
//                             document.querySelectorAll('table tr').forEach(row => {
//                                 const cells = row.querySelectorAll('td');
//                                 if (cells.length === 2) {
//                                     details[cells[0].innerText.trim()] = cells[1].innerText.trim();
//                                 }
//                             });
//                             return details;
//                         });

//                         await page.goBack(); // Return to listing page
//                     } catch (error) {
//                         console.error(`❌ Failed to load details for Sheriff #${sale.sheriffNumber}`);
//                         continue;
//                     }
//                 }
//             }

//             extractedData = extractedData.concat(salesData);
//         }

//         // Compare with last database
//         const previousData = JSON.parse(fs.existsSync('db.json') ? fs.readFileSync('db.json') : '[]');
//         const changes = analyzeChanges(previousData, extractedData);

//         // Save to JSON
//         fs.writeFileSync('db.json', JSON.stringify(extractedData, null, 2));

//         console.log("Data extraction completed.");
//         console.table(changes);
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// };

// function analyzeChanges(previousData, newData) {
//     let changes = [];
//     const prevMap = new Map(previousData.map(item => [item.sheriffNumber, item]));

//     newData.forEach(entry => {
//         const oldEntry = prevMap.get(entry.sheriffNumber);

//         if (!oldEntry) {
//             changes.push({ ...entry, changeType: "Newly Added" });
//         } else if (oldEntry.saleDate !== entry.saleDate) {
//             changes.push({ ...entry, changeType: "Active New Date" });
//         } else {
//             changes.push({ ...entry, changeType: "Active" });
//         }
//     });

//     previousData.forEach(entry => {
//         if (!newData.find(newEntry => newEntry.sheriffNumber === entry.sheriffNumber)) {
//             changes.push({ ...entry, changeType: "Not in the System" });
//         }
//     });

//     return changes;
// }

// // **Run the script**
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("Starting Scraper...");
//     await scrapeData(url);
// })();

//---------------------------------------------------------------------------------------------------------
//a3

// const scrapeData = async (url) => {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening page...");

//         // Retry mechanism for page navigation
//         const maxRetries = 5;
//         let retries = 0;
//         let pageLoaded = false;

//         while (retries < maxRetries && !pageLoaded) {
//             try {
//                 await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
//                 pageLoaded = true;
//             } catch (error) {
//                 retries++;
//                 console.error(`❌ Navigation failed (Attempt ${retries}/${maxRetries}): ${error.message}`);
//                 if (retries >= maxRetries) {
//                     console.error("❌ Failed to load the page after multiple attempts.");
//                     throw new Error("Network issue - unable to load page.");
//                 }
//                 await new Promise(res => setTimeout(res, 5000)); // Wait before retrying
//             }
//         }

//         console.log("Page loaded successfully!");

// Extract county list
//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll('a'))
//                 .filter(a => a.textContent.trim().endsWith('NJ')) // Only NJ counties
//                 .map(a => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith('http') ? a.href : window.location.origin + a.getAttribute('href')
//                 }));
//         });

//         console.log("Counties ending with NJ:", counties);
//         let extractedData = [];

//         for (const county of counties) {
//             console.log(`Visiting County: ${county.name}`);
//             await page.goto(county.link, { waitUntil: 'domcontentloaded' });

//             // ✅ Wait for dropdown menu to appear
//             const dropdownSelector = "#PropertyStatusDate";
//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//                 // ✅ Get first available date from the dropdown
//                 const firstDate = await page.evaluate((dropdownSelector) => {
//                     const dropdown = document.querySelector(dropdownSelector);
//                     return dropdown ? dropdown.options[1]?.value : null;
//                 }, dropdownSelector);

//                 if (firstDate) {
//                     await page.select(dropdownSelector, firstDate);
//                     console.log(`✅ Selected First Available Date: ${firstDate}`);
//                 } else {
//                     console.log(`⚠️ No date available in dropdown for ${county.name}`);
//                     return;
//                 }

//                 // ✅ Wait for results to update
//                 await page.waitForTimeout(5000);
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date`);
//             }

//             // Wait until sale rows are loaded
//             try {
//                 await page.waitForSelector('a[href*="/Sales/SaleDetails?PropertyId="]', { timeout: 10000 });
//             } catch (error) {
//                 console.log(`No sales data found for ${county.name}`);
//                 continue;
//             }

//             // Extract sales data
//             const salesData = await page.evaluate(() => {
//                 const rows = document.querySelectorAll('table tbody tr');
//                 const data = [];

//                 rows.forEach(row => {
//                     const cells = row.querySelectorAll('td');
//                     if (cells.length >= 7) { // Ensure enough columns are present
//                         const detailsLink = cells[0]?.querySelector('a')?.href || '';
//                         const sheriffNumber = cells[1]?.innerText.trim() || '';
//                         const status = cells[2]?.innerText.trim() || '';
//                         const saleDate = cells[3]?.innerText.trim() || '';

//                         data.push({
//                             detailsLink,
//                             sheriffNumber,
//                             status,
//                             saleDate
//                         });
//                     }
//                 });
//                 return data;
//             });

//             console.log("Extracted Sales Data:", salesData);

//             extractedData = extractedData.concat(salesData);
//         }

//         // Save extracted data to Excel
//         saveToExcel(extractedData);

//         console.log("Data extraction completed.");
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// };

// const saveToExcel = (data) => {
//     const fileName = "SalesData.xlsx";
//     let workbook;
//     let sheetName = "Sales";

//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//     } else {
//         workbook = xlsx.utils.book_new();
//     }


//     const worksheet = xlsx.utils.json_to_sheet(data);
//     xlsx.utils.book_append_sheet(workbook, worksheet, sheetName, true);
//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved to ${fileName}`);
// };

// **Run the script**
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("Starting Scraper...");
//     await scrapeData(url);
// })();

//------------------------------------------------------------------------------------------
//a4




// const scrapeData = async (url) => {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening main page...");

//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//         console.log("✅ Page loaded successfully!");

//         // Extract NJ county list
//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll('a'))
//                 .filter(a => a.textContent.trim().endsWith('NJ')) // Only NJ counties
//                 .map(a => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith('http') ? a.href : window.location.origin + a.getAttribute('href')
//                 }));
//         });

//         console.log("🏙️ Counties found:", counties.length);
//         let extractedData = [];

//         for (const county of counties) {
//             console.log(`\n🔵 Visiting County: ${county.name}`);
//             await page.goto(county.link, { waitUntil: 'domcontentloaded' });

//             const dropdownSelector = "#PropertyStatusDate";
//             const searchButtonSelector = 'input[value="Search"]';

//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//                 // ✅ Get all available dates from the dropdown
//                 const availableDates = await page.evaluate((dropdownSelector) => {
//                     const dropdown = document.querySelector(dropdownSelector);
//                     return dropdown ? Array.from(dropdown.options).slice(1).map(option => option.value) : [];
//                 }, dropdownSelector);
//                 console.log(availableDates.length, 'available dates--');

//                 if (availableDates.length === 0) {
//                     console.log(`⚠️ No dates available in dropdown for ${county.name}`);
//                     continue;
//                 }

//                 for (const saleDate of availableDates) {
//                     console.log(`📅 Selecting Sale Date: ${saleDate}`);

//                     // Wait for dropdown to be visible and enabled before interacting
//                     await page.waitForSelector(dropdownSelector, { timeout: 10000 });
//                     await page.select(dropdownSelector, saleDate);
//                     await page.waitForTimeout(2000); // Allow dropdown to update

//                     // ✅ Click the search button
//                     await page.waitForSelector(searchButtonSelector, { timeout: 5000 });
//                     await page.click(searchButtonSelector);
//                     console.log(`🔍 Clicked Search button...`);

//                     // ✅ Wait for results to update
//                     await page.waitForTimeout(5000);

//                     // ✅ Extract Sheriff Number, Status, Sale Date
//                     try {
//                         await page.waitForSelector('table tbody tr', { timeout: 10000 });

//                         const salesData = await page.evaluate((saleDate, countyName) => {
//                             const rows = document.querySelectorAll('table tbody tr');
//                             const data = [];

//                             rows.forEach(row => {
//                                 const cells = row.querySelectorAll('td');
//                                 if (cells.length >= 4) { // Ensure enough columns are present
//                                     data.push({
//                                         county: countyName,
//                                         sheriffNumber: cells[1]?.innerText.trim() || 'N/A',
//                                         status: cells[2]?.innerText.trim() || 'N/A',
//                                         saleDate: cells[3]?.innerText.trim() || 'N/A',
//                                         selectedDate: saleDate // Store the dropdown date for reference
//                                     });
//                                 }
//                             });
//                             return data;
//                         }, saleDate, county.name);

//                         console.log(`✅ Extracted ${salesData.length} records for ${county.name} on ${saleDate}`);
//                         console.log(data, 'data--')
//                         extractedData = extractedData.concat(salesData);

//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }

//                     // ✅ Reset page before selecting the next date
//                     await page.goto(county.link, { waitUntil: 'domcontentloaded' });
//                     await page.waitForSelector(dropdownSelector, { timeout: 10000 });
//                 }

//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }

//         // ✅ Save extracted data to Excel
//         saveToExcel(extractedData);

//         console.log("✅ Data extraction completed.");
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// };

// // Function to save extracted data to an Excel file
// const saveToExcel = (data) => {
//     const fileName = "SalesData.xlsx";
//     let workbook;
//     let sheetName = "Sales";

//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//     } else {
//         workbook = xlsx.utils.book_new();
//     }

//     const worksheet = xlsx.utils.json_to_sheet(data);
//     xlsx.utils.book_append_sheet(workbook, worksheet, sheetName, true);
//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved to ${fileName}`);
// };

// // **Run the script**
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();

//-------------------------------------------------------------------------------------
//a5

// const scrapeData = async (url) => {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening main page...");

//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//         console.log("✅ Page loaded successfully!");

//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll('a'))
//                 .filter(a => a.textContent.trim().endsWith('NJ'))
//                 .map(a => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith('http') ? a.href : window.location.origin + a.getAttribute('href')
//                 }));
//         });

//         console.log("🏙️ Counties found:", counties.length);
//         let extractedData = [];

//         const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

//         for (const county of counties) {
//             console.log(`\n🔵 Visiting County: ${county.name}`);
//             await page.goto(county.link, { waitUntil: 'domcontentloaded' });

//             const dropdownSelector = "#PropertyStatusDate";
//             const searchButtonSelector = 'input[value="Search"]';

//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//                 let availableDates = await page.evaluate(() => {
//                     const dropdown = document.querySelector("#PropertyStatusDate");
//                     return dropdown ? Array.from(dropdown.options).map(option => option.value).filter(date => date.trim() !== '') : [];
//                 });

//                 console.log("📅 Available Sale Dates:", availableDates);

//                 if (availableDates.length === 0) {
//                     console.log(`⚠️ No dates available in dropdown for ${county.name}`);
//                     continue;
//                 }

//                 for (const saleDate of availableDates) {
//                     console.log(`📅 Selecting Sale Date: ${saleDate}`);

//                     await page.select(dropdownSelector, saleDate);
//                     await new Promise(resolve => setTimeout(resolve, 2000));

//                     await page.waitForSelector(searchButtonSelector, { timeout: 10000 });
//                     await page.click(searchButtonSelector);
//                     console.log("🔍 Clicked Search button...");

//                     await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {
//                         console.log("⚠️ Page reload timeout, proceeding with extraction...");
//                     });

//                     try {
//                         await page.waitForSelector('table tbody tr', { timeout: 10000 });

//                         const today = new Date();
//                         console.log(today, 'today--')

//                         const salesData = await page.evaluate((saleDate, today) => {
//                             const rows = document.querySelectorAll('table tbody tr');
//                             const data = [];

//                             for (const row of rows) {
//                                 const cells = row.querySelectorAll('td');
//                                 if (cells.length >= 4) {
//                                     const sheriffNumber = cells[1]?.innerText.trim() || '';
//                                     let status = "";

//                                     if (saleDate === today) {
//                                         status = "Active";
//                                     } else if (saleDate > today) {
//                                         status = "Not in the system";
//                                     } else {
//                                         status = "Upcoming";
//                                     }

//                                     data.push({ sheriffNumber, saleDate, status });
//                                 }
//                             }
//                             return data;
//                         }, saleDate, today);

//                         console.log(`✅ Extracted ${salesData.length} records for ${county.name} on ${saleDate}`);
//                         extractedData = extractedData.concat(salesData);
//                         console.log(extractedData, 'extracted data-------');
//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }

//                     await page.goto(county.link, { waitUntil: 'domcontentloaded' });
//                 }
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }

//         saveToExcel(extractedData);
//         console.log("✅ Data extraction completed.");
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// };

// const saveToExcel = (data) => {
//     const fileName = "SalesData.xlsx";
//     let workbook;
//     let sheetName = "Sales";

//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//         const sheet = workbook.Sheets[sheetName];
//         const existingData = xlsx.utils.sheet_to_json(sheet) || [];
//         data = [...existingData, ...data];
//     } else {
//         workbook = xlsx.utils.book_new();
//     }

//     const worksheet = xlsx.utils.json_to_sheet(data);
//     xlsx.utils.book_append_sheet(workbook, worksheet, sheetName, true);
//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved to ${fileName}`);
// };

// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();


//--------------------------------------------------------------------------------------------
//a6

// const scrapeData = async (url) => {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening sales search page...");

//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//         console.log("✅ Page loaded successfully!");

//         const dropdownSelector = "#PropertyStatusDate";
//         const searchButtonSelector = 'input[value="Search"]';

//         await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//         let availableDates = await page.evaluate(() => {
//             const dropdown = document.querySelector("#PropertyStatusDate");
//             return dropdown ? Array.from(dropdown.options).map(option => option.value).filter(date => date.trim() !== '') : [];
//         });

//         console.log("📅 Available Sale Dates:", availableDates);
//         let extractedData = [];

//         for (const saleDate of availableDates) {
//             console.log(`\n📅 Selecting Sale Date: ${saleDate}`);

//             await page.select(dropdownSelector, saleDate);
//             await new Promise(resolve => setTimeout(resolve, 2000));

//             await page.waitForSelector(searchButtonSelector, { timeout: 10000 });
//             await page.click(searchButtonSelector);
//             console.log("🔍 Clicked Search button...");

//             await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {
//                 console.log("⚠️ Page reload timeout, proceeding with extraction...");
//             });

//             try {
//                 await page.waitForSelector('table tbody tr', { timeout: 10000 });

//                 const salesData = await page.evaluate((saleDate) => {
//                     const rows = document.querySelectorAll('table tbody tr');
//                     const data = [];

//                     rows.forEach(row => {
//                         const cells = row.querySelectorAll('td');
//                         if (cells.length >= 4) {
//                             data.push({
//                                 sheriffNumber: cells[1]?.innerText.trim() || 'N/A',
//                                 status: cells[2]?.innerText.trim() || 'N/A',
//                                 saleDate: cells[3]?.innerText.trim() || 'N/A',
//                                 selectedDate: saleDate
//                             });
//                         }
//                     });
//                     return data;
//                 }, saleDate);

//                 console.log(`✅ Extracted ${salesData.length} records for Sale Date: ${saleDate}`);
//                 extractedData = extractedData.concat(salesData);
//                 console.log(extractedData, 'extracted data----')
//             } catch (error) {
//                 console.log(`⚠️ No sales data found for Sale Date: ${saleDate}`);
//             }

//             await page.goto(url, { waitUntil: 'domcontentloaded' });
//         }

//         saveToExcel(extractedData);
//         console.log("✅ Data extraction completed.");
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//     }
// };

//---------------------------------------------------------------------------------------------
//a7

// const fileName = "SalesData.xlsx";
// let lastStoredData = loadPreviousData(); // Load previous data for comparison

// async function scrapeData(url) {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening main page...");

//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//         console.log("✅ Page loaded successfully!");

//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll('a'))
//                 .filter(a => a.textContent.trim().endsWith('NJ'))
//                 .map(a => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith('http') ? a.href : window.location.origin + a.getAttribute('href')
//                 }));
//         });

//         console.log("🏙️ Counties found:", counties.length);
//         let extractedData = [];

//         for (const county of counties) {
//             console.log(`\n🔵 Visiting County: ${county.name}`);
//             await page.goto(county.link, { waitUntil: 'domcontentloaded' });

//             const dropdownSelector = "#PropertyStatusDate";
//             const searchButtonSelector = 'input[value="Search"]';

//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//                 let availableDates = await page.evaluate(() => {
//                     const dropdown = document.querySelector("#PropertyStatusDate");
//                     return dropdown ? Array.from(dropdown.options).map(option => option.value).filter(date => date.trim() !== '') : [];
//                 });

//                 console.log("📅 Available Sale Dates:", availableDates);

//                 if (availableDates.length === 0) {
//                     console.log(`⚠️ No dates available in dropdown for ${county.name}`);
//                     continue;
//                 }

//                 for (const saleDate of availableDates) {
//                     console.log(`📅 Selecting Sale Date: ${saleDate}`);

//                     await page.select(dropdownSelector, saleDate);
//                     await new Promise(resolve => setTimeout(resolve, 2000));

//                     await page.waitForSelector(searchButtonSelector, { timeout: 10000 });
//                     await page.click(searchButtonSelector);
//                     console.log("🔍 Clicked Search button...");

//                     await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {
//                         console.log("⚠️ Page reload timeout, proceeding with extraction...");
//                     });

//                     try {
//                         await page.waitForSelector('table tbody tr', { timeout: 10000 });

//                         const salesData = await page.evaluate(() => {
//                             const rows = document.querySelectorAll('table tbody tr');
//                             const data = [];

//                             for (const row of rows) {
//                                 const cells = row.querySelectorAll('td');
//                                 if (cells.length >= 4) {
//                                     const sheriffNumber = cells[1]?.innerText.trim() || '';
//                                     const saleDate = cells[2]?.innerText.trim() || '';

//                                     data.push({ sheriffNumber, saleDate });
//                                 }
//                             }
//                             return data;
//                         });

//                         salesData.forEach(item => {
//                             item.status = getStatus(item.sheriffNumber, item.saleDate);
//                         });

//                         console.log(`✅ Extracted ${salesData.length} records for ${county.name} on ${saleDate}`);
//                         extractedData = extractedData.concat(salesData);
//                         console.log(extractedData, 'extracted data--')
//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }

//                     await page.goto(county.link, { waitUntil: 'domcontentloaded' });
//                 }
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }

//         saveToExcel(extractedData);
//         console.log("✅ Data extraction completed.");
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// }

// /**
//  * Load previous sales data from Excel for comparison
//  */
// function loadPreviousData() {
//     if (fs.existsSync(fileName)) {
//         const workbook = xlsx.readFile(fileName);
//         const sheet = workbook.Sheets["Sales"];
//         return xlsx.utils.sheet_to_json(sheet) || [];
//     }
//     return [];
// }

// /**
//  * Determine the status of each sale entry
//  */
// function getStatus(sheriffNumber, saleDate) {
//     const lastEntry = lastStoredData.find(entry => entry.sheriffNumber === sheriffNumber);

//     if (lastEntry) {
//         if (lastEntry.saleDate === saleDate) {
//             return "Active"; // Matches previous sale data
//         } else {
//             return "Active New Date"; // Sheriff number exists but sale date changed
//         }
//     } else {
//         const isPreviouslyStored = lastStoredData.some(entry => entry.saleDate === saleDate);
//         return isPreviouslyStored ? "Not in the system" : "Newly Added";
//     }
// }

// /**
//  * Save extracted data to Excel file grouped by sales date
//  */
// function saveToExcel(data) {
//     if (!Array.isArray(data) || data.length === 0) {
//         console.error("❌ No data to save.");
//         return;
//     }

//     let workbook;
//     let sheetName = "Sales";

//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//     } else {
//         workbook = xlsx.utils.book_new();
//     }

//     // Grouping data by sales date
//     const groupedData = {};
//     data.forEach((item) => {
//         if (!groupedData[item.saleDate]) {
//             groupedData[item.saleDate] = [];
//         }
//         groupedData[item.saleDate].push([item.sheriffNumber, item.saleDate, item.status]);
//     });

//     // Get current search date
//     const searchDate = new Date().toLocaleDateString("en-GB").split("/").reverse().join("-"); // Format: YYYY-MM-DD

//     // Prepare data for Excel
//     let formattedData = [[`Search date : ${searchDate}`], ["Sheriff #", "Sales Date", "Status"]];

//     Object.keys(groupedData).sort().forEach((saleDate) => {
//         formattedData.push([""]); // Blank row for separation
//         formattedData.push([`Sales Date: ${saleDate}`]); // Sales date as a section header
//         formattedData.push(["Sheriff #", "Sales Date", "Status"]); // Headers for each section
//         formattedData = formattedData.concat(groupedData[saleDate]);
//     });

//     // Create worksheet
//     const worksheet = xlsx.utils.aoa_to_sheet(formattedData);

//     // Save to Excel
//     xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
//     xlsx.writeFile(workbook, fileName);

//     console.log(`✅ Data saved successfully in ${fileName}!`);
// }

// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();

//---------------------------------------------------------------------------------------------
//a8


// const xlsx = require("xlsx");
// const fs = require("fs");
// const puppeteer = require("puppeteer");

// const fileName = "SalesData.xlsx";
// let workbook;
// let worksheet;
// let lastStoredData = loadPreviousData(); // Load previous data for comparison

// // Initialize Excel file
// function initializeExcel() {
//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//         worksheet = workbook.Sheets["Sales"]; // Load existing sheet
//         if (!worksheet) {
//             worksheet = xlsx.utils.aoa_to_sheet([]);
//             xlsx.utils.book_append_sheet(workbook, worksheet, "Sales");
//         }
//     } else {
//         workbook = xlsx.utils.book_new();
//         worksheet = xlsx.utils.aoa_to_sheet([]);
//         xlsx.utils.book_append_sheet(workbook, worksheet, "Sales");
//     }
// }

// // Save data to Excel incrementally
// function saveToExcelIncremental(data, searchDate) {
//     if (!Array.isArray(data) || data.length === 0) {
//         console.error("❌ No data to save.");
//         return;
//     }

//     // Prepare data for Excel
//     let formattedData = [[`Search date : ${searchDate}`], ["Sheriff #", "Sales Date", "Status"]];
//     formattedData = formattedData.concat(data.map((item) => [item.sheriffNumber, item.saleDate, item.status]));

//     // Append data to the worksheet
//     xlsx.utils.sheet_add_aoa(worksheet, formattedData, { origin: -1 });

//     // Save to Excel
//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved incrementally in ${fileName}!`);
// }

// // Scrape data from the website
// async function scrapeData(url) {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         console.log("Opening main page...");

//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//         console.log("✅ Page loaded successfully!");

//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll("a"))
//                 .filter((a) => a.textContent.trim().endsWith("NJ"))
//                 .map((a) => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith("http") ? a.href : window.location.origin + a.getAttribute("href"),
//                 }));
//         });

//         console.log("🏙️ Counties found:", counties.length);
//         let extractedData = [];

//         for (const county of counties) {
//             console.log(`\n🔵 Visiting County: ${county.name}`);
//             await page.goto(county.link, { waitUntil: "domcontentloaded" });

//             const dropdownSelector = "#PropertyStatusDate";
//             const searchButtonSelector = 'input[value="Search"]';

//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });

//                 let availableDates = await page.evaluate(() => {
//                     const dropdown = document.querySelector("#PropertyStatusDate");
//                     return dropdown
//                         ? Array.from(dropdown.options)
//                             .map((option) => option.value)
//                             .filter((date) => date.trim() !== "")
//                         : [];
//                 });

//                 console.log("📅 Available Sale Dates:", availableDates);

//                 if (availableDates.length === 0) {
//                     console.log(`⚠️ No dates available in dropdown for ${county.name}`);
//                     continue;
//                 }

//                 for (const saleDate of availableDates) {
//                     console.log(`📅 Selecting Sale Date: ${saleDate}`);

//                     await page.select(dropdownSelector, saleDate);
//                     await new Promise((resolve) => setTimeout(resolve, 2000));

//                     await page.waitForSelector(searchButtonSelector, { timeout: 10000 });
//                     await page.click(searchButtonSelector);
//                     console.log("🔍 Clicked Search button...");

//                     await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {
//                         console.log("⚠️ Page reload timeout, proceeding with extraction...");
//                     });

//                     try {
//                         await page.waitForSelector("table tbody tr", { timeout: 10000 });

//                         const salesData = await page.evaluate(() => {
//                             const rows = document.querySelectorAll("table tbody tr");
//                             const data = [];

//                             for (const row of rows) {
//                                 const cells = row.querySelectorAll("td");
//                                 if (cells.length >= 4) {
//                                     const sheriffNumber = cells[1]?.innerText.trim() || "";
//                                     const saleDate = cells[2]?.innerText.trim() || "";

//                                     data.push({ sheriffNumber, saleDate });
//                                 }
//                             }
//                             return data;
//                         });

//                         salesData.forEach((item) => {
//                             item.status = getStatus(item.sheriffNumber, item.saleDate);
//                         });

//                         console.log(`✅ Extracted ${salesData.length} records for ${county.name} on ${saleDate}`);
//                         extractedData = extractedData.concat(salesData);

//                         // Save data incrementally
//                         const searchDate = new Date().toLocaleDateString("en-GB").split("/").reverse().join("-");
//                         saveToExcelIncremental(salesData, searchDate);
//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }

//                     await page.goto(county.link, { waitUntil: "domcontentloaded" });
//                 }
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }

//         console.log("✅ Data extraction completed.");
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// }

// /**
//  * Load previous sales data from Excel for comparison
//  */
// function loadPreviousData() {
//     if (fs.existsSync(fileName)) {
//         const workbook = xlsx.readFile(fileName);
//         const sheet = workbook.Sheets["Sales"];
//         return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
//     }
//     return [];
// }

// /**
//  * Determine the status of each sale entry
//  */
// function getStatus(sheriffNumber, saleDate) {
//     const lastEntry = lastStoredData.find((entry) => entry.sheriffNumber === sheriffNumber);

//     if (lastEntry) {
//         if (lastEntry.saleDate === saleDate) {
//             return "Active"; // Matches previous sale data
//         } else {
//             return "Active New Date"; // Sheriff number exists but sale date changed
//         }
//     } else {
//         const isPreviouslyStored = lastStoredData.some((entry) => entry.saleDate === saleDate);
//         return isPreviouslyStored ? "Not in the system" : "Newly Added";
//     }
// }

// // Initialize Excel file at the start
// initializeExcel();

// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();

//--------------------------------------------------------------------------------------------------
//a9

// const fs = require("fs");
// const xlsx = require("xlsx");
// const puppeteer = require("puppeteer");

// const fileName = "SalesData.xlsx";
// let workbook;
// let worksheet;
// let lastStoredData = loadPreviousData();

// function initializeExcel() {
//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//         worksheet = workbook.Sheets["Sales"] || xlsx.utils.aoa_to_sheet([]);
//     } else {
//         workbook = xlsx.utils.book_new();
//         worksheet = xlsx.utils.aoa_to_sheet([]);
//         xlsx.utils.book_append_sheet(workbook, worksheet, "Sales");
//     }
// }

// function saveToExcelIncremental(data, searchDate) {
//     if (!Array.isArray(data) || data.length === 0) {
//         console.error("❌ No data to save.");
//         return;
//     }

//     let formattedData = [[`Search date: ${searchDate}`], ["County Name", "Sheriff #", "Sales Date", "Property Address", "Status"]];
//     formattedData = formattedData.concat(
//         data.map((item) => [item.countyName, item.sheriffNumber, item.saleDate, item.propertyAddress, item.status])
//     );

//     xlsx.utils.sheet_add_aoa(worksheet, formattedData, { origin: -1 });

//     // Apply style to "Search date" cell (A1)
//     const range = xlsx.utils.decode_range(worksheet["!ref"]);
//     const firstRow = range.e.r - (data.length + 1); // First row index for "Search date"
//     const searchDateCell = `A${firstRow + 1}`;

//     if (!worksheet[searchDateCell]) {
//         worksheet[searchDateCell] = { v: `Search date: ${searchDate}` };
//     }

//     worksheet[searchDateCell].s = {
//         font: {
//             bold: true,
//             color: { rgb: "FF0000" } // Red color
//         }
//     };

//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved incrementally in ${fileName}`);
// }

// async function scrapeData(url) {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll("a"))
//                 .filter((a) => a.textContent.trim().endsWith("NJ"))
//                 .map((a) => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith("http") ? a.href : window.location.origin + a.getAttribute("href"),
//                 }));
//         });

//         console.log(counties.length, "counties found.");

//         let extractedData = [];
//         for (const county of counties) {
//             await page.goto(county.link, { waitUntil: "networkidle2", timeout: 60000 });
//             const dropdownSelector = "#PropertyStatusDate";
//             const searchButtonSelector = 'input[value="Search"]';

//             try {
//                 await page.waitForSelector(dropdownSelector, { timeout: 10000 });
//                 let availableDates = await page.evaluate(() => {
//                     const dropdown = document.querySelector("#PropertyStatusDate");
//                     return dropdown ? Array.from(dropdown.options).map((option) => option.value).filter((date) => date.trim() !== "") : [];
//                 });

//                 console.log(availableDates, "Available dates:");

//                 for (const saleDate of availableDates) {
//                     console.log(`\n📅 Selecting Sale Date: ${saleDate}`);
//                     await page.select(dropdownSelector, saleDate);
//                     await page.waitForSelector(searchButtonSelector, { timeout: 10000 });
//                     await page.click(searchButtonSelector);
//                     console.log('Clicked Search button');
//                     await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => console.log("⚠️ Page reload timeout"));

//                     try {
//                         await page.waitForSelector("table tbody tr", { visible: true, timeout: 20000 });
//                         const salesData = await page.evaluate(() => {
//                             return Array.from(document.querySelectorAll("table tbody tr")).map(row => {
//                                 const cells = row.querySelectorAll("td");
//                                 return {
//                                     detailsLink: cells[0]?.querySelector('a')?.href?.trim() || 'N/A',  // Ensure link exists
//                                     sheriffNumber: cells[1]?.textContent?.trim() || 'Unknown',  // Handle missing sheriff number
//                                     saleDate: cells[2]?.textContent?.trim() || 'N/A',  // Ensure date is extracted
//                                     propertyAddress: cells[5]?.textContent?.trim() || 'Unknown',  // Prevent missing addresses
//                                 };
//                             });
//                         });

//                         salesData.forEach((item) => {
//                             item.countyName = county.name;
//                             item.status = getStatus(item.sheriffNumber, item.saleDate);
//                         });
//                         if (salesData.length === 0) {
//                             console.log("⚠️ No sales data found.");
//                         } else {
//                             console.log(`✅ Extracted ${salesData.length} records successfully!`);
//                         }

//                         extractedData = extractedData.concat(salesData);
//                         console.log(extractedData, "Extracted data");

//                         const searchDate = new Date().toISOString().split("T")[0];
//                         saveToExcelIncremental(salesData, searchDate);
//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }
//                     await page.goto(county.link, { waitUntil: "domcontentloaded" });
//                 }
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// }

// function loadPreviousData() {
//     if (fs.existsSync(fileName)) {
//         const workbook = xlsx.readFile(fileName);
//         const sheet = workbook.Sheets["Sales"];
//         return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
//     }
//     return [];
// }

// function getStatus(sheriffNumber, saleDate) {
//     if (!lastStoredData || lastStoredData.length === 0) {
//         return "Newly Added"; // No previous data, so everything is new
//     }

//     // Convert saleDate and today's date to a comparable format
//     const saleDateObj = new Date(saleDate.split("/").reverse().join("-")); // Convert DD/MM/YYYY to YYYY-MM-DD
//     const today = new Date();

//     // Find the previous record with the same sheriff number
//     const matchingEntry = lastStoredData.find(entry => entry["Sheriff #"] === sheriffNumber);

//     if (matchingEntry) {
//         const previousSaleDateObj = new Date(matchingEntry["Sales Date"].split("/").reverse().join("-"));
//         console.log(previousSaleDateObj, '-------------')

//         if (matchingEntry["Sales Date"] === saleDate) {
//             // If sheriff number and sale date match
//             if (matchingEntry["Status"] === "Newly Added" && saleDateObj > today) {
//                 return "Active"; // A previously newly added entry is now active if the sale date is still in the future
//             } else if (saleDateObj < today) {
//                 return "Expired"; // If sale date is in the past
//             }
//             return "Active"; // Default to Active if no other conditions apply
//         } else {
//             return "Active New Date"; // If Sheriff # matches but Sale Date is different
//         }
//     }

//     // If no matching sheriff number is found, check if the sale date was in previous records
//     const saleDateExists = lastStoredData.some(entry => entry["Sales Date"] === saleDate);
//     if (!saleDateExists) {
//         return "Newly Added"; // New sheriff number and sale date
//     }

//     return "Not in the system"; // If sheriff number and sale date both are missing in today's data
// }

// initializeExcel();
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();


//-------------------------------------------------------------------------------
//a10

// const fs = require("fs");
// const xlsx = require("xlsx");
// const puppeteer = require("puppeteer");

// const fileName = "SalesData.xlsx";
// let workbook;
// let worksheet;
// let lastStoredData = loadPreviousData();

// function initializeExcel() {
//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//         worksheet = workbook.Sheets["Sales"] || xlsx.utils.aoa_to_sheet([]);
//     } else {
//         workbook = xlsx.utils.book_new();
//         worksheet = xlsx.utils.aoa_to_sheet([]);
//         xlsx.utils.book_append_sheet(workbook, worksheet, "Sales");
//     }
// }

// function saveToExcelIncremental(data, searchDate) {
//     if (!Array.isArray(data) || data.length === 0) {
//         console.error("❌ No data to save.");
//         return;
//     }

//     let formattedData = [[`Search date: ${searchDate}`], ["County Name", "Sheriff #", "Sales Date", "Property Address", "Status"]];
//     formattedData = formattedData.concat(
//         data.map((item) => [item.countyName, item.sheriffNumber, item.saleDate, item.propertyAddress, item.status])
//     );

//     xlsx.utils.sheet_add_aoa(worksheet, formattedData, { origin: -1 });

//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved incrementally in ${fileName}`);
// }

// async function scrapeData(url) {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll("a"))
//                 .filter((a) => a.textContent.trim().endsWith("NJ"))
//                 .map((a) => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith("http") ? a.href : window.location.origin + a.getAttribute("href"),
//                 }));
//         });
//         console.log(counties, 'counties------')

//         console.log(counties.length, "counties found.");

//         let extractedData = [];
//         for (const county of counties) {
//             await page.goto(county.link, { waitUntil: "networkidle2", timeout: 60000 });

//             try {
//                 await page.waitForSelector("#PropertyStatusDate", { timeout: 10000 });
//                 let availableDates = await page.evaluate(() => {
//                     const dropdown = document.querySelector("#PropertyStatusDate");
//                     return dropdown ? Array.from(dropdown.options).map((option) => option.value).filter((date) => date.trim() !== "") : [];
//                 });
//                 console.log(availableDates, 'available dates-----')

//                 for (const saleDate of availableDates) {
//                     console.log(`\n📅 Selecting Sale Date: ${saleDate}`);
//                     await page.select("#PropertyStatusDate", saleDate);
//                     await page.waitForSelector('input[value="Search"]', { timeout: 10000 });
//                     await page.click('input[value="Search"]');
//                     console.log('Clicked search button')
//                     await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => console.log("⚠️ Page reload timeout"));

//                     try {
//                         await page.waitForSelector("table tbody tr", { visible: true, timeout: 20000 });
//                         const salesData = await page.evaluate(() => {
//                             return Array.from(document.querySelectorAll("table tbody tr")).map(row => {
//                                 const cells = row.querySelectorAll("td");
//                                 return {
//                                     detailsLink: cells[0]?.querySelector('a')?.href?.trim() || 'N/A',
//                                     sheriffNumber: cells[1]?.textContent?.trim() || 'Unknown',
//                                     saleDate: cells[2]?.textContent?.trim() || 'N/A',
//                                     propertyAddress: cells[5]?.textContent?.trim() || 'Unknown',
//                                 };
//                             });
//                         });

//                         salesData.forEach((item) => {
//                             item.countyName = county.name;
//                             item.status = getStatus(item.sheriffNumber, item.saleDate);
//                         });

//                         if (salesData.length === 0) {
//                             console.log("⚠️ No sales data found.");
//                         } else {
//                             console.log(`✅ Extracted ${salesData.length} records successfully!`);
//                         }

//                         extractedData = extractedData.concat(salesData);
//                         console.log(extractedData, 'extracted data--')
//                         const searchDate = new Date().toISOString().split("T")[0];
//                         console.log(searchDate, 'search date==')
//                         saveToExcelIncremental(salesData, searchDate);
//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }

//                     await page.goto(county.link, { waitUntil: "domcontentloaded" });
//                 }
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// }

// function loadPreviousData() {
//     if (fs.existsSync(fileName)) {
//         const workbook = xlsx.readFile(fileName);
//         const sheet = workbook.Sheets["Sales"];
//         return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
//     }
//     return [];
// }

// function getStatus(sheriffNumber, saleDate) {
//     if (!lastStoredData || lastStoredData.length === 0) {
//         return "Newly Added";
//     }

//     const saleDateObj = new Date(saleDate.split("/").reverse().join("-"));
//     const today = new Date();

//     const matchingEntry = lastStoredData.find(entry => entry["Sheriff #"] === sheriffNumber);

//     if (matchingEntry) {
//         //const previousSaleDateObj = new Date(matchingEntry["Sales Date"].split("/").reverse().join("-"));

//         if (matchingEntry["Sales Date"] === saleDate) {
//             if (matchingEntry["Status"] === "Newly Added" && saleDateObj > today) {
//                 return "Active";
//             } else if (saleDateObj < today) {
//                 return "Expired";
//             }
//             return "Active";
//         } else {
//             return "Active New Date";
//         }
//     }

//     const saleDateExists = lastStoredData.some(entry => entry["Sales Date"] === saleDate);
//     if (!saleDateExists) {
//         return "Newly Added";
//     }

//     return "Not in the system";
// }

// initializeExcel();
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();

//======================================================================================================
//a11

// const fs = require("fs");
// const xlsx = require("xlsx");
// const puppeteer = require("puppeteer");

// const fileName = "SalesData.xlsx";
// let workbook;
// let worksheet;
// let lastStoredData = loadPreviousData();

// /** Initialize Excel File */
// function initializeExcel() {
//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//         worksheet = workbook.Sheets["Sales"] || xlsx.utils.aoa_to_sheet([]);
//     } else {
//         workbook = xlsx.utils.book_new();
//         worksheet = xlsx.utils.aoa_to_sheet([]);
//         xlsx.utils.book_append_sheet(workbook, worksheet, "Sales");
//     }
// }

// /** Save data to Excel incrementally */
// function saveToExcelIncremental(data, searchDate) {
//     if (!Array.isArray(data) || data.length === 0) {
//         console.error("❌ No data to save.");
//         return;
//     }

//     let formattedData = [[`Search date: ${searchDate}`], ["County Name", "Sheriff #", "Sales Date", "Property Address", "Status"]];
//     formattedData = formattedData.concat(
//         data.map((item) => [item.countyName, item.sheriffNumber, item.saleDate, item.propertyAddress, item.status])
//     );

//     xlsx.utils.sheet_add_aoa(worksheet, formattedData, { origin: -1 });

//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved in ${fileName}`);
// }

// /** Scrape Data */
// async function scrapeData(url) {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

//         const counties = await extractCountyLinks(page);
//         console.log(`${counties.length} counties found.`);

//         let extractedData = [];
//         for (const county of counties) {
//             await page.goto(county.link, { waitUntil: "networkidle2", timeout: 60000 });

//             try {
//                 const availableDates = await extractAvailableDates(page);
//                 console.log(`${availableDates.length} dates available for ${county.name}`);

//                 for (const saleDate of availableDates) {
//                     console.log(`📅 Processing Sale Date: ${saleDate}`);
//                     await page.select("#PropertyStatusDate", saleDate);
//                     await page.waitForSelector('input[value="Search"]', { timeout: 10000 });
//                     await page.click('input[value="Search"]');
//                     console.log('Clicked Search button');
//                     await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => console.log("⚠️ Page reload timeout"));

//                     try {
//                         const salesData = await extractSalesData(page);
//                         salesData.forEach((item) => {
//                             item.countyName = county.name;
//                             item.status = getStatus(item.sheriffNumber, item.saleDate);
//                         });

//                         if (salesData.length > 0) {
//                             console.log(`✅ Extracted ${salesData.length} records.`);
//                             extractedData = extractedData.concat(salesData);
//                             saveToExcelIncremental(salesData, new Date().toISOString().split("T")[0]);
//                         } else {
//                             console.log("⚠️ No sales data found.");
//                         }
//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }

//                     await page.goto(county.link, { waitUntil: "domcontentloaded" });
//                 }
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// }

// /** Extract County Links */
// async function extractCountyLinks(page) {
//     return await page.evaluate(() => {
//         return Array.from(document.querySelectorAll("a"))
//             .filter((a) => a.textContent.trim().endsWith("NJ"))
//             .map((a) => ({
//                 name: a.textContent.trim(),
//                 link: a.href.startsWith("http") ? a.href : window.location.origin + a.getAttribute("href"),
//             }));
//     });
// }

// /** Extract Available Dates from Dropdown */
// async function extractAvailableDates(page) {
//     try {
//         await page.waitForSelector("#PropertyStatusDate", { timeout: 10000 });
//         return await page.evaluate(() => {
//             const dropdown = document.querySelector("#PropertyStatusDate");
//             return dropdown ? Array.from(dropdown.options).map((option) => option.value).filter((date) => date.trim() !== "") : [];
//         });
//     } catch (error) {
//         return [];
//     }
// }

// /** Extract Sales Data */
// async function extractSalesData(page) {
//     try {
//         await page.waitForSelector("table tbody tr", { visible: true, timeout: 20000 });
//         return await page.evaluate(() => {
//             return Array.from(document.querySelectorAll("table tbody tr")).map(row => {
//                 const cells = row.querySelectorAll("td");
//                 return {
//                     detailsLink: cells[0]?.querySelector('a')?.href?.trim() || 'N/A',
//                     sheriffNumber: cells[1]?.textContent?.trim() || 'Unknown',
//                     saleDate: cells[2]?.textContent?.trim() || 'N/A',
//                     propertyAddress: cells[5]?.textContent?.trim() || 'Unknown',
//                 };
//             });
//         });
//     } catch (error) {
//         console.log("⚠️ Error extracting sales data:", error.message);
//         return [];
//     }
// }

// /** Load Previous Data */
// function loadPreviousData() {
//     if (fs.existsSync(fileName)) {
//         const workbook = xlsx.readFile(fileName);
//         const sheet = workbook.Sheets["Sales"];
//         return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
//     }
//     return [];
// }

// /** Get Status for Property */
// function getStatus(sheriffNumber, saleDate) {
//     if (!lastStoredData || lastStoredData.length === 0) {
//         return "Newly Added";
//     }

//     const saleDateObj = new Date(saleDate.split("/").reverse().join("-"));
//     const today = new Date();

//     const matchingEntry = lastStoredData.find(entry => entry["Sheriff #"] === sheriffNumber);

//     if (matchingEntry) {
//         if (matchingEntry["Sales Date"] === saleDate) {
//             if (matchingEntry["Status"] === "Newly Added" && saleDateObj > today) {
//                 return "Active";
//             } else if (saleDateObj < today) {
//                 return "Expired";
//             }
//             return "Active";
//         } else {
//             return "Active New Date";
//         }
//     }

//     return "Newly Added";
// }

// // Initialize and Start Scraper
// initializeExcel();
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();

//=========================================================================================================
//a12

// const fs = require("fs");
// const xlsx = require("xlsx");
// const puppeteer = require("puppeteer");

// const fileName = "SalesData.xlsx";
// let workbook;
// let worksheet;
// let lastStoredData = loadPreviousData();

// function initializeExcel() {
//     if (fs.existsSync(fileName)) {
//         workbook = xlsx.readFile(fileName);
//         worksheet = workbook.Sheets["Sales"] || xlsx.utils.aoa_to_sheet([]);
//     } else {
//         workbook = xlsx.utils.book_new();
//         worksheet = xlsx.utils.aoa_to_sheet([]);
//         xlsx.utils.book_append_sheet(workbook, worksheet, "Sales");
//     }
// }

// function saveToExcelIncremental(data, searchDate) {
//     if (!Array.isArray(data) || data.length === 0) {
//         console.error("❌ No data to save.");
//         return;
//     }

//     let formattedData = [[`Search date: ${searchDate}`], ["County Name", "Sheriff #", "Sales Date", "Property Address", "Status"]];
//     formattedData = formattedData.concat(
//         data.map((item) => [item.countyName, item.sheriffNumber, item.saleDate, item.propertyAddress, item.status])
//     );

//     xlsx.utils.sheet_add_aoa(worksheet, formattedData, { origin: -1 });

//     xlsx.writeFile(workbook, fileName);
//     console.log(`✅ Data saved incrementally in ${fileName}`);
// }

// async function scrapeData(url) {
//     let browser;
//     try {
//         browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();
//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

//         const counties = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll("a"))
//                 .filter((a) => a.textContent.trim().endsWith("NJ"))
//                 .map((a) => ({
//                     name: a.textContent.trim(),
//                     link: a.href.startsWith("http") ? a.href : window.location.origin + a.getAttribute("href"),
//                 }));
//         });

//         console.log(`${counties.length} counties found.`);

//         let extractedData = [];
//         for (const county of counties) {
//             if (!county.name.includes("County, NJ")) {
//                 console.log(`Skipping ${county.name}, not a valid NJ county.`);
//                 continue;
//             }

//             await page.goto(county.link, { waitUntil: "networkidle2", timeout: 60000 });

//             try {
//                 await page.waitForSelector("#PropertyStatusDate", { timeout: 10000 });
//                 let availableDates = await page.evaluate(() => {
//                     const dropdown = document.querySelector("#PropertyStatusDate");
//                     return dropdown ? Array.from(dropdown.options).map((option) => option.value).filter((date) => date.trim() !== "") : [];
//                 });

//                 for (const saleDate of availableDates) {
//                     console.log(`\n📅 Selecting Sale Date: ${saleDate}`);
//                     await page.select("#PropertyStatusDate", saleDate);
//                     await page.waitForSelector('input[value="Search"]', { timeout: 10000 });
//                     await page.click('input[value="Search"]');
//                     console.log("Clicked search button");
//                     await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => console.log("⚠️ Page reload timeout"));

//                     try {
//                         await page.waitForSelector("table tbody tr", { visible: true, timeout: 20000 });
//                         const salesData = await page.evaluate((countyName) => {
//                             return Array.from(document.querySelectorAll("table tbody tr")).map(row => {
//                                 const cells = row.querySelectorAll("td");

//                                 if (countyName.includes("Hudson")) {
//                                     // Hudson County has a different table structure
//                                     return {
//                                         detailsLink: cells[0]?.querySelector('a')?.href?.trim() || 'N/A',
//                                         sheriffNumber: cells[1]?.textContent?.trim() || 'Unknown',
//                                         saleDate: cells[2]?.textContent?.trim() || 'N/A',
//                                         propertyAddress: cells[3]?.textContent?.trim() || 'Unknown'
//                                     };
//                                 }
//                                 if (countyName.includes("Middlesex")) {
//                                     // Middlesex County has a different table structure
//                                     return {
//                                         detailsLink: cells[0]?.querySelector('a')?.href?.trim() || 'N/A',
//                                         sheriffNumber: cells[1]?.textContent?.trim() || 'Unknown',
//                                         saleDate: cells[3]?.textContent?.trim() || 'N/A',
//                                         propertyAddress: cells[6]?.textContent?.trim() || 'Unknown'
//                                     };
//                                 }
//                                 if (countyName.includes("Monmouth")) {
//                                     // Monmouth County has a different table structure
//                                     return {
//                                         detailsLink: cells[0]?.querySelector('a')?.href?.trim() || 'N/A',
//                                         sheriffNumber: cells[1]?.textContent?.trim() || 'Unknown',
//                                         saleDate: cells[3]?.textContent?.trim() || 'N/A',
//                                         propertyAddress: cells[6]?.textContent?.trim() || 'Unknown'
//                                     };
//                                 } else {
//                                     return {
//                                         detailsLink: cells[0]?.querySelector('a')?.href?.trim() || 'N/A',
//                                         sheriffNumber: cells[1]?.textContent?.trim() || 'Unknown',
//                                         saleDate: cells[2]?.textContent?.trim() || 'N/A',
//                                         propertyAddress: cells[5]?.textContent?.trim() || 'Unknown',
//                                     };
//                                 }
//                             });
//                         }, county.name);

//                         salesData.forEach((item) => {
//                             item.countyName = county.name;
//                             item.status = getStatus(item.sheriffNumber, item.saleDate);
//                         });
//                         console.log(salesData, 'sales data--');

//                         if (salesData.length === 0) {
//                             console.log("⚠️ No sales data found.");
//                         } else {
//                             console.log(`✅ Extracted ${salesData.length} records successfully!`);
//                         }

//                         // Format the search date as MM/DD/YYYY
//                         const today = new Date();
//                         const formattedSearchDate = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`;

//                         console.log(formattedSearchDate, "search date==");

//                         saveToExcelIncremental(salesData, formattedSearchDate);
//                     } catch (error) {
//                         console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
//                     }

//                     await page.goto(county.link, { waitUntil: "domcontentloaded" });
//                 }
//             } catch (error) {
//                 console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
//             }
//         }
//     } catch (error) {
//         console.error("❌ Error:", error.message);
//     } finally {
//         if (browser) await browser.close();
//         console.log("✅ Scraper finished. Exiting...");
//         process.exit(0);
//     }
// }

// function loadPreviousData() {
//     if (fs.existsSync(fileName)) {
//         const workbook = xlsx.readFile(fileName);
//         const sheet = workbook.Sheets["Sales"];
//         return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
//     }
//     return [];
// }

// function getStatus(sheriffNumber, saleDate) {
//     if (!lastStoredData || lastStoredData.length === 0) {
//         return "Newly Added";
//     }

//     const saleDateObj = new Date(saleDate.split("/").reverse().join("-"));
//     const today = new Date();

//     const matchingEntry = lastStoredData.find(entry => entry["Sheriff #"] === sheriffNumber);

//     if (matchingEntry) {
//         if (matchingEntry["Sales Date"] === saleDate) {
//             if (matchingEntry["Status"] === "Newly Added" && saleDateObj > today) {
//                 return "Active";
//             } else if (saleDateObj < today) {
//                 return "Expired";
//             }
//             return "Active";
//         } else {
//             return "Active New Date";
//         }
//     }

//     const saleDateExists = lastStoredData.some(entry => entry["Sales Date"] === saleDate);
//     if (!saleDateExists) {
//         return "Newly Added";
//     }

//     return "Not in the system";
// }

// initializeExcel();
// (async () => {
//     const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
//     console.log("🚀 Starting Scraper...");
//     await scrapeData(url);
// })();

//----------------------------------------------------------------------------------------------------
//a13

const fs = require("fs");
const xlsx = require("xlsx");
const puppeteer = require("puppeteer");

const fileName = "SalesData.xlsx";
let workbook;
let worksheet;
let lastStoredData = loadPreviousData();

function initializeExcel() {
    if (fs.existsSync(fileName)) {
        workbook = xlsx.readFile(fileName);
        worksheet = workbook.Sheets["Sales"] || xlsx.utils.aoa_to_sheet([]);
    } else {
        workbook = xlsx.utils.book_new();
        worksheet = xlsx.utils.aoa_to_sheet([]);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Sales");
    }
}

function saveToExcelIncremental(data, searchDate) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("❌ No data to save.");
        return;
    }

    let formattedData = [[`Search date: ${searchDate}`], ["County Name", "Sheriff #", "Sales Date", "Property Address", "Status"]];
    formattedData = formattedData.concat(
        data.map((item) => [item.countyName, item.sheriffNumber, item.saleDate, item.propertyAddress, item.status])
    );

    xlsx.utils.sheet_add_aoa(worksheet, formattedData, { origin: -1 });

    xlsx.writeFile(workbook, fileName);
    console.log(`✅ Data saved incrementally in ${fileName}`);
}

async function scrapeData(url) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        const counties = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("a"))
                .filter((a) => a.textContent.trim().endsWith("NJ"))
                .map((a) => ({
                    name: a.textContent.trim(),
                    link: a.href.startsWith("http") ? a.href : window.location.origin + a.getAttribute("href"),
                }));
        });

        console.log(`${counties.length} counties found.`);

        for (const county of counties) {
            if (!county.name.includes("County, NJ")) {
                console.log(`Skipping ${county.name}, not a valid NJ county.`);
                continue;
            }

            await page.goto(county.link, { waitUntil: "networkidle2", timeout: 60000 });

            try {
                await page.waitForSelector("#PropertyStatusDate", { timeout: 10000 });
                let availableDates = await page.evaluate(() => {
                    const dropdown = document.querySelector("#PropertyStatusDate");
                    return dropdown ? Array.from(dropdown.options).map((option) => option.value).filter((date) => date.trim() !== "") : [];
                });
                console.log(availableDates, 'available dates------');

                for (const saleDate of availableDates) {
                    console.log(`\n📅 Selecting Sale Date: ${saleDate}`);
                    await page.select("#PropertyStatusDate", saleDate);
                    await page.waitForSelector('input[value="Search"]', { timeout: 10000 });
                    await page.click('input[value="Search"]');
                    console.log("Clicked search button");
                    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => console.log("⚠️ Page reload timeout"));

                    try {
                        await page.waitForSelector("table tbody tr", { visible: true, timeout: 20000 });

                        const salesData = await page.evaluate((countyName) => {
                            return Array.from(document.querySelectorAll("table tbody tr"))
                                .map(row => {
                                    const cells = row.querySelectorAll("td");

                                    if (cells.length < 6) return null; // Ensure enough columns exist

                                    let sheriffNumber = cells[1]?.textContent?.trim() || 'Unknown';
                                    let saleDate = cells[2]?.textContent?.trim() || 'N/A';
                                    let propertyAddress = cells[5]?.textContent?.trim() || 'Unknown';

                                    if (countyName.includes("Hudson")) {
                                        saleDate = cells[2]?.textContent?.trim() || 'N/A';
                                        propertyAddress = cells[3]?.textContent?.trim() || 'Unknown';
                                    }
                                    if (countyName.includes("Middlesex") || countyName.includes("Monmouth")) {
                                        saleDate = cells[3]?.textContent?.trim() || 'N/A';
                                        propertyAddress = cells[6]?.textContent?.trim() || 'Unknown';
                                    }

                                    // Filter out rows where key fields are empty or "Unknown"
                                    if (sheriffNumber === "Unknown" && saleDate === "N/A" && propertyAddress === "Unknown") {
                                        return null;
                                    }

                                    return {
                                        sheriffNumber,
                                        saleDate,
                                        propertyAddress
                                    };
                                })
                                .filter(row => row !== null); // Remove null (empty) rows
                        }, county.name);

                        salesData.forEach((item) => {
                            item.countyName = county.name;
                            item.status = getStatus(item.sheriffNumber, item.saleDate);
                        });

                        console.log(salesData, 'sales data--------')

                        console.log(`✅ Extracted ${salesData.length} records successfully!`);

                        // Format the search date as MM/DD/YYYY
                        const todayUTC = new Date();
                        console.log(todayUTC, 'UTC time today------');
                        const easternTimeFormatter = new Intl.DateTimeFormat("en-US", {
                            timeZone: "America/New_York", // Converts to Eastern Time (ET)
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                        });
                        const [{ value: month }, , { value: day }, , { value: year }] = easternTimeFormatter.formatToParts(todayUTC);
                        const formattedSearchDate = `${month}/${day}/${year}`;
                        console.log(formattedSearchDate, 'Eastern time search date-----')

                        saveToExcelIncremental(salesData, formattedSearchDate);
                    } catch (error) {
                        console.log(`⚠️ No sales data found for ${county.name} on ${saleDate}`);
                    }

                    await page.goto(county.link, { waitUntil: "domcontentloaded" });
                }
            } catch (error) {
                console.log(`⚠️ No dropdown found or failed to select date for ${county.name}`);
            }
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        if (browser) await browser.close();
        console.log("✅ Scraper finished. Exiting...");
        process.exit(0);
    }
}

function loadPreviousData() {
    if (fs.existsSync(fileName)) {
        const workbook = xlsx.readFile(fileName);
        const sheet = workbook.Sheets["Sales"];
        return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
    }
    return [];
}

function getStatus(sheriffNumber, saleDate) {
    if (!lastStoredData || lastStoredData.length === 0) {
        return "Newly Added";
    }

    const saleDateObj = new Date(saleDate.split("/").reverse().join("-"));
    const today = new Date();

    const matchingEntry = lastStoredData.find(entry => entry["Sheriff #"] === sheriffNumber);

    if (matchingEntry) {
        if (matchingEntry["Sales Date"] === saleDate) {
            if (matchingEntry["Status"] === "Newly Added" && saleDateObj > today) {
                return "Active";
            } else if (saleDateObj < today) {
                return "Expired";
            }
            return "Active";
        } else {
            return "Active New Date";
        }
    }

    const saleDateExists = lastStoredData.some(entry => entry["Sales Date"] === saleDate);
    if (!saleDateExists) {
        return "Newly Added";
    }

    return "Not in the system";
}

initializeExcel();
(async () => {
    const url = "https://salesweb.civilview.com/Home/Index?aspxerrorpath=/Sales/SaleDetails";
    console.log("🚀 Starting Scraper...");
    await scrapeData(url);
})();
