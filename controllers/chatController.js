import OpenAI from 'openai';
import Conversation from '../models/Conversation.js';
import dotenv from 'dotenv';

dotenv.config();

// Configurar OpenAI con manejo de errores mejorado
let openai;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno OPENAI_API_KEY no está definida')
  }

  openai = new OpenAI({ apiKey });
  console.log('✅ OpenAI configurado correctamente');
} catch (error) {
  console.error('Error al inicializar OpenAI:', error);
}

// Generar respuesta de ChatGPT
export const generateChatResponse = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido' });
    }

    if (!openai) {
      return res.status(500).json({ 
        error: 'No se ha configurado correctamente la API de OpenAI',
        message: 'Error interno del servidor al configurar OpenAI'
      });
    }

    // Llamada a la API de OpenAI con modelo gpt-4o para respuestas más avanzadas
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Eres un asistente amigable y útil. Tus respuestas deben ser concisas (máximo 100 palabras), claras e incluir emojis relevantes. Usa párrafos cortos para mejor legibilidad." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 300, // Limitar tokens para respuestas más cortas
      temperature: 0.7, // Mantener algo de creatividad
    });

    const response = completion.choices[0].message.content;

    // Guardar la conversación en la base de datos
    const conversation = new Conversation({
      prompt,
      response,
    });

    await conversation.save();

    res.json({ response });
  } catch (error) {
    console.error('Error al generar la respuesta:', error);
    res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      details: error.message 
    });
  }
};

// Generar preguntas de trivia
export const generateTriviaQuestions = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'El tema es requerido' });
    }

    if (!openai) {
      return res.status(500).json({
        error: 'No se ha configurado correctamente la API de OpenAI',
        message: 'Error interno del servidor al configurar OpenAI',
      });
    }

    // Llamada a la API de OpenAI para generar preguntas de trivia
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un generador de preguntas de trivia. Crea 5 preguntas sobre el tema proporcionado. 
          Cada pregunta debe tener 4 opciones de respuesta, donde solo una es correcta. 
          
          IMPORTANTE: Devuelve ÚNICAMENTE un JSON válido con el siguiente formato exacto, sin texto adicional antes o después:
          
          {
            "questions": [
              {
                "question": "¿Pregunta 1?",
                "options": [
                  {"text": "Opción 1", "isCorrect": false},
                  {"text": "Opción 2", "isCorrect": true},
                  {"text": "Opción 3", "isCorrect": false},
                  {"text": "Opción 4", "isCorrect": false}
                ]
              },
              ...más preguntas con el mismo formato
            ]
          }`,
        },
        { role: 'user', content: `Crea 5 preguntas de trivia sobre el tema: ${topic}` },
      ],
      response_format: { type: "json_object" }, // Esto le indica a la API que queremos JSON
      max_tokens: 1000, // Aumentado para asegurar respuestas completas
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content;
    
    // Intentar analizar el JSON
    let questions;
    try {
      const parsedResponse = JSON.parse(responseContent);
      
      // Verificar que la estructura sea la esperada
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error('Formato de respuesta incorrecto');
      }
      
      questions = parsedResponse.questions;
    } catch (parseError) {
      console.error('Error al analizar la respuesta JSON:', parseError);
      console.log('Respuesta recibida:', responseContent);
      
      // Generar preguntas de respaldo para no fallar
      questions = [
        {
          question: `¿Pregunta de ejemplo sobre ${topic}?`,
          options: [
            { text: "Opción 1", isCorrect: false },
            { text: "Opción 2", isCorrect: true },
            { text: "Opción 3", isCorrect: false },
            { text: "Opción 4", isCorrect: false }
          ]
        }
      ];
    }

    res.json({ questions });
  } catch (error) {
    console.error('Error al generar preguntas de trivia:', error);
    res.status(500).json({
      error: 'Error al procesar la solicitud',
      details: error.message,
    });
  }
};

// Obtener historial de conversaciones
export const getConversationHistory = async (req, res) => {
  try {
    const conversations = await Conversation.find().sort({ createdAt: -1 }).limit(10);
    res.json(conversations);
  } catch (error) {
    console.error('Error al obtener el historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial de conversaciones' });
  }
};