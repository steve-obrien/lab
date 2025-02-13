const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeEmail(subject, body) {
	const prompt = `
    You are an AI assistant for an email client. Given an email, provide:
    1. A short summary (max 2 sentences).
    2. Relevant tags (comma-separated, e.g., "Meeting, Urgent, Invoice, Personal").

    Email Subject: "${subject}"
    Email Body: "${body}"
    `;

	try {
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: prompt }
			],
			temperature: 0.7,
			response_format: {
				type: "json_schema",
				json_schema: {
					"name": "email_summary_tags",
					"schema": {
						type: "object",
						properties: {
							summary: { type: "string" },
							tags: { type: "array", items: { type: "string" } }
						},
						required: ["summary", "tags"]
					}
				},
			}
		});

		const result = JSON.parse(response.choices[0].message.content);
		const summary = result.summary
		const tags = result.tags
		return { summary, tags };
	} catch (error) {
		console.error("AI Error:", error.message);
		return { summary: "", tags: [] };
	}
}

module.exports = analyzeEmail;
