const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `
You are a security expert. Analyze the provided code snippets and dependency files for potential security vulnerabilities and outdated packages. 
Provide a detailed report of your findings, including the vulnerability type, severity, and recommended remediation.
For dependency files, list any outdated packages with their current version and the recommended latest version.
`;

app.post('/scan', async (req, res) => {
    const { code, dependencies } = req.body;

    if (!code && !dependencies) {
        return res.status(400).json({ error: 'Please provide code or dependencies to scan.' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemInstruction }],
                },
                {
                    role: "model",
                    parts: [{ text: "I am ready to analyze your code and dependencies." }],
                },
            ],
            generationConfig: {
                maxOutputTokens: 4096,
            },
        });

        let prompt = '';
        if (code) {
            prompt += `Analyze the following code for security vulnerabilities:\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
        }
        if (dependencies) {
            prompt += `Analyze the following dependencies for outdated packages:\n\n\`\`\`\n${JSON.stringify(dependencies, null, 2)}\n\`\`\``;
        }

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ analysis: text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while analyzing the code.' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
