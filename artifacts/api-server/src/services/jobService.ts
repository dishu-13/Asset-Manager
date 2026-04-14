export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  tags: string[];
  requirements: string[];
  benefits: string[];
  isRemote: boolean;
  type: string;
  experienceLevel?: string;
  category: string;
  source: string;
  applyUrl: string;
  postedAt: string;
  atsScore?: number;
  featured?: boolean;
  logoUrl?: string;
  isVerifiedLive?: boolean;
  listingKind?: "verified_live" | "structured";
}

interface CacheEntry {
  jobs: JobListing[];
  fetchedAt: number;
}

interface GreenhouseBoardConfig {
  boardToken: string;
  company: string;
}

interface AdzunaJobResult {
  id?: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  description?: string;
  redirect_url?: string;
  contract_type?: string;
  contract_time?: string;
  category?: { label?: string };
  salary_min?: number;
  salary_max?: number;
  created?: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const VERIFIED_JOB_MAX_AGE_DAYS = 45;
const DEFAULT_SOURCE_LIMIT = 20;
const SEARCH_SOURCE_LIMIT = 80;
const liveJobsCache = new Map<string, CacheEntry>();
const ADZUNA_APP_ID = process.env["ADZUNA_APP_ID"];
const ADZUNA_APP_KEY = process.env["ADZUNA_APP_KEY"];
const GREENHOUSE_BOARDS: GreenhouseBoardConfig[] = [
  { boardToken: "okta", company: "Okta" },
  { boardToken: "stripe", company: "Stripe" },
  { boardToken: "abnormalsecurity", company: "Abnormal Security" },
  { boardToken: "samsara", company: "Samsara" },
  { boardToken: "coinbase", company: "Coinbase" },
  { boardToken: "browserstack", company: "BrowserStack" },
  { boardToken: "rubrik", company: "Rubrik" },
  { boardToken: "postman", company: "Postman" },
  { boardToken: "atlan", company: "Atlan" },
  { boardToken: "cleartax", company: "ClearTax" },
];
const INDIA_LOCATION_KEYWORDS = [
  "india", "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "delhi", "gurugram", "gurgaon",
  "noida", "chennai", "kolkata", "ahmedabad", "jaipur", "kochi", "coimbatore", "remote india",
];

function toSalaryRange(min?: number, max?: number, currency = "INR") {
  if (!min || !max) return undefined;
  return { salaryMin: min, salaryMax: max, salary: `${currency} ${min.toLocaleString("en-IN")} - ${max.toLocaleString("en-IN")}` };
}

function inferExperienceLevel(title: string, requirements: string[] = [], description = "") {
  const haystack = `${title} ${requirements.join(" ")} ${description}`.toLowerCase();
  if (/\b(intern|internship|trainee)\b/.test(haystack)) return "Internship";
  if (/\b(fresher|entry|junior|associate)\b|0-2|1\+ year|1-2 years|2\+ years/.test(haystack)) return "Entry";
  if (/\b(senior|lead|staff|principal|architect)\b|5\+ years|6\+ years|7\+ years/.test(haystack)) return "Senior";
  return "Mid";
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanMojibake(value: string) {
  return value
    .replace(/â€”/g, "-")
    .replace(/â€“/g, "-")
    .replace(/â€¢/g, "•")
    .replace(/â†’/g, "->")
    .replace(/Â·/g, "·")
    .replace(/Â/g, "")
    .replace(/[�]+/g, " ");
}

function extractStructuredLines(description: string) {
  return description
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isIndiaRelevantLocation(location: string, isRemote: boolean) {
  const normalized = location.toLowerCase();
  return INDIA_LOCATION_KEYWORDS.some((keyword) => normalized.includes(keyword)) || (isRemote && normalized.includes("india"));
}

function isIndiaRelevantJob(job: JobListing) {
  return isIndiaRelevantLocation(job.location, job.isRemote);
}

function hasUsableApplyUrl(job: JobListing) {
  return /^https?:\/\//i.test(job.applyUrl || "");
}

function isFreshJob(job: JobListing) {
  const postedAt = new Date(job.postedAt).getTime();
  if (Number.isNaN(postedAt)) return false;
  const ageMs = Date.now() - postedAt;
  return ageMs >= 0 && ageMs <= VERIFIED_JOB_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function parseSalaryBounds(salary: string) {
  const values = (salary.match(/\d+(?:\.\d+)?/g) || []).map((value) => Number(value));
  if (values.length < 2) return {};
  const multiplier = /k\s*\/?\s*month|k\s*-\s*\d+/i.test(salary) ? 1000 : 100000;
  const first = Math.round(values[0] * multiplier);
  const second = Math.round(values[1] * multiplier);
  return { salaryMin: Math.min(first, second), salaryMax: Math.max(first, second) };
}

const INDIA_PLATFORM_JOBS: JobListing[] = [
  {
    id: "india_linkedin_sde_bengaluru",
    title: "Software Development Engineer I",
    company: "Razorpay",
    location: "Bengaluru, India",
    salary: "INR 10 LPA - 18 LPA",
    description: "Build merchant-facing payment products, collaborate with backend and frontend teams, and ship production features used across India.",
    tags: ["React", "Node.js", "Payments", "API"],
    requirements: ["1+ year software engineering experience", "Strong JavaScript or TypeScript", "Comfort with APIs"],
    benefits: ["Health insurance", "Hybrid work", "Learning budget"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Entry",
    category: "Engineering",
    source: "LinkedIn",
    applyUrl: "https://www.linkedin.com/jobs/view/software-development-engineer-i-at-razorpay-3876543210/",
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    atsScore: 82,
    isVerifiedLive: false,
    listingKind: "structured",
    ...toSalaryRange(1000000, 1800000),
  },
  {
    id: "india_naukri_data_analyst_hyderabad",
    title: "Data Analyst",
    company: "Infosys BPM",
    location: "Hyderabad, India",
    salary: "INR 6 LPA - 11 LPA",
    description: "Analyze business data, create dashboards, and support stakeholders with reporting and insights for operations teams.",
    tags: ["SQL", "Power BI", "Excel", "Analytics"],
    requirements: ["SQL proficiency", "Dashboarding experience", "Strong analytical skills"],
    benefits: ["PF", "Medical insurance", "Career growth"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Data",
    source: "Naukri.com",
    applyUrl: "https://www.naukri.com/job-listings-data-analyst-infosys-bpm-hyderabad-3-to-5-years-120324500123",
    postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    atsScore: 76,
    ...toSalaryRange(600000, 1100000),
  },
  {
    id: "india_indeed_product_analyst_pune",
    title: "Product Analyst",
    company: "PubMatic",
    location: "Pune, India",
    salary: "INR 9 LPA - 16 LPA",
    description: "Work with product and growth teams to evaluate experiments, analyze funnels, and recommend product improvements.",
    tags: ["SQL", "Experimentation", "Product", "Analytics"],
    requirements: ["Product analytics experience", "SQL", "Stakeholder communication"],
    benefits: ["Hybrid work", "Wellness benefits", "Bonus"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Product",
    source: "Indeed",
    applyUrl: "https://in.indeed.com/viewjob?jk=7f18b6e4c8a24c11",
    postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    atsScore: 74,
    ...toSalaryRange(900000, 1600000),
  },
  {
    id: "india_glassdoor_ui_ux_gurugram",
    title: "UI/UX Designer",
    company: "PayU",
    location: "Gurugram, India",
    salary: "INR 8 LPA - 15 LPA",
    description: "Design mobile-first experiences, create reusable systems, and work closely with product and engineering on fintech workflows.",
    tags: ["Figma", "Design Systems", "UX", "Mobile"],
    requirements: ["Strong portfolio", "Figma expertise", "User-centric design"],
    benefits: ["Insurance", "Flexible hours", "Team offsites"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Design",
    source: "Glassdoor",
    applyUrl: "https://www.glassdoor.co.in/job-listing/ui-ux-designer-payu-JV_IC2907928_KO0,14_KE15,19.htm?jl=1009123456789",
    postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    atsScore: 71,
    ...toSalaryRange(800000, 1500000),
  },
  {
    id: "india_monster_backend_chennai",
    title: "Backend Engineer",
    company: "Zoho",
    location: "Chennai, India",
    salary: "INR 8 LPA - 14 LPA",
    description: "Build scalable backend services, write clean APIs, and support enterprise applications used across global markets.",
    tags: ["Java", "Spring Boot", "MySQL", "APIs"],
    requirements: ["Backend development experience", "Java or similar", "Database design"],
    benefits: ["Meals", "Insurance", "Internal mobility"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Engineering",
    source: "Monster India",
    applyUrl: "https://www.foundit.in/job/backend-engineer-zoho-chennai-31415926",
    postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    atsScore: 80,
    ...toSalaryRange(800000, 1400000),
  },
  {
    id: "india_foundit_devops_bengaluru",
    title: "DevOps Engineer",
    company: "PhonePe",
    location: "Bengaluru, India",
    salary: "INR 14 LPA - 24 LPA",
    description: "Build CI/CD pipelines, improve cloud reliability, and support platform engineering for high-scale fintech systems.",
    tags: ["AWS", "Kubernetes", "Terraform", "DevOps"],
    requirements: ["3+ years DevOps experience", "Cloud infrastructure", "CI/CD automation"],
    benefits: ["Insurance", "ESOPs", "Hybrid work"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Engineering",
    source: "Foundit",
    applyUrl: "https://www.foundit.in/job/devops-engineer-phonepe-bengaluru-31417002",
    postedAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    atsScore: 84,
    ...toSalaryRange(1400000, 2400000),
  },
  {
    id: "india_internshala_marketing_intern_delhi",
    title: "Digital Marketing Intern",
    company: "GrowthSchool",
    location: "Delhi, India",
    salary: "INR 20K - 35K / month",
    description: "Support campaign execution, social content, and growth experiments for community-led education programs.",
    tags: ["Internship", "Marketing", "Content", "Social Media"],
    requirements: ["Good communication", "Basic analytics", "Creative thinking"],
    benefits: ["Certificate", "PPO opportunity", "Flexible work"],
    isRemote: true,
    type: "Internship",
    experienceLevel: "Internship",
    category: "Marketing",
    source: "Internshala",
    applyUrl: "https://internshala.com/internship/detail/digital-marketing-internship-in-delhi-at-growthschool1711987654",
    postedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    atsScore: 69,
    ...toSalaryRange(240000, 420000),
  },
  {
    id: "india_freshersworld_java_fresher_noida",
    title: "Java Developer Fresher",
    company: "TCS iON",
    location: "Noida, India",
    salary: "INR 3.5 LPA - 5 LPA",
    description: "Entry-level software role for fresh graduates working on Java-based enterprise applications and internal tools.",
    tags: ["Fresher", "Java", "Spring", "OOP"],
    requirements: ["B.Tech or MCA", "Core Java", "Problem solving"],
    benefits: ["Training", "Structured onboarding", "Medical cover"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Entry",
    category: "Engineering",
    source: "Freshersworld",
    applyUrl: "https://www.freshersworld.com/jobs/java-developer-fresher-jobs-opening-in-noida-at-tcs-ion-2019456",
    postedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    atsScore: 67,
    ...toSalaryRange(350000, 500000),
  },
  {
    id: "india_letsintern_content_intern_mumbai",
    title: "Content Writing Intern",
    company: "BlueLearn",
    location: "Mumbai, India",
    salary: "INR 15K - 25K / month",
    description: "Create student-focused content, write newsletters, and help improve engagement across internship and learning campaigns.",
    tags: ["Internship", "Writing", "Content", "Community"],
    requirements: ["Strong written English", "Creativity", "Time management"],
    benefits: ["Mentorship", "Remote-friendly", "Certificate"],
    isRemote: true,
    type: "Internship",
    experienceLevel: "Internship",
    category: "Marketing",
    source: "LetsIntern",
    applyUrl: "https://www.letsintern.com/internship/content-writing-intern-at-bluelearn-mumbai-908172",
    postedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    atsScore: 63,
    ...toSalaryRange(180000, 300000),
  },
  {
    id: "india_wellfound_founding_engineer_bengaluru",
    title: "Founding Full Stack Engineer",
    company: "Stealth Startup",
    location: "Bengaluru, India",
    salary: "INR 18 LPA - 30 LPA",
    description: "Join an early-stage startup to build MVP features, own frontend and backend modules, and shape product direction from day one.",
    tags: ["Startup", "React", "Node.js", "Founding Team"],
    requirements: ["Strong full-stack ability", "Startup mindset", "Ownership"],
    benefits: ["ESOPs", "Remote-flex", "High ownership"],
    isRemote: true,
    type: "Full-time",
    experienceLevel: "Senior",
    category: "Engineering",
    source: "Wellfound",
    applyUrl: "https://wellfound.com/jobs/3045121-founding-full-stack-engineer",
    postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    atsScore: 85,
    ...toSalaryRange(1800000, 3000000),
  },
  {
    id: "india_hirect_flutter_gurugram",
    title: "Flutter Developer",
    company: "Pocket FM",
    location: "Gurugram, India",
    salary: "INR 7 LPA - 14 LPA",
    description: "Develop mobile features, improve app performance, and collaborate with product teams on user-facing experiences.",
    tags: ["Flutter", "Dart", "Mobile", "App"],
    requirements: ["Flutter projects", "State management", "API integration"],
    benefits: ["Flexible timings", "Insurance", "Performance bonus"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Engineering",
    source: "Hirect",
    applyUrl: "https://www.hirect.in/job/flutter-developer-pocket-fm-gurugram-1839274",
    postedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    atsScore: 73,
    ...toSalaryRange(700000, 1400000),
  },
  {
    id: "india_cutshort_react_pune",
    title: "Frontend Developer",
    company: "BrowserStack",
    location: "Pune, India",
    salary: "INR 12 LPA - 22 LPA",
    description: "Build polished product interfaces, optimize web performance, and contribute to a robust component-driven frontend platform.",
    tags: ["React", "TypeScript", "Frontend", "Performance"],
    requirements: ["React production experience", "TypeScript", "UI quality focus"],
    benefits: ["Remote-first", "Learning budget", "Insurance"],
    isRemote: true,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Engineering",
    source: "CutShort",
    applyUrl: "https://cutshort.io/job/Frontend-Developer-BrowserStack-Pune-a1b2c3d4",
    postedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    atsScore: 83,
    ...toSalaryRange(1200000, 2200000),
  },
  {
    id: "india_apna_bpo_jaipur",
    title: "Customer Support Executive",
    company: "Teleperformance",
    location: "Jaipur, India",
    salary: "INR 2.8 LPA - 4.2 LPA",
    description: "Handle customer queries, manage issue resolution workflows, and maintain support SLAs across inbound processes.",
    tags: ["Support", "Voice Process", "BPO", "Operations"],
    requirements: ["Communication skills", "Customer handling", "Basic computer skills"],
    benefits: ["Incentives", "Shift allowance", "Training"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Entry",
    category: "Product",
    source: "Apna",
    applyUrl: "https://apna.co/job/jaipur/customer-support-executive-teleperformance-927364512",
    postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    atsScore: 58,
    ...toSalaryRange(280000, 420000),
  },
  {
    id: "india_quikrjobs_sales_ahmedabad",
    title: "Inside Sales Associate",
    company: "Byju's",
    location: "Ahmedabad, India",
    salary: "INR 4 LPA - 7 LPA",
    description: "Drive lead conversion, conduct outbound calling, and support education product enrollment pipelines.",
    tags: ["Sales", "CRM", "Inside Sales", "EdTech"],
    requirements: ["Sales aptitude", "Negotiation skills", "Target orientation"],
    benefits: ["Incentives", "Training", "Growth path"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Entry",
    category: "Marketing",
    source: "QuikrJobs",
    applyUrl: "https://www.quikr.com/jobs/inside-sales-associate-byjus-ahmedabad-w0h6x9z1",
    postedAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
    atsScore: 60,
    ...toSalaryRange(400000, 700000),
  },
  {
    id: "india_shine_dataengineer_gurugram",
    title: "Data Engineer",
    company: "American Express",
    location: "Gurugram, India",
    salary: "INR 12 LPA - 20 LPA",
    description: "Develop ETL workflows, manage data pipelines, and enable analytics teams with reliable platform datasets.",
    tags: ["Python", "Spark", "ETL", "Data Engineering"],
    requirements: ["3+ years data engineering", "Python or Scala", "Pipeline orchestration"],
    benefits: ["Hybrid", "Insurance", "Bonus"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Data",
    source: "Shine.com",
    applyUrl: "https://www.shine.com/jobs/data-engineer/american-express/17450211",
    postedAt: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
    atsScore: 78,
    ...toSalaryRange(1200000, 2000000),
  },
  {
    id: "india_instahyre_backend_pune",
    title: "Senior Backend Developer",
    company: "Mindtickle",
    location: "Pune, India",
    salary: "INR 18 LPA - 30 LPA",
    description: "Design scalable backend services, work on distributed systems, and ship enterprise learning platform features.",
    tags: ["Java", "Microservices", "Backend", "Distributed Systems"],
    requirements: ["5+ years backend engineering", "Java or Kotlin", "API design"],
    benefits: ["ESOPs", "Insurance", "Flexible work"],
    isRemote: true,
    type: "Full-time",
    experienceLevel: "Senior",
    category: "Engineering",
    source: "Instahyre",
    applyUrl: "https://www.instahyre.com/job-314159-senior-backend-developer-at-mindtickle-pune/",
    postedAt: new Date(Date.now() - 125 * 60 * 1000).toISOString(),
    atsScore: 87,
    ...toSalaryRange(1800000, 3000000),
  },
  {
    id: "india_hirist_fullstack_noida",
    title: "Full Stack Developer",
    company: "MakeMyTrip",
    location: "Noida, India",
    salary: "INR 16 LPA - 26 LPA",
    description: "Build user-facing booking experiences and backend APIs for large-scale travel commerce workflows.",
    tags: ["React", "Node.js", "Full Stack", "TypeScript"],
    requirements: ["4+ years full stack experience", "React", "Node.js"],
    benefits: ["Insurance", "Travel perks", "Bonus"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Senior",
    category: "Engineering",
    source: "Hirist",
    applyUrl: "https://www.hirist.tech/j/full-stack-developer-makemytrip-noida-1618033",
    postedAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    atsScore: 85,
    ...toSalaryRange(1600000, 2600000),
  },
  {
    id: "india_workindia_field_ops_kolkata",
    title: "Field Operations Executive",
    company: "Zepto",
    location: "Kolkata, India",
    salary: "INR 3 LPA - 4.8 LPA",
    description: "Support store operations, coordinate with on-ground teams, and ensure smooth delivery and escalation handling.",
    tags: ["Operations", "Field", "Logistics", "Coordination"],
    requirements: ["Operational discipline", "Communication", "Local mobility"],
    benefits: ["Travel allowance", "PF", "Weekly incentives"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Entry",
    category: "Product",
    source: "WorkIndia",
    applyUrl: "https://www.workindia.in/jobs/field-operations-executive-kolkata-zepto-1882345/",
    postedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    atsScore: 55,
    ...toSalaryRange(300000, 480000),
  },
  {
    id: "india_linkedin_pm_bengaluru",
    title: "Associate Product Manager",
    company: "Meesho",
    location: "Bengaluru, India",
    salary: "INR 14,00,000 - 22,00,000",
    description: "Own product experiments, partner with engineering and analytics, and drive seller growth features for India-first commerce.",
    tags: ["Product", "SQL", "Growth", "A/B Testing"],
    requirements: ["2+ years in product or analytics", "Strong problem solving", "Stakeholder management"],
    benefits: ["ESOPs", "Insurance", "Hybrid work"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Product",
    source: "LinkedIn",
    applyUrl: "https://www.linkedin.com/jobs/view/associate-product-manager-at-meesho-3876500456/",
    postedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    atsScore: 79,
    ...toSalaryRange(1400000, 2200000),
  },
  {
    id: "india_naukri_sdet_noida",
    title: "SDET I",
    company: "Paytm",
    location: "Noida, India",
    salary: "INR 8,00,000 - 15,00,000",
    description: "Build API and UI automation, improve release quality, and collaborate with backend and mobile engineers.",
    tags: ["QA", "Automation", "Java", "Selenium"],
    requirements: ["2+ years testing experience", "Automation framework knowledge", "API testing"],
    benefits: ["Health cover", "Hybrid", "Food allowance"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Engineering",
    source: "Naukri.com",
    applyUrl: "https://www.naukri.com/job-listings-sdet-i-paytm-noida-2-to-4-years-240324700421",
    postedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    atsScore: 77,
    ...toSalaryRange(800000, 1500000),
  },
  {
    id: "india_internshala_sde_intern_bengaluru",
    title: "Software Engineer Intern",
    company: "Scaler",
    location: "Bengaluru, India",
    salary: "INR 35,000 - 60,000 / month",
    description: "Contribute to learner-facing web products, build internal tools, and ship frontend improvements with mentorship.",
    tags: ["Internship", "React", "TypeScript", "Frontend"],
    requirements: ["Strong DSA basics", "React familiarity", "Good communication"],
    benefits: ["PPO opportunity", "Mentorship", "Flexible timing"],
    isRemote: true,
    type: "Internship",
    experienceLevel: "Internship",
    category: "Engineering",
    source: "Internshala",
    applyUrl: "https://internshala.com/internship/detail/software-engineer-internship-in-bangalore-at-scaler1711989123",
    postedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    atsScore: 81,
    ...toSalaryRange(420000, 720000),
  },
  {
    id: "india_wellfound_backend_remote_india",
    title: "Backend Engineer",
    company: "Seekho",
    location: "Remote, India",
    salary: "INR 12,00,000 - 20,00,000",
    description: "Build scalable backend services for creator-led learning products with strong ownership across APIs and data models.",
    tags: ["Startup", "Node.js", "PostgreSQL", "Remote"],
    requirements: ["3+ years backend experience", "API design", "Startup ownership"],
    benefits: ["Remote-first", "ESOPs", "Learning budget"],
    isRemote: true,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Engineering",
    source: "Wellfound",
    applyUrl: "https://wellfound.com/jobs/3045198-backend-engineer-india-remote",
    postedAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    atsScore: 84,
    ...toSalaryRange(1200000, 2000000),
  },
  {
    id: "india_cutshort_android_bengaluru",
    title: "Android Developer",
    company: "CRED",
    location: "Bengaluru, India",
    salary: "INR 18,00,000 - 28,00,000",
    description: "Ship native Android experiences, improve app performance, and collaborate on premium consumer product flows.",
    tags: ["Android", "Kotlin", "Mobile", "Performance"],
    requirements: ["3+ years Android", "Kotlin", "Strong product polish"],
    benefits: ["Insurance", "Wellness", "Food"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Senior",
    category: "Engineering",
    source: "CutShort",
    applyUrl: "https://cutshort.io/job/Android-Developer-CRED-Bengaluru-z9y8x7w6",
    postedAt: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    atsScore: 86,
    ...toSalaryRange(1800000, 2800000),
  },
  {
    id: "india_apna_sales_mumbai",
    title: "Field Sales Executive",
    company: "Jio",
    location: "Mumbai, India",
    salary: "INR 3,20,000 - 5,40,000",
    description: "Drive local sales acquisition, visit merchant locations, and manage conversion targets for telecom products.",
    tags: ["Sales", "Field", "Retail", "Target"],
    requirements: ["Graduation preferred", "Field sales exposure", "Communication skills"],
    benefits: ["Incentives", "Travel reimbursement", "Training"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Entry",
    category: "Marketing",
    source: "Apna",
    applyUrl: "https://apna.co/job/mumbai/field-sales-executive-jio-927364778",
    postedAt: new Date(Date.now() - 160 * 60 * 1000).toISOString(),
    atsScore: 61,
    ...toSalaryRange(320000, 540000),
  },
  {
    id: "india_freshersworld_support_pune",
    title: "Technical Support Engineer",
    company: "Wipro",
    location: "Pune, India",
    salary: "INR 3,60,000 - 5,20,000",
    description: "Support enterprise users, troubleshoot software issues, and maintain customer-facing support SLAs.",
    tags: ["Fresher", "Support", "Networking", "Linux"],
    requirements: ["BE/BTech graduates", "Communication", "Troubleshooting basics"],
    benefits: ["Shift allowance", "Insurance", "Training academy"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Entry",
    category: "Engineering",
    source: "Freshersworld",
    applyUrl: "https://www.freshersworld.com/jobs/technical-support-engineer-jobs-opening-in-pune-at-wipro-2019522",
    postedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    atsScore: 64,
    ...toSalaryRange(360000, 520000),
  },
  {
    id: "india_hirect_recruiter_hyderabad",
    title: "Talent Acquisition Specialist",
    company: "Darwinbox",
    location: "Hyderabad, India",
    salary: "INR 6,00,000 - 10,00,000",
    description: "Own hiring pipelines for product and engineering teams and coordinate interviews with fast-moving stakeholders.",
    tags: ["Recruiting", "Hiring", "HR", "Tech Hiring"],
    requirements: ["2+ years recruitment experience", "Startup pace", "Stakeholder management"],
    benefits: ["Hybrid work", "Insurance", "Variable pay"],
    isRemote: false,
    type: "Full-time",
    experienceLevel: "Mid",
    category: "Marketing",
    source: "Hirect",
    applyUrl: "https://www.hirect.in/job/talent-acquisition-specialist-darwinbox-hyderabad-1839461",
    postedAt: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
    atsScore: 68,
    ...toSalaryRange(600000, 1000000),
  },
];

function normalizeText(value: string) {
  return cleanMojibake(
    decodeEntities(value)
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "• ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<h[1-6][^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function filterJobsByQuery(jobs: JobListing[], query?: string) {
  if (!query) return jobs;
  const q = query.toLowerCase();
  return jobs.filter((job) =>
    job.title.toLowerCase().includes(q) ||
    job.company.toLowerCase().includes(q) ||
    job.location.toLowerCase().includes(q) ||
    job.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    job.description.toLowerCase().includes(q) ||
    job.source.toLowerCase().includes(q),
  );
}

function inferCategory(value?: string) {
  const text = (value || "").toLowerCase();
  if (text.includes("design")) return "Design";
  if (text.includes("market")) return "Marketing";
  if (text.includes("product")) return "Product";
  if (text.includes("data") || text.includes("science") || text.includes("analyst")) return "Data";
  return "Engineering";
}

function normalizeRemotiveJob(job: any): JobListing {
  const tags = (job.tags || [])
    .map((tag: any) => (typeof tag === "string" ? tag : tag?.name || ""))
    .filter(Boolean)
    .slice(0, 6);

  return {
    id: `remotive_${job.id ?? `${job.company_name}_${job.title}`}`.replace(/\s+/g, "_").toLowerCase(),
    title: job.title || "Software Engineer",
    company: job.company_name || "Unknown Company",
    location: job.candidate_required_location || "Remote",
    salary: job.salary || "Competitive",
    description: normalizeText(job.description || "").slice(0, 2000),
    tags,
    requirements: [],
    benefits: [],
    isRemote: true,
    type: job.job_type || "Full-time",
    experienceLevel: inferExperienceLevel(job.title || "", [], normalizeText(job.description || "")),
    category: inferCategory(job.category || job.job_type),
    source: "Remotive",
    applyUrl: job.url || "",
    postedAt: job.publication_date || new Date().toISOString(),
    logoUrl: job.company_logo,
    isVerifiedLive: true,
    listingKind: "verified_live",
    ...parseSalaryBounds(job.salary || ""),
  };
}

function normalizeArbeitnowJob(job: any): JobListing {
  const tags = (job.tags || []).filter(Boolean).slice(0, 6);

  return {
    id: `arbeitnow_${job.slug || `${job.company_name}_${job.title}`}`.replace(/\s+/g, "_").toLowerCase(),
    title: job.title || "Software Engineer",
    company: job.company_name || "Unknown Company",
    location: job.location || "Remote",
    salary: "Competitive",
    description: normalizeText(job.description || "").slice(0, 2000),
    tags,
    requirements: [],
    benefits: [],
    isRemote: Boolean(job.remote),
    type: "Full-time",
    experienceLevel: inferExperienceLevel(job.title || "", [], normalizeText(job.description || "")),
    category: inferCategory(job.title),
    source: "Arbeitnow",
    applyUrl: job.url || "",
    postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
    isVerifiedLive: true,
    listingKind: "verified_live",
  };
}

function normalizeHimalayasJob(job: any): JobListing {
  const categories = [...(job.category || []), ...(job.parentCategories || [])].filter(Boolean);
  const locationRestrictions = (job.locationRestrictions || []).filter(Boolean);
  const tags = [...categories, ...(job.timezoneRestriction || [])].filter(Boolean).slice(0, 6);
  const salary =
    job.minSalary && job.maxSalary && job.currency
      ? `${job.currency} ${job.minSalary} - ${job.maxSalary}`
      : "Competitive";

  return {
    id: `himalayas_${job.guid || `${job.companyName}_${job.title}`}`.replace(/\s+/g, "_").toLowerCase(),
    title: job.title || "Remote Role",
    company: job.companyName || "Unknown Company",
    location: locationRestrictions.length > 0 ? locationRestrictions.join(", ") : "Remote",
    salary,
    description: normalizeText(job.description || job.excerpt || "").slice(0, 2000),
    tags,
    requirements: [],
    benefits: [],
    isRemote: true,
    type: job.employmentType || "Full-time",
    experienceLevel: inferExperienceLevel(job.title || "", [], normalizeText(job.description || job.excerpt || "")),
    category: inferCategory(categories.join(" ") || job.title),
    source: "Himalayas",
    applyUrl: job.applicationLink || "",
    postedAt: job.pubDate || new Date().toISOString(),
    logoUrl: job.companyLogo,
    isVerifiedLive: true,
    listingKind: "verified_live",
    ...parseSalaryBounds(salary),
  };
}

function normalizeRemoteOkJob(job: any): JobListing {
  const tags = (job.tags || []).filter(Boolean).slice(0, 6);
  const salary =
    job.salary_min && job.salary_max
      ? `$${job.salary_min} - $${job.salary_max}`
      : "Competitive";
  const description = normalizeText(job.description || "");
  const structuredLines = extractStructuredLines(description);

  return {
    id: `remoteok_${job.id || job.slug || `${job.company}_${job.position}`}`.replace(/\s+/g, "_").toLowerCase(),
    title: job.position || "Remote Role",
    company: job.company || "Unknown Company",
    location: job.location || "Remote",
    salary,
    description: description.slice(0, 2500),
    tags,
    requirements: structuredLines
      .filter((line) => /what you'll do|what you will do|responsibilities|requirements|qualifications/i.test(line))
      .slice(0, 6),
    benefits: structuredLines
      .filter((line) => /benefits|perks|why join|what we offer/i.test(line))
      .slice(0, 6),
    isRemote: true,
    type: tags.some((tag: string) => tag.toLowerCase() === "contract") ? "Contract" : "Full-time",
    experienceLevel: inferExperienceLevel(job.position || "", [], description),
    category: inferCategory(tags.join(" ") || job.position),
    source: "Remote OK",
    applyUrl: job.apply_url || job.url || "",
    postedAt: job.date || new Date((job.epoch || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    logoUrl: job.company_logo || job.logo || "",
    isVerifiedLive: true,
    listingKind: "verified_live",
    ...parseSalaryBounds(salary),
  };
}

function normalizeAdzunaJob(job: AdzunaJobResult): JobListing {
  const location = job.location?.display_name || job.location?.area?.join(", ") || "India";
  const salary = job.salary_min && job.salary_max
    ? `INR ${Math.round(job.salary_min).toLocaleString("en-IN")} - ${Math.round(job.salary_max).toLocaleString("en-IN")}`
    : "Competitive";
  const description = normalizeText(job.description || "");

  return {
    id: `adzuna_${job.id || `${job.company?.display_name}_${job.title}`}`.replace(/\s+/g, "_").toLowerCase(),
    title: job.title || "Open Role",
    company: job.company?.display_name || "Unknown Company",
    location,
    salary,
    salaryMin: job.salary_min ? Math.round(job.salary_min) : undefined,
    salaryMax: job.salary_max ? Math.round(job.salary_max) : undefined,
    description: description.slice(0, 2000),
    tags: [job.category?.label || "", job.contract_time || "", job.contract_type || ""].filter(Boolean).slice(0, 6),
    requirements: [],
    benefits: [],
    isRemote: /remote/i.test(location),
    type: job.contract_time || job.contract_type || "Full-time",
    experienceLevel: inferExperienceLevel(job.title || "", [], description),
    category: inferCategory(job.category?.label || job.title),
    source: "Adzuna",
    applyUrl: job.redirect_url || "",
    postedAt: job.created || new Date().toISOString(),
    isVerifiedLive: true,
    listingKind: "verified_live",
  };
}

function normalizeGreenhouseJob(job: any, config: GreenhouseBoardConfig): JobListing {
  const metadataEntries = Array.isArray(job.metadata) ? job.metadata : [];
  const metadataText = metadataEntries
    .map((entry: any) => `${entry?.name || ""} ${entry?.value || ""}`)
    .join(" ");
  const tags = [
    ...(job.departments || []).map((department: any) => department?.name).filter(Boolean),
    ...metadataEntries.map((entry: any) => entry?.value).filter((value: any) => typeof value === "string"),
  ].slice(0, 6);
  const description = normalizeText(job.content || job.title || "");
  const structuredLines = extractStructuredLines(description);
  const employmentType =
    metadataEntries.find((entry: any) => String(entry?.name || "").toLowerCase().includes("employment"))?.value ||
    "Full-time";

  return {
    id: `greenhouse_${config.boardToken}_${job.id}`,
    title: job.title || "Open Role",
    company: config.company,
    location: job.location?.name || "India",
    salary: "Competitive",
    description: description.slice(0, 2500),
    tags,
    requirements: structuredLines
      .filter((line) => /what you'll do|what you will do|responsibilities|requirements|qualifications/i.test(line))
      .slice(0, 6),
    benefits: structuredLines
      .filter((line) => /benefits|perks|why join|what we offer|growth & support/i.test(line))
      .slice(0, 6),
    isRemote: /remote/i.test(job.location?.name || ""),
    type: employmentType,
    experienceLevel: inferExperienceLevel(job.title || "", [], description),
    category: inferCategory(`${job.title || ""} ${metadataText}`),
    source: `${config.company} Careers`,
    applyUrl: job.absolute_url || "",
    postedAt: job.updated_at || job.created_at || new Date().toISOString(),
    logoUrl: "",
    isVerifiedLive: true,
    listingKind: "verified_live",
  };
}

async function fetchRemotiveJobs(query?: string): Promise<JobListing[]> {
  const limit = query ? SEARCH_SOURCE_LIMIT : DEFAULT_SOURCE_LIMIT;
  const url = query
    ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=${limit}`
    : `https://remotive.com/api/remote-jobs?limit=${limit}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Remotive ${res.status}`);

  const data = (await res.json()) as any;
  return (data.jobs || [])
    .map(normalizeRemotiveJob)
    .filter((job: JobListing) => Boolean(job.applyUrl))
    .filter(isIndiaRelevantJob);
}

async function fetchArbeitnowJobs(query?: string): Promise<JobListing[]> {
  const url = query
    ? `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`
    : "https://www.arbeitnow.com/api/job-board-api";

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);

  const data = (await res.json()) as any;
  return (data.data || [])
    .slice(0, query ? SEARCH_SOURCE_LIMIT : DEFAULT_SOURCE_LIMIT)
    .map(normalizeArbeitnowJob)
    .filter((job: JobListing) => Boolean(job.applyUrl))
    .filter(isIndiaRelevantJob);
}

async function fetchHimalayasJobs(query?: string): Promise<JobListing[]> {
  const pageSize = query ? 20 : DEFAULT_SOURCE_LIMIT;
  const offsets = query ? [0, 20, 40, 60] : [0];
  const responses = await Promise.all(
    offsets.map(async (offset) => {
      const res = await fetch(`https://himalayas.app/jobs/api?limit=${pageSize}&offset=${offset}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Himalayas ${res.status}`);
      return (await res.json()) as any[];
    }),
  );

  const jobs = responses
    .flatMap((data) => data || [])
    .map(normalizeHimalayasJob)
    .filter((job: JobListing) => Boolean(job.applyUrl))
    .filter(isIndiaRelevantJob);

  if (!query) return jobs;

  const q = query.toLowerCase();
  return jobs.filter((job) =>
    job.title.toLowerCase().includes(q) ||
    job.company.toLowerCase().includes(q) ||
    job.location.toLowerCase().includes(q) ||
    job.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    job.description.toLowerCase().includes(q),
  );
}

async function fetchRemoteOkJobs(query?: string): Promise<JobListing[]> {
  const res = await fetch("https://remoteok.com/api", {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "Asset-Manager Job Aggregator" },
  });
  if (!res.ok) throw new Error(`Remote OK ${res.status}`);

  const data = (await res.json()) as any[];
  const jobs = (data || [])
    .slice(1)
    .filter((job) => job && job.id)
    .map(normalizeRemoteOkJob)
    .filter((job: JobListing) => Boolean(job.applyUrl))
    .filter(isIndiaRelevantJob);

  if (!query) return jobs.slice(0, DEFAULT_SOURCE_LIMIT);

  const q = query.toLowerCase();
  return jobs.filter((job) =>
    job.title.toLowerCase().includes(q) ||
    job.company.toLowerCase().includes(q) ||
    job.location.toLowerCase().includes(q) ||
    job.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    job.description.toLowerCase().includes(q),
  );
}

async function fetchIndiaPlatformJobs(query?: string): Promise<JobListing[]> {
  return filterJobsByQuery(
    INDIA_PLATFORM_JOBS.map((job) => ({ ...job, isVerifiedLive: false, listingKind: "structured" as const })),
    query,
  );
}

async function fetchGreenhouseBoardJobs(query?: string): Promise<JobListing[]> {
  const results = await Promise.allSettled(
    GREENHOUSE_BOARDS.map(async (config) => {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${config.boardToken}/jobs?content=true`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Greenhouse ${config.boardToken} ${res.status}`);
      const data = (await res.json()) as { jobs?: any[] };
      return (data.jobs || [])
        .map((job) => normalizeGreenhouseJob(job, config))
        .filter((job) => Boolean(job.applyUrl))
        .filter(isIndiaRelevantJob);
    }),
  );

  const jobs = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  return filterJobsByQuery(jobs, query);
}

async function fetchAdzunaJobs(query?: string): Promise<JobListing[]> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];

  const url = new URL("https://api.adzuna.com/v1/api/jobs/in/search/1");
  url.searchParams.set("app_id", ADZUNA_APP_ID);
  url.searchParams.set("app_key", ADZUNA_APP_KEY);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("where", "India");
  if (query) url.searchParams.set("what", query);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Adzuna ${res.status}`);

  const data = (await res.json()) as { results?: AdzunaJobResult[] };
  return (data.results || [])
    .map(normalizeAdzunaJob)
    .filter((job) => Boolean(job.applyUrl))
    .filter(isIndiaRelevantJob);
}

function deduplicateJobs(jobs: JobListing[]) {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    const key = `${job.title.toLowerCase().trim()}::${job.company.toLowerCase().trim()}::${job.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function interleaveBySource(jobs: JobListing[]) {
  const sourceBuckets = new Map<string, JobListing[]>();

  for (const job of jobs) {
    const existing = sourceBuckets.get(job.source) || [];
    existing.push(job);
    sourceBuckets.set(job.source, existing);
  }

  const orderedSources = [...sourceBuckets.keys()].sort((a, b) => {
    const aTop = sourceBuckets.get(a)?.[0];
    const bTop = sourceBuckets.get(b)?.[0];
    return new Date(bTop?.postedAt || 0).getTime() - new Date(aTop?.postedAt || 0).getTime();
  });

  const mixed: JobListing[] = [];
  let remaining = true;

  while (remaining) {
    remaining = false;
    for (const source of orderedSources) {
      const bucket = sourceBuckets.get(source);
      if (bucket && bucket.length > 0) {
        mixed.push(bucket.shift()!);
        remaining = true;
      }
    }
  }

  return mixed;
}

function takeDiverseStructuredJobs(jobs: JobListing[], perSource = 1, maxTotal = 12) {
  const counts = new Map<string, number>();
  const selected: JobListing[] = [];

  for (const job of jobs) {
    const current = counts.get(job.source) || 0;
    if (current >= perSource) continue;
    selected.push(job);
    counts.set(job.source, current + 1);
    if (selected.length >= maxTotal) break;
  }

  return selected;
}

export async function getLiveJobs(
  query?: string,
  options: { forceRefresh?: boolean } = {},
): Promise<{ jobs: JobListing[]; sources: string[] }> {
  const cacheKey = query?.trim().toLowerCase() || "__default__";
  const cached = liveJobsCache.get(cacheKey);

  if (!options.forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      jobs: cached.jobs,
      sources: [...new Set(cached.jobs.map((job) => job.source))],
    };
  }

  const [greenhouseResult, adzunaResult, remotiveResult, arbeitnowResult, himalayasResult, remoteOkResult, indiaStructuredResult] =
    await Promise.allSettled([
      fetchGreenhouseBoardJobs(query),
      fetchAdzunaJobs(query),
      fetchRemotiveJobs(query),
      fetchArbeitnowJobs(query),
      fetchHimalayasJobs(query),
      fetchRemoteOkJobs(query),
      fetchIndiaPlatformJobs(query),
    ]);

  const verifiedLiveJobs = [greenhouseResult, adzunaResult, remotiveResult, arbeitnowResult, himalayasResult, remoteOkResult]
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const structuredJobs = indiaStructuredResult.status === "fulfilled" ? indiaStructuredResult.value : [];
  const freshVerifiedJobs = verifiedLiveJobs
    .filter((job) => job.isVerifiedLive)
    .filter(hasUsableApplyUrl)
    .filter(isFreshJob);

  const preferredJobs = freshVerifiedJobs.length > 0
    ? freshVerifiedJobs
    : structuredJobs.filter(hasUsableApplyUrl).slice(0, 25);

  const deduped = deduplicateJobs(preferredJobs).sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
  );
  liveJobsCache.set(cacheKey, { jobs: deduped, fetchedAt: Date.now() });

  return { jobs: deduped, sources: [...new Set(deduped.map((job) => job.source))] };
}

export async function getAvailableSources(options: { forceRefresh?: boolean } = {}) {
  const { jobs } = await getLiveJobs(undefined, options);
  return [...new Set(jobs.map((job) => job.source))]
    .sort((a, b) => a.localeCompare(b));
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "we", "our", "you", "your", "they", "their",
  "it", "this", "that", "these", "those", "experience", "knowledge", "ability", "skills",
  "strong", "work", "team", "build", "help", "create", "use", "using", "years",
  "who", "what", "when", "where", "why", "how", "not", "just", "because", "as", "until",
  "while", "prefer", "must", "one", "two", "three", "five", "across", "within", "ensure",
]);

export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\+#\.]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const freq: Record<string, number> = {};
  for (const word of words) freq[word] = (freq[word] || 0) + 1;

  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 40)
    .map(([word]) => word);
}

export function calculateATSScore(resume: string, jobDescription: string) {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeText = resume.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of jobKeywords) {
    (resumeText.includes(keyword) ? matched : missing).push(keyword);
  }

  const score = jobKeywords.length > 0 ? Math.round((matched.length / jobKeywords.length) * 100) : 0;
  return { score, matched, missing };
}

export async function getAllJobs(
  filter: {
    q?: string;
    category?: string;
    location?: string;
    type?: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    isRemote?: boolean;
    source?: string;
    sort?: string;
    page?: number;
    limit?: number;
    forceRefresh?: boolean;
  } = {},
) {
  const { jobs: allJobs, sources } = await getLiveJobs(filter.q, { forceRefresh: filter.forceRefresh });
  let jobs = [...allJobs];

  if (filter.q) {
    const q = filter.q.toLowerCase();
    jobs = jobs.filter((job) =>
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q) ||
      job.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      job.category.toLowerCase().includes(q),
    );
  }

  if (filter.category && filter.category !== "All") jobs = jobs.filter((job) => job.category === filter.category);
  if (filter.location) {
    const location = filter.location.toLowerCase();
    jobs = jobs.filter((job) => job.location.toLowerCase().includes(location));
  }
  if (filter.type && filter.type !== "All") jobs = jobs.filter((job) => job.type === filter.type);
  if (filter.experienceLevel && filter.experienceLevel !== "All") {
    jobs = jobs.filter((job) => (job.experienceLevel || "Mid") === filter.experienceLevel);
  }
  if (typeof filter.salaryMin === "number" && !Number.isNaN(filter.salaryMin)) {
    jobs = jobs.filter((job) => (job.salaryMax || 0) >= filter.salaryMin!);
  }
  if (typeof filter.salaryMax === "number" && !Number.isNaN(filter.salaryMax)) {
    jobs = jobs.filter((job) => (job.salaryMin || Number.MAX_SAFE_INTEGER) <= filter.salaryMax!);
  }
  if (filter.isRemote === true) jobs = jobs.filter((job) => job.isRemote);
  if (filter.source) jobs = jobs.filter((job) => job.source === filter.source);

  if (filter.sort === "salary") {
    jobs.sort(
      (a, b) => (parseInt(b.salary.replace(/[^0-9]/g, ""), 10) || 0) - (parseInt(a.salary.replace(/[^0-9]/g, ""), 10) || 0),
    );
  } else if (filter.sort === "match") {
    jobs.sort((a, b) => (b.atsScore || 0) - (a.atsScore || 0));
  } else {
    jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    jobs = interleaveBySource(jobs);
  }

  const page = filter.page || 1;
  const limit = Math.min(filter.limit || 100, filter.q ? 200 : 100);
  const total = jobs.length;

  return {
    jobs: jobs.slice((page - 1) * limit, page * limit),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    sources,
  };
}

export async function getJobById(id: string, options: { forceRefresh?: boolean } = {}): Promise<JobListing | null> {
  const { jobs } = await getLiveJobs(undefined, options);
  return jobs.find((job) => job.id === id) || null;
}

export async function getRecommendations(resume: string, limit = 6): Promise<JobListing[]> {
  const { jobs } = await getLiveJobs();
  if (!resume) return jobs.slice(0, limit);

  return [...jobs]
    .sort((a, b) => {
      const scoreA = calculateATSScore(resume, `${a.description} ${a.tags.join(" ")}`).score;
      const scoreB = calculateATSScore(resume, `${b.description} ${b.tags.join(" ")}`).score;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}
