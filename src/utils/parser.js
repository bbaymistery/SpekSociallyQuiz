import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import JSZip from 'jszip';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const result = await Tesseract.recognize(file, 'eng', {
    logger: m => console.log(m)
  });
  return result.data.text;
};

export const extractTextFromPPTX = async (file) => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  let fullText = '';

  const slideFiles = Object.keys(loadedZip.files).filter(name => 
    name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  );

  // Sort logically if possible (slide1, slide2... rather than slide1, slide10)
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/) || [0], 10);
    const numB = parseInt(b.match(/\d+/) || [0], 10);
    return numA - numB;
  });

  for (const slideFile of slideFiles) {
    const xmlContent = await loadedZip.files[slideFile].async('string');
    // Extract text between <a:t> and </a:t>
    const matches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
    if (matches) {
      const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      fullText += slideText + '\n';
    }
  }

  return fullText;
};

// A very simple heuristics-based offline generator just to have a fallback
const fallbackGenerate = (text) => {
  const words = text.split(/\s+/).filter(w => w.length > 4);
  const keyword = words[Math.floor(Math.random() * words.length)] || 'Something';
  
  return [{
    id: Date.now().toString(),
    question: `What is the significance of ${keyword} based on the document?`,
    options: [
      `It is an important concept.`,
      `It is completely irrelevant.`,
      `It is a type of animal.`,
      `It was discovered in 1990.`
    ],
    correctAnswer: 0,
    timeLimit: 20,
    difficulty: 'medium'
  }];
};

export const generateQuestionsFromText = async (text, apiKey = null) => {
  if (!apiKey) {
    return fallbackGenerate(text);
  }

  try {
    // Basic implementation for Gemini API assuming the key is a Gemini key
    // For OpenAI, the endpoint/payload would be different. Let's assume Gemini for now.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate 3 multiple choice quiz questions based on this text. Format as JSON array of objects with keys: "question", "options" (array of 4 strings), "correctAnswer" (integer 0-3 index), "timeLimit" (integer like 20), "difficulty" (string "easy", "medium", or "hard"). Text: ${text.substring(0, 5000)}`
          }]
        }]
      })
    });

    const data = await response.json();
    const rawContent = data.candidates[0].content.parts[0].text;
    
    // Attempt to parse JSON from markdown block
    const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(jsonStr);
    
    return questions.map(q => ({
      ...q,
      id: Math.random().toString(36).substring(2, 9)
    }));

  } catch (err) {
    console.error("AI Generation failed, using fallback.", err);
    return fallbackGenerate(text);
  }
};
