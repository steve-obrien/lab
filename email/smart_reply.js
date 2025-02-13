const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateSmartReply(subject, body, sender) {
	const prompt = `
    You are an AI assistant trained for Newicon. Draft a professional and concise email reply.
    - If the email is a question, provide a helpful response.
    - If the email is about a meeting, suggest scheduling options.
    - If it's a request, provide an appropriate response.
    - If you are highly confident in the response, label it as "Confident Reply".
    - If the email requires Steve's manual attention, label it as "Needs Attention".

    Email Subject: "${subject}"
    Sender: "${sender}"
    Email Body: "${body}"

    Format your response:
    ---
    AI Draft: <response>
    Label: <Confident Reply / Needs Attention>
    `;

	try {


		// Step 1: Create a new thread
		const thread = await openai.beta.threads.create();

		// Step 2: Send a message to the thread
		await openai.beta.threads.messages.create(thread.id, {
			role: "user",
			content: `Subject: "${subject}"\nSender: "${sender}"\nBody: "${body}"`,
		});

		// Step 3: Run the assistant on the thread
		const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
			assistant_id: "asst_MsvwpPqwgOzoqKfci7M1IPSs", // Replace with your actual assistant ID
			tools: [{ type: "code_interpreter" }], // Ensure the assistant has structured response capabilities
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "email_analyse",
					schema: {
						type: "object",
						properties: {
							aiAction: { 
								type: "string",
								description: "The action to take based on the email. If promotional. ignore, reply, archive, label as spam, etc."
							},
							aiNotes: { 
								type: "string",
								description: "Any AI comments"
							},
							aiDraft: { 
								type: "string",
								description: "A draft email response to the message"
							},
							aiLabel: { 
								type: "string" 
							}
						},
						required: ["aiDraft", "aiLabel"]
					}
				},
			}

		});

		// Step 4: Retrieve messages from the thread
		const messages = await openai.beta.threads.messages.list(thread.id);

		// Step 5: Extract the AI response in JSON format
		const aiMessage = messages.data.find((msg) => msg.role === "assistant");

		console.dir(aiMessage, { depth: null, colors: true });
		

		// Step 6: Parse the structured response
		const aiJson = JSON.parse(aiMessage.content[0].text.value);

		console.dir(aiJson, { depth: null, colors: true });

		return aiJson;

	} catch (error) {
		console.error("AI Error:", error.message);
		return { aiDraft: "", aiLabel: "Needs Attention" };
	}
}

module.exports = generateSmartReply;
