export interface ResumeContact {
  name: string
  title: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
}

export interface ExperienceEntry {
  id: string
  company: string
  role: string
  dates: string
  bullets: string[]
}

export interface EducationEntry {
  id: string
  institution: string
  degree: string
  dates: string
  details: string
}

export interface ResumeData {
  contact: ResumeContact
  summary: string
  experience: ExperienceEntry[]
  skills: string[]
  education: EducationEntry[]
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface HighlightedField {
  path: string
  type: "changed" | "added" | "removed"
}

export function createEmptyResume(): ResumeData {
  return {
    contact: {
      name: "",
      title: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
    },
    summary: "",
    experience: [],
    skills: [],
    education: [],
  }
}

export function createSampleResume(): ResumeData {
  return {
    contact: {
      name: "Alex Chen",
      title: "Senior Software Engineer",
      email: "alex.chen@email.com",
      phone: "(555) 123-4567",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/alexchen",
      github: "github.com/alexchen",
    },
    summary:
      "Software engineer with 6+ years of experience building scalable distributed systems and cloud-native applications. Proven track record designing high-throughput microservices handling 10M+ daily requests. Deep expertise in Kubernetes orchestration and CI/CD pipeline optimization.",
    experience: [
      {
        id: "exp-1",
        company: "Acme Corp",
        role: "Senior Software Engineer",
        dates: "2022 - Present",
        bullets: [
          "Architected event-driven microservices processing 10M+ events/day using Kafka and Redis Streams, reducing end-to-end latency by 40%",
          "Led migration from monolith to Kubernetes-based architecture, improving deployment frequency from bi-weekly to multiple daily releases",
          "Designed distributed caching layer with Redis Cluster, achieving 99.95% cache hit rate and reducing database load by 60%",
          "Mentored team of 4 junior engineers through structured code reviews and weekly architecture sessions",
        ],
      },
      {
        id: "exp-2",
        company: "StartupXYZ",
        role: "Software Engineer",
        dates: "2019 - 2022",
        bullets: [
          "Built real-time data pipeline processing 2TB+ daily using Apache Flink and AWS Kinesis for analytics platform serving 500K users",
          "Implemented automated canary deployment pipeline reducing rollback incidents by 75% across 12 production services",
          "Developed internal CLI tooling in Go adopted by 30+ engineers, reducing average onboarding time by 40%",
        ],
      },
      {
        id: "exp-3",
        company: "TechBase",
        role: "Software Engineer",
        dates: "2018 - 2019",
        bullets: [
          "Developed RESTful APIs in Node.js serving 1M+ requests/day with 99.9% uptime",
          "Integrated monitoring stack with Datadog, reducing MTTR from 45min to 12min",
        ],
      },
    ],
    skills: [
      "Go",
      "TypeScript",
      "Python",
      "Rust",
      "Kubernetes",
      "Docker",
      "Terraform",
      "AWS",
      "PostgreSQL",
      "Redis",
      "Kafka",
      "Apache Flink",
      "CI/CD",
      "System Design",
    ],
    education: [
      {
        id: "edu-1",
        institution: "MIT",
        degree: "B.S. Computer Science",
        dates: "2014 - 2018",
        details: "Dean's List, Teaching Assistant for Distributed Systems",
      },
    ],
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
