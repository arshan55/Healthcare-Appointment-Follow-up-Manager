import { config } from "../config";
import { parsePostVisit, parsePreVisit, PostVisitParsed, PreVisitParsed } from "../utils/llmParse";
import { withBackoff } from "../utils/retry";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface LLMService {
  generatePreVisit(symptoms: string): Promise<PreVisitParsed>;
  generatePostVisit(notes: string): Promise<PostVisitParsed>;
}

const PRE_PROMPT = (symptoms: string) =>
  `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}

Return ONLY valid JSON:
{"urgency":"Low|Medium|High","chief_complaint":"string","suggested_questions":["q1","q2","q3"]}`;

const POST_PROMPT = (notes: string) =>
  `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}

Return ONLY valid JSON:
{"summary":"string","medication_schedule":[{"medication":"name","dosage":"amount","frequency":"timing","duration":"days"}],"follow_up_steps":["step"]}`;

export class GeminiService implements LLMService {
  private client: GoogleGenerativeAI | null = null;
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

  private ensureClient() {
    if (!this.client) {
      this.client = new GoogleGenerativeAI(config.llmApiKey);
    }
    if (!this.model) {
      this.model = this.client.getGenerativeModel({ model: config.llmModel });
    }
    return this.model;
  }

  async generatePreVisit(symptoms: string): Promise<PreVisitParsed> {
    const content = await this.complete(PRE_PROMPT(symptoms));
    return parsePreVisit(content);
  }

  async generatePostVisit(notes: string): Promise<PostVisitParsed> {
    const content = await this.complete(POST_PROMPT(notes));
    return parsePostVisit(content);
  }

  private async complete(prompt: string): Promise<string> {
    // LLM failure handling: exponential backoff, then the caller records FAILED (booking is not rolled back).
    return withBackoff(async () => {
      const model = this.ensureClient();
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (!text) throw new Error("No content in LLM response");
      return text.trim();
    });
  }
}

export class MockLLMService implements LLMService {
  async generatePreVisit(symptoms: string): Promise<PreVisitParsed> {
    return {
      urgency: "Medium",
      chief_complaint: symptoms.split("\n")[0]?.slice(0, 120) || "General consultation",
      suggested_questions: [
        "When did the symptoms start?",
        "Have you experienced this before?",
        "Are you taking any medications?",
      ],
    };
  }

  async generatePostVisit(notes: string): Promise<PostVisitParsed> {
    return {
      summary: notes.slice(0, 400) || "Please follow the treatment plan discussed during your visit.",
      medication_schedule: [
        { medication: "As prescribed", dosage: "see notes", frequency: "twice daily for 5 days", duration: "5" },
      ],
      follow_up_steps: ["Rest and hydrate", "Return if symptoms worsen", "Follow the medication schedule"],
    };
  }
}

export function getLLMService(): LLMService {
  if (config.nodeEnv === "test" || !config.llmApiKey) {
    return new MockLLMService();
  }
  return new GeminiService();
}

export default getLLMService();
