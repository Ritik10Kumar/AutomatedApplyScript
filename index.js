const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();

const {
  LINKEDIN_EMAIL,
  LINKEDIN_PASSWORD,
  USER_EMAIL,
  USER_PHONE,
  USER_CTC,
  USER_EXPECTED_CTC,
  USER_NOTICE_PERIOD,
  RESUME_PATH,
} = process.env;

const MAX_JOBS = 10;
const LOCATION = "Gurgaon";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:'/usr/bin/google-chrome',
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  // 1. Login
  await page.goto("https://www.linkedin.com/login", { waitUntil: "load" , timeout: 90000 });
  await page.type("#username", LINKEDIN_EMAIL);
  await page.type("#password", LINKEDIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "load" , timeout: 90000 });
  console.log("✅ Logged in");

  // 2. Search Jobs
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=Node.js%20Developer&location=${LOCATION}&f_AL=true&f_E=3%2C4&f_TPR=r86400`;
  await page.goto(searchUrl, { waitUntil: "load" , timeout: 90000 });
  console.log("🌍 Searching jobs in:", LOCATION);

  // 3. Scroll to load more jobs
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    // await page.waitForTimeout(1000);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 4. Get job links (only Node.js jobs, filtered)
  const jobLinks = await page.$$eval('ul.jobs-search__results-list li a', links => {
    const uniqueLinks = new Set();
    links.forEach(link => {
      const title = link.textContent?.toLowerCase() || "";
      if (link.href.includes("/jobs/view/") && title.includes("node")) {
        uniqueLinks.add(link.href.split("?")[0]);
      }
    });
    return [...uniqueLinks];
  });

  console.log(`🔗 Found ${jobLinks.length} job(s).`);

  const appliedJobs = fs.existsSync("applied_jobs.txt") ? fs.readFileSync("applied_jobs.txt", "utf-8").split("\n") : [];
  let count = 0;

  for (const link of jobLinks) {
    if (count >= MAX_JOBS) break;
    if (appliedJobs.includes(link)) continue;

    try {
      await page.goto(link, { waitUntil: "load", timeout: 90000 });
      await page.waitForSelector('button.jobs-apply-button, button.artdeco-button--primary', { visible: true, timeout: 90000 });
      // const easyApplyBtn = await page.$('button.jobs-apply-button');
      const easyApplyBtn = await page.$('button.jobs-apply-button, button.artdeco-button--primary');

      if (easyApplyBtn) {
        await easyApplyBtn.click();
        await page.waitForTimeout(1000);

        const emailInput = await page.$('input[name="email"]');
        if (emailInput) await emailInput.type(USER_EMAIL);

        const phoneInput = await page.$('input[name="phoneNumber"]');
        if (phoneInput) await phoneInput.type(USER_PHONE);

        const fileInput = await page.$('input[type="file"]');
        if (fileInput) await fileInput.uploadFile(RESUME_PATH);

        const submitBtn = await page.$('button[aria-label*="Submit application"]');
        if (submitBtn) {
          await submitBtn.click();
          console.log("✅ Applied to:", link);

          // Save applied job
          const title = await page.$eval("h1", el => el.innerText).catch(() => "Unknown Title");
          const company = await page.$eval(".jobs-unified-top-card__company-name", el => el.innerText).catch(() => "Unknown Company");
          fs.appendFileSync("applied_jobs.txt", `${link}\n`);
          fs.appendFileSync("applied_log.txt", `${company} - ${title}\n`);
          count++;
        } else {
          console.log("⚠️ Couldn't find submit button on:", link);
        }
      } else {
        console.log("🚫 No Easy Apply button on:", link);
      }
    } catch (err) {
      console.log("❌ Skipped:", link, err.message);
      continue;
    }
  }

  console.log(`🎯 Applied to ${count} job(s).`);
  await browser.close();
})();



// const puppeteer = require("puppeteer");
// const fs = require("fs");
// require("dotenv").config();

// const {
//   LINKEDIN_EMAIL,
//   LINKEDIN_PASSWORD,
//   USER_EMAIL,
//   USER_PHONE,
//   USER_CTC,
//   USER_EXPECTED_CTC,
//   USER_NOTICE_PERIOD,
//   RESUME_PATH,
// } = process.env;

// const MAX_JOBS = 10;
// const LOCATION = "Gurgaon"; // Run one location at a time

// (async () => {
//   const browser = await puppeteer.launch({
//     headless: false,
//     defaultViewport: null,
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });

//   const page = await browser.newPage();
//   page.setDefaultNavigationTimeout(60000);

//   // Login
//   await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });
//   await page.type("#username", LINKEDIN_EMAIL);
//   await page.type("#password", LINKEDIN_PASSWORD);
//   await page.click('button[type="submit"]');
//   await page.waitForNavigation({ waitUntil: "domcontentloaded" });
//   console.log("✅ Logged in");

//   // Job search
//   const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=Node.js%20Developer&location=${LOCATION}&f_AL=true&f_E=3%2C4&f_TPR=r86400`;
//   await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
//   console.log("🌍 Searching jobs in:", LOCATION);

//   // Scroll to load jobs
//   for (let i = 0; i < 8; i++) {
//     await page.evaluate(() => window.scrollBy(0, window.innerHeight));
//     await new Promise(r => setTimeout(r, 1000));
//     // await page.waitForTimeout(1000);
//   }

//   // Get job links
//   // const jobLinks = await page.$$eval("a.job-card-list__title", links => links.map(link => link.href));
//   await page.waitForSelector('ul.jobs-search__results-list li a', { timeout: 10000 });

// const jobLinks = await page.$$eval('ul.jobs-search__results-list li a', links => {
//   const uniqueLinks = new Set();
//   links.forEach(link => {
//     if (link.href && link.href.includes('/jobs/view/')) {
//       uniqueLinks.add(link.href.split('?')[0]); // clean URL
//     }
//   });
//   return [...uniqueLinks];
// });

// console.log(`🔗 Found ${jobLinks.length} job(s).`);
  
//   const appliedJobs = fs.existsSync("applied_jobs.txt") ? fs.readFileSync("applied_jobs.txt", "utf-8").split("\n") : [];

//   let count = 0;

//   for (const link of jobLinks) {
//     if (count >= MAX_JOBS) break;
//     if (appliedJobs.includes(link)) continue;

//     try {
//       await page.goto(link, { waitUntil: "domcontentloaded", timeout: 30000 });

//       const [applyBtn] = await page.$x("//button[contains(., 'Easy Apply')]");
//       if (applyBtn) {
//         await applyBtn.click();
//         await page.waitForTimeout(1000);

//         const emailInput = await page.$('input[name="email"]');
//         if (emailInput) await emailInput.type(USER_EMAIL);

//         const phoneInput = await page.$('input[name="phoneNumber"]');
//         if (phoneInput) await phoneInput.type(USER_PHONE);

//         // Upload resume 
//         const fileInput = await page.$('input[type="file"]');
//         if (fileInput) await fileInput.uploadFile(RESUME_PATH);

//         // Submit application
//         const [submitBtn] = await page.$x("//button[contains(., 'Submit application')]");
//         if (submitBtn) {
//           await submitBtn.click();
//           console.log("✅ Applied to:", link);

//           // Save to file
//           const title = await page.$eval("h1", el => el.innerText).catch(() => "Unknown Title");
//           const company = await page.$eval(".jobs-unified-top-card__company-name", el => el.innerText).catch(() => "Unknown Company");
//           fs.appendFileSync("applied_jobs.txt", `${link}\n`);
//           fs.appendFileSync("applied_log.txt", `${company} - ${title}\n`);
//           count++;
//         }
//       }
//     } catch (err) {
//       console.log("❌ Skipped:", link, err.message);
//       continue;
//     }
//   }

//   console.log(`🎯 Applied to ${count} job(s).`);
//   await browser.close();
// })();

