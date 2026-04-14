export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  tags: string[];
  requirements?: string[];
  benefits?: string[];
  isRemote: boolean;
  type: string;
  experienceLevel?: string;
  category: string;
  atsScore: number;
  postedAt: string;
  applyLink: string;
  source?: string;
  featured?: boolean;
  logoUrl?: string;
  isVerifiedLive?: boolean;
  listingKind?: "verified_live" | "structured";
}

export const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    salary: "$160K – $220K",
    description:
      "We're looking for a Senior Frontend Engineer to join our team and help build the next generation of payment experiences. You'll work closely with product and design to create beautiful, performant user interfaces that serve millions of users worldwide.",
    tags: ["React", "TypeScript", "GraphQL", "Node.js"],
    requirements: [
      "5+ years of React experience",
      "Strong TypeScript skills",
      "Experience with testing (Jest, Cypress)",
      "Knowledge of web performance optimization",
      "Experience with GraphQL or REST APIs",
    ],
    benefits: [
      "Competitive salary and equity",
      "Comprehensive health, dental, vision",
      "Flexible PTO and remote options",
      "Annual learning budget of $2,000",
    ],
    isRemote: false,
    type: "Full-time",
    category: "Engineering",
    atsScore: 88,
    postedAt: "2025-03-24T10:00:00Z",
    applyLink: "https://stripe.com/jobs",
    source: "LinkedIn",
    featured: true,
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "Linear",
    location: "Remote",
    salary: "$140K – $190K",
    description:
      "Linear is building the future of project management software. We're looking for a Full Stack Engineer who cares deeply about product quality and user experience.",
    tags: ["React", "Node.js", "PostgreSQL", "TypeScript"],
    requirements: [
      "3+ years full stack experience",
      "React and Node.js expertise",
      "PostgreSQL or similar database experience",
      "Strong product intuition",
    ],
    benefits: [
      "Fully remote team",
      "Competitive salary and equity",
      "Home office stipend",
      "Health, dental, and vision coverage",
    ],
    isRemote: true,
    type: "Full-time",
    category: "Engineering",
    atsScore: 75,
    postedAt: "2025-03-23T10:00:00Z",
    applyLink: "https://linear.app/jobs",
    featured: true,
  },
  {
    id: "3",
    title: "AI/ML Engineer",
    company: "Anthropic",
    location: "San Francisco, CA",
    salary: "$200K – $350K",
    description:
      "Anthropic is an AI safety company working to build reliable, interpretable, and steerable AI systems. We're looking for talented ML Engineers to push the frontiers of AI.",
    tags: ["Python", "PyTorch", "ML", "LLM", "NLP"],
    requirements: [
      "PhD or equivalent experience in ML",
      "Strong Python and PyTorch skills",
      "Experience with large-scale distributed training",
      "Publication record preferred",
    ],
    benefits: [
      "Top-tier compensation",
      "Mission-driven work",
      "World-class team",
      "Comprehensive benefits",
    ],
    isRemote: false,
    type: "Full-time",
    category: "Data",
    atsScore: 62,
    postedAt: "2025-03-22T10:00:00Z",
    applyLink: "https://anthropic.com/jobs",
    featured: false,
  },
  {
    id: "4",
    title: "Product Designer",
    company: "Figma",
    location: "New York, NY",
    salary: "$130K – $180K",
    description:
      "Figma is looking for a Product Designer to help shape the future of collaborative design tools. You'll work on complex design problems that impact millions of creators worldwide.",
    tags: ["Figma", "UX Research", "Prototyping", "Design Systems"],
    requirements: [
      "4+ years product design experience",
      "Strong portfolio demonstrating UX thinking",
      "Proficiency with Figma",
      "Experience with design systems",
    ],
    benefits: [
      "Flexible work arrangements",
      "Full benefits package",
      "Learning and development budget",
      "Generous equity",
    ],
    isRemote: true,
    type: "Full-time",
    category: "Design",
    atsScore: 81,
    postedAt: "2025-03-22T08:00:00Z",
    applyLink: "https://figma.com/jobs",
    featured: false,
  },
  {
    id: "5",
    title: "Backend Engineer",
    company: "Vercel",
    location: "Remote",
    salary: "$150K – $200K",
    description:
      "Vercel is the platform for frontend developers. We're looking for a Backend Engineer to help scale our infrastructure serving millions of deployments.",
    tags: ["Go", "Node.js", "AWS", "Kubernetes", "Redis"],
    requirements: [
      "4+ years backend engineering experience",
      "Strong Go or Node.js skills",
      "Experience with cloud platforms (AWS, GCP)",
      "Knowledge of distributed systems",
    ],
    benefits: [
      "Fully remote work",
      "Competitive equity",
      "Health benefits",
      "Annual retreats",
    ],
    isRemote: true,
    type: "Full-time",
    category: "Engineering",
    atsScore: 71,
    postedAt: "2025-03-21T10:00:00Z",
    applyLink: "https://vercel.com/careers",
    featured: false,
  },
  {
    id: "6",
    title: "iOS Engineer",
    company: "Notion",
    location: "San Francisco, CA",
    salary: "$145K – $200K",
    description:
      "Notion is building the connected workspace that enables teams to move faster. We're looking for an iOS Engineer passionate about creating delightful native experiences.",
    tags: ["Swift", "SwiftUI", "iOS", "Xcode"],
    requirements: [
      "3+ years iOS development",
      "Swift and Objective-C proficiency",
      "Experience with UIKit and SwiftUI",
      "Knowledge of Core Data",
    ],
    benefits: [
      "Hybrid work model",
      "Top-tier comp and equity",
      "Unlimited PTO",
      "Mental health support",
    ],
    isRemote: false,
    type: "Full-time",
    category: "Engineering",
    atsScore: 58,
    postedAt: "2025-03-20T10:00:00Z",
    applyLink: "https://notion.com/careers",
    featured: false,
  },
  {
    id: "7",
    title: "DevOps Engineer",
    company: "Cloudflare",
    location: "Austin, TX",
    salary: "$130K – $175K",
    description:
      "Cloudflare's mission is to help build a better Internet. We're looking for a DevOps Engineer to help maintain and improve our global network infrastructure.",
    tags: ["Kubernetes", "Docker", "Terraform", "Python", "AWS"],
    requirements: [
      "4+ years DevOps/SRE experience",
      "Strong Kubernetes and Docker knowledge",
      "Experience with Terraform or similar IaC",
      "Proficiency in Python or Bash scripting",
    ],
    benefits: [
      "Equity in a public company",
      "Comprehensive health coverage",
      "401(k) matching",
      "Remote-friendly culture",
    ],
    isRemote: false,
    type: "Full-time",
    category: "Engineering",
    atsScore: 66,
    postedAt: "2025-03-19T10:00:00Z",
    applyLink: "https://cloudflare.com/careers",
    featured: false,
  },
  {
    id: "8",
    title: "Data Scientist",
    company: "Spotify",
    location: "Remote",
    salary: "$140K – $185K",
    description:
      "Spotify uses data to shape the future of audio. We're looking for a Data Scientist to help us understand how hundreds of millions of users discover and listen to music.",
    tags: ["Python", "SQL", "ML", "Statistics", "Spark"],
    requirements: [
      "3+ years data science experience",
      "Python and SQL proficiency",
      "Experience with ML frameworks (scikit-learn, XGBoost)",
      "Strong statistical knowledge",
    ],
    benefits: [
      "Fully remote option",
      "Spotify Premium, of course",
      "Equity and bonus",
      "Learning budget",
    ],
    isRemote: true,
    type: "Full-time",
    category: "Data",
    atsScore: 84,
    postedAt: "2025-03-18T10:00:00Z",
    applyLink: "https://spotify.com/jobs",
    featured: false,
  },
  {
    id: "9",
    title: "Product Manager",
    company: "Intercom",
    location: "Dublin, Ireland",
    salary: "$120K – $160K",
    description:
      "Intercom is looking for a Product Manager to help shape customer communication tools used by thousands of businesses.",
    tags: ["Product Strategy", "Agile", "Analytics", "Roadmap"],
    requirements: [
      "4+ years product management experience",
      "Data-driven decision making",
      "Excellent communication skills",
      "Experience with B2B SaaS products",
    ],
    benefits: [
      "Flexible working",
      "Generous PTO",
      "Health & wellness benefits",
      "Career development support",
    ],
    isRemote: true,
    type: "Full-time",
    category: "Product",
    atsScore: 77,
    postedAt: "2025-03-17T10:00:00Z",
    applyLink: "https://intercom.com/careers",
    featured: false,
  },
  {
    id: "10",
    title: "Growth Marketing Manager",
    company: "HubSpot",
    location: "Boston, MA",
    salary: "$110K – $145K",
    description:
      "HubSpot is seeking a Growth Marketing Manager to drive user acquisition and retention through data-driven campaigns across multiple channels.",
    tags: ["SEO", "SEM", "Analytics", "Growth Hacking", "Content"],
    requirements: [
      "3+ years growth marketing experience",
      "Proven track record of measurable results",
      "Experience with marketing automation",
      "Strong analytical mindset",
    ],
    benefits: [
      "Remote-first culture",
      "Unlimited PTO",
      "Comprehensive benefits",
      "Employee stock purchase plan",
    ],
    isRemote: true,
    type: "Full-time",
    category: "Marketing",
    atsScore: 54,
    postedAt: "2025-03-16T10:00:00Z",
    applyLink: "https://hubspot.com/careers",
    featured: false,
  },
];

export function filterJobs(
  jobs: Job[],
  keyword: string,
  location: string,
  remoteOnly: boolean
): Job[] {
  return jobs.filter((job) => {
    const keywordMatch =
      !keyword ||
      job.title.toLowerCase().includes(keyword.toLowerCase()) ||
      job.company.toLowerCase().includes(keyword.toLowerCase()) ||
      job.tags.some((t) => t.toLowerCase().includes(keyword.toLowerCase()));

    const locationMatch =
      !location ||
      job.location.toLowerCase().includes(location.toLowerCase()) ||
      (remoteOnly && job.isRemote);

    const remoteMatch = !remoteOnly || job.isRemote;

    return keywordMatch && (locationMatch || !location) && remoteMatch;
  });
}
