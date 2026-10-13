/**
 * Chatbot & AI Concierge Routes
 * POST /api/chat — Process visitor messages and return context-aware responses
 */
const express = require('express');
const router = express.Router();

const { db } = require('../config/database');
const { stringField } = require('../utils/validation');
const rateLimit = require('../middleware/rateLimit');

// Knowledge Base for Logic Tech AI Assistant
const KNOWLEDGE_RESPONSES = [
  {
    keywords: ['service', 'offer', 'capability', 'what do you do', 'specialties', 'practices'],
    reply: `**Logic Tech** specializes in four core enterprise technology pillars:\n\n1. ☁️ **Cloud Architecture & DevOps**: Multi-cloud resilience, AWS/Azure/GCP, Kubernetes, Terraform automation, and 99.99% uptime.\n2. 🤖 **AI & Machine Learning**: Custom LLMs, retrieval-augmented generation (RAG), predictive intelligence, and workflow automation.\n3. 💻 **Custom Software Engineering**: Distributed microservices, enterprise web applications, APIs, and real-time transaction processing.\n4. 🛡️ **Cybersecurity & Compliance**: Zero-trust architecture, SOC 2 / ISO 27001 readiness, automated vulnerability scanning, and IAM hardening.\n\nExplore our full suite on our [Services Page](services.html) or request a tailored scope on [Contact](contact.html).`
  },
  {
    keywords: ['price', 'cost', 'budget', 'rate', 'quote', 'how much', 'fee', 'pricing'],
    reply: `Our pricing is structured around project complexity and engagement model:\n\n- 🎯 **Fixed-Scope Milestones**: Ideal for defined MVPs, architecture audits, and discrete deliverables with guaranteed timelines.\n- 🚀 **Dedicated Engineering Pods**: Full-stack cross-functional teams (Architect, DevOps, Senior Engineers) on monthly sprint retainer.\n- 👔 **Executive Advisory & Consulting**: Fractional CTO and Chief Architect advisory sessions.\n\nTypical enterprise engagements range from **KES 2,000,000 to KES 15,000,000+** depending on scale and infrastructure requirements. Would you like to [request a customized proposal](contact.html)?`
  },
  {
    keywords: ['timeline', 'how long', 'duration', 'weeks', 'delivery', 'start'],
    reply: `Our standard delivery timelines follow our 6-Phase Engineering Lifecycle:\n\n- 🔍 **Architecture Audit & Discovery**: 1 – 2 weeks\n- 🏗️ **Core MVP / Foundation**: 4 – 8 weeks\n- 🚀 **Enterprise Full-Scale Deployment**: 8 – 16 weeks\n\nEvery project includes daily async updates, bi-weekly demo sprints, and a guaranteed 60-day post-launch warranty. Check out [How It Works](how-it-works.html) for detailed phase breakdowns!`
  },
  {
    keywords: ['brian', 'kimani', 'founder', 'leader', 'ceo', 'architect', 'managing partner'],
    reply: `**Dr. Brian Kimani** is the **Managing Partner & Chief Architect** at Logic Tech. With over 14+ years designing high-throughput distributed systems, banking rails, and sovereign cloud infrastructure, he oversees technical direction and advisory across all practice areas. Read more on our [About Us](about.html) page.`
  },
  {
    keywords: ['nda', 'confidential', 'security', 'privacy', 'ip', 'intellectual property'],
    reply: `🔒 **Confidentiality & IP Protection:**\n\nWe sign mutual Non-Disclosure Agreements (NDAs) prior to architectural reviews. 100% of intellectual property, code repositories, cloud configurations, and data models transfer unconditionally to you upon milestone completion.`
  },
  {
    keywords: ['contact', 'email', 'phone', 'location', 'nairobi', 'consult', 'talk', 'call', 'meeting'],
    reply: `We would love to connect with your team!\n\n- 📍 **Headquarters:** Logic Tech Towers, Nairobi, Kenya\n- ✉️ **Email:** [contact@logictech.co.ke](mailto:contact@logictech.co.ke)\n- 📱 **Phone:** +254 700 000 000\n- 📝 **Inquiry Form:** [Submit Project Request](contact.html)\n\nYou can also leave your name and email here and our solutions team will follow up within 24 hours.`
  },
  {
    keywords: ['case study', 'portfolio', 'example', 'client', 'project', 'past work'],
    reply: `We have engineered high-impact solutions for fintechs, health systems, and retail enterprises:\n\n- 🏦 **FinCore Kenya**: Scaled transaction throughput by 400% with sub-40ms latency.\n- 🏥 **AfyaLink Health**: HIPAA-compliant telemedicine platform serving 150k+ patients.\n- 📦 **RetailMax ERP**: Automated supply chain inventory saving 120 hrs/week.\n\nView full metrics and architectures on our [Case Studies](case-studies.html) page!`
  }
];

// Fallback response
const DEFAULT_RESPONSE = `Thank you for reaching out to **Logic Tech**! I can assist you with:\n\n- ☁️ [Enterprise Cloud & DevOps Solutions](services.html)\n- 🤖 [AI & Machine Learning Integrations](services.html)\n- 💼 [Case Studies & Architecture Portfolios](case-studies.html)\n- ⏱️ [Delivery Timelines & Methodology](how-it-works.html)\n- 📞 [Scheduling an Engineering Consultation](contact.html)\n\nFeel free to ask a specific question, or let us know what technical challenge you are looking to solve!`;

router.post(
  '/',
  rateLimit('chatbot', 30, 60 * 1000), // 30 messages/minute
  (req, res, next) => {
    try {
      const message = stringField(req.body.message, 'Message', 1000).toLowerCase();

      // Find best match in knowledge base
      let matched = null;
      let highestScore = 0;

      for (const item of KNOWLEDGE_RESPONSES) {
        let score = 0;
        for (const kw of item.keywords) {
          if (message.includes(kw)) {
            score += kw.length; // longer keyword match gives higher weight
          }
        }
        if (score > highestScore) {
          highestScore = score;
          matched = item;
        }
      }

      const reply = highestScore > 0 && matched ? matched.reply : DEFAULT_RESPONSE;

      res.json({
        reply,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
