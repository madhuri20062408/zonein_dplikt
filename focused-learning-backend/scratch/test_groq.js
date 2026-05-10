const axios = require('axios');
require('dotenv').config({ path: './.env' });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function testGroq() {
    try {
        console.log("Testing Groq with key:", GROQ_API_KEY.substring(0, 10) + "...");
        const prompt = "Create a 3-topic learning roadmap for 'React'. Return JSON: { \"goal\": \"React\", \"topics\": [{ \"title\": \"T1\", \"order\": 1, \"description\": \"D1\" }] }";
        
        const response = await axios.post(GROQ_URL, {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" }
        }, {
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        console.log("Response:", response.data.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

testGroq();
