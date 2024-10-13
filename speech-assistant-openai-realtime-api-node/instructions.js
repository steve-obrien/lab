import fs from 'fs';

export default function registerInstructionsRoutes(fastify) {
	fastify.all('/instructions/:filename?', async (request, reply) => {
		const { filename } = request.params;

		if (filename) {
			const filePath = `./instructions/${filename}`;

			if (!fs.existsSync(filePath)) {
				return reply.status(404).send({ error: 'File not found' });
			}

			try {
				const instructions = fs.readFileSync(filePath, 'utf-8');
				reply.send({ name: filename, instructions });
			} catch (error) {
				console.error('Error reading instructions:', error);
				reply.status(500).send({ error: 'Failed to read instructions' });
			}
		} else {
			try {
				const instructionFiles = fs.readdirSync('./instructions').filter(file => file.endsWith('.md'));
				const instructions = instructionFiles.map(file => ({ name: file }));
				reply.send(instructions);
			} catch (error) {
				console.error('Error reading instruction files:', error);
				reply.status(500).send({ error: 'Failed to read instruction files' });
			}
		}
	});

	// Endpoint to save instructions to a file
	fastify.post('/save-instructions', async (request, reply) => {
		const { fileName, instructions } = request.body;

		if (!fileName || !instructions) {
			return reply.status(400).send({ error: 'File name and instructions are required' });
		}

		try {
			const filePath = `./instructions/${fileName}.md`;
			fs.writeFileSync(filePath, instructions, 'utf-8');
			reply.send({ message: 'Instructions saved successfully' });
		} catch (error) {
			console.error('Error saving instructions:', error);
			reply.status(500).send({ error: 'Failed to save instructions' });
		}
	});
}