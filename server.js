const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// JSON and URL-encoded body parser with generous limit for images/PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Gemini client helper
let aiClient = null;
function getGenAI() {
  if (!aiClient) {
    aiClient = new GoogleGenAI();
  }
  return aiClient;
}

// COR (Certificate of Registration) AI Parser endpoint
app.post('/api/parse-cor', async (req, res) => {
  try {
    const { imageBase64, mimeType, textContent } = req.body;

    if (!imageBase64 && !textContent) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either imageBase64 or textContent of the Certificate of Registration.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: false,
        fallback: true,
        message: 'No GEMINI_API_KEY configured. Falling back to local OCR / text parser.'
      });
    }

    const ai = getGenAI();

    const prompt = `You are an expert academic document parser for College Certificates of Registration (COR / Study Load / Class Schedule) in Philippine universities (such as CTU, UST, UP, DLSU, PUP, etc.) and global colleges.
Extract all enrolled subjects, course codes, schedules, days, times, rooms, units, and instructors from this Certificate of Registration.

Return ONLY a valid JSON object matching this structure:
{
  "year_level": "1st Year" | "2nd Year" | "3rd Year" | "4th Year" | "5th Year" | null,
  "semester": "1st Semester" | "2nd Semester" | "Summer / Midyear" | null,
  "school": string | null,
  "student_id": string | null,
  "student_name": string | null,
  "course_program": string | null,
  "subjects": [
    {
      "code": "IT 211",
      "name": "Data Structures and Algorithms",
      "days": "MWF",
      "start_time": "09:00",
      "end_time": "10:30",
      "schedule_raw": "MWF 09:00-10:30 AM",
      "room": "Lab 302",
      "units": 3,
      "professor": "Prof. Santos"
    }
  ]
}

Formatting rules:
- Format start_time and end_time as 24-hour HH:mm (e.g. "09:00", "13:30", "17:00") or standard 12-hour if ambiguous.
- For days, use standard abbreviations: "MWF", "TTH", "Mon, Wed, Fri", "Tue, Thu", "Sat", "Sun".
- If time is missing or TBA, leave start_time and end_time as "" and set schedule_raw to "TBA" or what is indicated.
- Clean up any OCR artifacts, fixing obvious spelling mistakes in subject titles (e.g. "Datastructures" -> "Data Structures", "Engilsh" -> "English").
- Always return valid JSON with no extra commentary or markdown backticks.`;

    let contents = [];
    if (imageBase64) {
      let cleanBase64 = imageBase64;
      let detectedMime = mimeType || 'image/jpeg';
      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        detectedMime = parts[0].replace('data:', '') || detectedMime;
        cleanBase64 = parts[1];
      }

      contents = [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: detectedMime
              }
            }
          ]
        }
      ];
    } else {
      contents = [
        {
          role: 'user',
          parts: [
            { text: `${prompt}\n\nDocument text content:\n${textContent}` }
          ]
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    let parsedData = null;
    try {
      // Remove any surrounding code blocks if present
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('Failed to parse JSON response from Gemini:', parseErr, responseText);
      return res.json({
        success: false,
        fallback: true,
        rawText: responseText
      });
    }

    return res.json({
      success: true,
      data: parsedData
    });
  } catch (err) {
    console.error('Error parsing COR with Gemini:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while parsing COR.'
    });
  }
});

// Serve static assets from root directory
app.use(express.static(__dirname));

// Single page application fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`ClassConnect server listening on http://${HOST}:${PORT}`);
});
