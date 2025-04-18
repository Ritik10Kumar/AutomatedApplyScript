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
const LOCATION = "Gurgaon"; // Run one location at a time

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  // Login
  await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });
  await page.type("#username", LINKEDIN_EMAIL);
  await page.type("#password", LINKEDIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "domcontentloaded" });
  console.log("✅ Logged in");

  // Job search
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=Node.js%20Developer&location=${LOCATION}&f_AL=true&f_E=3%2C4&f_TPR=r86400`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
  console.log("🌍 Searching jobs in:", LOCATION);

  // Scroll to load jobs
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(r => setTimeout(r, 1000));
  }

  // Get job links
  const jobLinks = await page.$$eval("a.job-card-list__title", links => links.map(link => link.href));
  const appliedJobs = fs.existsSync("applied_jobs.txt") ? fs.readFileSync("applied_jobs.txt", "utf-8").split("\n") : [];

  let count = 0;

  for (const link of jobLinks) {
    if (count >= MAX_JOBS) break;
    if (appliedJobs.includes(link)) continue;

    try {
      await page.goto(link, { waitUntil: "domcontentloaded", timeout: 30000 });

      const [applyBtn] = await page.$x("//button[contains(., 'Easy Apply')]");
      if (applyBtn) {
        await applyBtn.click();
        await page.waitForTimeout(1000);

        const emailInput = await page.$('input[name="email"]');
        if (emailInput) await emailInput.type(USER_EMAIL);

        const phoneInput = await page.$('input[name="phoneNumber"]');
        if (phoneInput) await phoneInput.type(USER_PHONE);

        // Upload resume
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) await fileInput.uploadFile(RESUME_PATH);

        // Submit application
        const [submitBtn] = await page.$x("//button[contains(., 'Submit application')]");
        if (submitBtn) {
          await submitBtn.click();
          console.log("✅ Applied to:", link);

          // Save to file
          const title = await page.$eval("h1", el => el.innerText).catch(() => "Unknown Title");
          const company = await page.$eval(".jobs-unified-top-card__company-name", el => el.innerText).catch(() => "Unknown Company");
          fs.appendFileSync("applied_jobs.txt", `${link}\n`);
          fs.appendFileSync("applied_log.txt", `${company} - ${title}\n`);
          count++;
        }
      }
    } catch (err) {
      console.log("❌ Skipped:", link, err.message);
      continue;
    }
  }

  console.log(`🎯 Applied to ${count} job(s).`);
  await browser.close();
})();



// require("dotenv").config();
// const puppeteer = require("puppeteer");
// const path = require("path");
// const fs = require("fs");

// const LOCATIONS = ["Gurgaon", "Noida"];
// const KEYWORD = "Node.js Developer";
// const EXPERIENCE_FILTER = "f_E=3"; // Associate
// const TIME_FILTER = "f_TP=1"; // Past 24 hours
// const EASY_APPLY_FILTER = "f_AL=true";

// const appliedJobsFile = path.join(__dirname, "applied_jobs.txt");

// async function fillIfExists(page, selector, value) {
//   try {
//     const input = await page.$(selector);
//     if (input) {
//       await input.click({ clickCount: 3 });
//       await input.type(value);
//       console.log(`✅ Filled: ${selector}`);
//     }
//   } catch (e) {
//     console.log(`❌ Skipped (not found): ${selector}`);
//   }
// }

// async function logApplication(page, jobLink) {
//   const companyName = await page.$eval('.topcard__org-name-link, .topcard__flavor', el => el.innerText.trim()).catch(() => "Unknown Company");
//   const jobTitle = await page.$eval('.top-card-layout__title', el => el.innerText.trim()).catch(() => "Unknown Title");

//   // Read applied jobs file to check if job has already been applied
//   const appliedJobs = fs.readFileSync(appliedJobsFile, "utf8").split("\n");
  
//   // If the job link is already in the file, skip it
//   if (appliedJobs.some(job => job.includes(jobLink))) {
//     console.log(`⚠️ Already applied to: ${companyName} - ${jobTitle}`);
//     return; // Skip this job
//   }

//   const line = `${companyName} | ${jobTitle} | ${jobLink}\n`;
//   fs.appendFileSync(appliedJobsFile, line, "utf8");
//   console.log(`📝 Logged: ${companyName} - ${jobTitle}`);
// }

// (async () => {
// //   const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
// const browser = await puppeteer.launch({
//     headless: false,
//     defaultViewport: null,
//     args: ['--no-sandbox', '--disable-setuid-sandbox'],
//   });
//   const page = await browser.newPage();

//   // Login
//   await page.goto("https://www.linkedin.com/login");
//   await page.type("#username", process.env.LINKEDIN_EMAIL);
//   await page.type("#password", process.env.LINKEDIN_PASSWORD);
//   await page.click('button[type="submit"]');
//   await page.waitForNavigation();
//   console.log("✅ Logged in");

//   for (const location of LOCATIONS) {
//     console.log(`🌍 Searching jobs in: ${location}`);

//     const searchURL = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(KEYWORD)}&location=${encodeURIComponent(location)}&${EASY_APPLY_FILTER}&${TIME_FILTER}&${EXPERIENCE_FILTER}`;
//     // await page.goto(searchURL, { waitUntil: "networkidle2",timeout: 60000   });
//     await page.goto(searchURL, { waitUntil: "domcontentloaded",timeout: 60000   });

//     // Scroll to load jobs
//     for (let i = 0; i < 30; i++) {
//       await page.evaluate(() => window.scrollBy(0, window.innerHeight));
//       await page.waitForTimeout(1500);
//     }

//     const jobLinks = await page.$$eval('a.base-card__full-link', links =>
//       links.map(link => link.href)
//     );

//     console.log(`🔗 Found ${jobLinks.length} jobs in ${location}`);

//     for (const link of jobLinks) {
//       try {
//         await page.goto(link, { waitUntil: "networkidle2" });
//         await page.waitForTimeout(3000);

//         const easyApplyBtn = await page.$('button.jobs-apply-button');
//         if (!easyApplyBtn) {
//           console.log("⛔ No Easy Apply – skipping");
//           continue;
//         }

//         await easyApplyBtn.click();
//         await page.waitForTimeout(2000);

//         // Fill form fields
//         await fillIfExists(page, 'input[placeholder="Email address"]', process.env.USER_EMAIL);
//         await fillIfExists(page, 'input[placeholder="Phone number"]', process.env.USER_PHONE);
//         await fillIfExists(page, 'input[placeholder*="Current CTC"]', process.env.USER_CTC);
//         await fillIfExists(page, 'input[placeholder*="Expected CTC"]', process.env.USER_EXPECTED_CTC);
//         await fillIfExists(page, 'input[placeholder*="Notice"]', process.env.USER_NOTICE_PERIOD);

//         // Upload resume
//         const fileInput = await page.$('input[type="file"]');
//         if (fileInput) {
//           const filePath = path.resolve(__dirname, process.env.RESUME_PATH);
//           await fileInput.uploadFile(filePath);
//           console.log("📎 Resume uploaded");
//         }

//         const submitBtn = await page.$('button[aria-label="Submit application"]');
//         if (submitBtn) {
//           await submitBtn.click();
//           await logApplication(page, link);
//           console.log("✅ Application submitted!\n");
//         } else {
//           console.log("❗ Complex application – skipped");
//           const discardBtn = await page.$('button[aria-label="Dismiss"]');
//           if (discardBtn) await discardBtn.click();
//         }

//         await page.waitForTimeout(3000);
//       } catch (err) {
//         console.log("⚠️ Error with job:", err.message);
//       }
//     }
//   }

//   await browser.close();
// })();




//old script
// require("dotenv").config();
// const puppeteer = require("puppeteer");
// const path = require("path");

// const LOCATIONS = ["Gurgaon", "Noida"];
// const KEYWORD = "Node.js Developer";
// const EXPERIENCE_FILTER = "f_E=3"; // Associate
// const TIME_FILTER = "f_TP=1"; // Past 24 hours
// const EASY_APPLY_FILTER = "f_AL=true";

// async function fillIfExists(page, selector, value) {
//   try {
//     const input = await page.$(selector);
//     if (input) {
//       await input.click({ clickCount: 3 });
//       await input.type(value);
//       console.log(`✅ Filled: ${selector}`);
//     }
//   } catch (e) {
//     console.log(`❌ Skipped (not found): ${selector}`);
//   }
// }

// (async () => {
//   const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
//   const page = await browser.newPage();

//   // Login
//   await page.goto("https://www.linkedin.com/login");
//   await page.type("#username", process.env.LINKEDIN_EMAIL);
//   await page.type("#password", process.env.LINKEDIN_PASSWORD);
//   await page.click('button[type="submit"]');
//   await page.waitForNavigation();
//   console.log("✅ Logged in");

//   for (const location of LOCATIONS) {
//     console.log(`🌍 Searching jobs in: ${location}`);

//     const searchURL = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(KEYWORD)}&location=${encodeURIComponent(location)}&${EASY_APPLY_FILTER}&${TIME_FILTER}&${EXPERIENCE_FILTER}`;

//     await page.goto(searchURL, { waitUntil: "networkidle2" });

//     // Scroll to load jobs
//     for (let i = 0; i < 5; i++) {
//       await page.evaluate(() => window.scrollBy(0, window.innerHeight));
//       await page.waitForTimeout(1500);
//     }

//     const jobLinks = await page.$$eval('a.base-card__full-link', links =>
//       links.map(link => link.href)
//     );

//     console.log(`🔗 Found ${jobLinks.length} jobs in ${location}`);

//     for (const link of jobLinks) {
//       try {
//         await page.goto(link, { waitUntil: "networkidle2" });
//         await page.waitForTimeout(3000);

//         const easyApplyBtn = await page.$('button.jobs-apply-button');
//         if (!easyApplyBtn) {
//           console.log("⛔ No Easy Apply – skipping");
//           continue;
//         }

//         await easyApplyBtn.click();
//         await page.waitForTimeout(2000);

//         // Fill form fields
//         await fillIfExists(page, 'input[placeholder="Email address"]', process.env.USER_EMAIL);
//         await fillIfExists(page, 'input[placeholder="Phone number"]', process.env.USER_PHONE);
//         await fillIfExists(page, 'input[placeholder*="Current CTC"]', process.env.USER_CTC);
//         await fillIfExists(page, 'input[placeholder*="Expected CTC"]', process.env.USER_EXPECTED_CTC);
//         await fillIfExists(page, 'input[placeholder*="Notice"]', process.env.USER_NOTICE_PERIOD);

//         // Upload resume
//         const fileInput = await page.$('input[type="file"]');
//         if (fileInput) {
//           const filePath = path.resolve(__dirname, process.env.RESUME_PATH);
//           await fileInput.uploadFile(filePath);
//           console.log("📎 Resume uploaded");
//         }

//         const submitBtn = await page.$('button[aria-label="Submit application"]');
//         if (submitBtn) {
//           await submitBtn.click();
//           console.log("✅ Application submitted!\n");
//         } else {
//           console.log("❗ Complex application – skipped");
//           const discardBtn = await page.$('button[aria-label="Dismiss"]');
//           if (discardBtn) await discardBtn.click();
//         }

//         await page.waitForTimeout(3000);
//       } catch (err) {
//         console.log("⚠️ Error with job:", err.message);
//       }
//     }
//   }

//   await browser.close();
// })();
