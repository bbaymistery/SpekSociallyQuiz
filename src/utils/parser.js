import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import JSZip from 'jszip';

// Setup PDF.js worker (pdfjs-dist 4+ uses .mjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
};

export const extractTextFromImage = async (file) => {
  const result = await Tesseract.recognize(file, 'eng');
  return result.data.text;
};

export const extractTextFromPPTX = async (file) => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  let fullText = '';

  const slideFiles = Object.keys(loadedZip.files).filter(name => 
    name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  );

  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/) || [0], 10);
    const numB = parseInt(b.match(/\d+/) || [0], 10);
    return numA - numB;
  });

  for (const slideFile of slideFiles) {
    const xmlContent = await loadedZip.files[slideFile].async('string');
    const matches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
    if (matches) {
      const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      fullText += slideText + '\n';
    }
  }

  return fullText;
};

export const generateQuestionsFromText = async (text, apiKey = null) => {
  if (!apiKey) {
    throw new Error("Lütfen yapay zeka ile soru üretmek için bir Gemini API Key girin! (Please enter a Gemini API Key)");
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a quiz generator. Extract knowledge from the following text and generate exactly 3 multiple choice questions. The text is:\n\n${text.substring(0, 15000)}\n\nRespond ONLY with a valid JSON array of objects. Do not include markdown formatting or backticks. Each object must have these exact keys:\n- "question" (string)\n- "options" (array of exactly 4 strings)\n- "correctAnswer" (integer 0, 1, 2, or 3 representing the index of the correct option)\n- "timeLimit" (integer 20)\n- "difficulty" (string "easy", "medium", or "hard")`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API Hatası (API Error): ${response.status} - Lütfen API anahtarınızın doğru olduğundan emin olun.`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) {
      throw new Error("Yapay zeka yanıt veremedi. (No response from AI)");
    }

    const rawContent = data.candidates[0].content.parts[0].text;
    const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(jsonStr);
    
    return questions.map(q => ({
      ...q,
      id: Math.random().toString(36).substring(2, 9)
    }));

  } catch (err) {
    console.error("AI Generation failed:", err);
    throw err; // Re-throw to show alert in QuizBuilder
  }
};
