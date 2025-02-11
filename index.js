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

                        console.log(salesData, 'sales data--------');

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
                        console.log(formattedSearchDate, 'Eastern time search date-----');

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
