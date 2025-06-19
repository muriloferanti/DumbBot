const axios = require('axios');
require('dotenv').config();

async function askChatGPT(message) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: message }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('❌ Erro na OpenAI:', error.response?.data || error.message);
        return 'Erro ao acessar o ChatGPT.';
    }
}

module.exports = { askChatGPT };
