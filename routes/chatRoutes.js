import express from 'express';
import { generateTriviaQuestions } from '../controllers/chatController.js';

const router = express.Router();

// Ruta para generar preguntas de trivia
router.post('/trivia', generateTriviaQuestions);

export { router };
