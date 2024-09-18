const axios = require('axios');
import dotenv from 'dotenv';

dotenv.config();

export const completionsFront = async(templateData: any, information: string) => {
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.OPENAI_API_KEY; // Ensure your API key is set in environment variables

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  // Define the body of the request, ensuring the content for system and user is stringified
  const data = {
    model: 'gpt-4', // Using GPT-4 model
    messages: [
      {
        role: 'system',
        content: JSON.stringify(`Instruction:
          Based on the following information, select the most suitable template from the options: ${templateData.map((item: { title: any; }) => item.title).join()}. Then, respond with the structure of the selected template dataset and the content to display in each field in JSON format.

          Requirements:

          Select the Best Template:
          - Use the input data to select the most appropriate template from the provided options (${templateData.map((item: { title: any; }) => item.title).join()}).
          - Consider the mood and tone ("energetic") to make the best match.

          Explain Template Selection:
          - Provide a brief explanation for selecting the template, considering the input data and mood.

          Respond with the Template Dataset and Content:
          - Return the structure of the dataset for the selected template.
          - Provide the actual content that should be displayed in each field (text/image).
            - For fields with type: "text", respond with the text value.
            - For fields with type: "image", do not include the field in the response.

          Templates:

          ${JSON.stringify(templateData, null, 2)}  
            
          Example Response:

          Best Template: Generated Response

          Explain Template Selection: Generated Response

          Template Dataset and Content:

          {
            "dataset": {
              "description": {
                "type": "text",
                "text": "Generated Response"
              }
            }
          }`)
      },
      {
        role: 'user',
        content: JSON.stringify(information)
      }
    ]
  };

  try {
    // Send the request to the OpenAI API
    const response = await axios.post(apiUrl, data, { headers });
    return response.data;
  } catch(error: any) {
    console.error('Error creating chat completion:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const completionsBack = async(templateData: any, information: string, numberOfDesign: number) => {
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.OPENAI_API_KEY; // Ensure your API key is set in environment variables

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  // Define the body of the request, ensuring the content for system and user is stringified
  const data = {
    model: 'gpt-4', // Using GPT-4 model
    messages: [
      {
        role: 'system',
        content: JSON.stringify(`Instruction:
          Based on the provided dataset structure, generate content for at least ${numberOfDesign} items. Each item should include content for its fields according to the field type in the dataset. Respond in JSON format.

          Requirements:

          Generate Content Based on the Dataset:
          - Use the dataset structure to create content for at least 3 items.
          - For fields with type: "text", generate appropriate text content.
          - For fields with type: "image", do not include the field in the response.

          Templates Dataset:

          ${JSON.stringify(templateData, null, 2)}

          Respond with the Dataset and Content for at least ${numberOfDesign} items in the following format:

          Example Response:

          [
            {
              "dataset": {
                "title": {
                  "type": "text",
                  "text": "Generated Title for Item 1"
                },
                "description": {
                  "type": "text",
                  "text": "This is an automatically generated description for Item 1 based on the dataset structure."
                }
              }
            }
          ]`)
      },
      {
        role: 'user',
        content: JSON.stringify(information)
      }
    ]
  };

  try {
    // Send the request to the OpenAI API
    const response = await axios.post(apiUrl, data, { headers });
    return response.data;
  } catch(error: any) {
    console.error('Error creating chat completion:', error.response ? error.response.data : error.message);
    throw error;
  }
};


