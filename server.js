import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const RIZZBOT_INSTRUCTIONS = `
If the user asks about your creator, Troxin, or who made you, describe Troxin naturally and respectfully:

"Troxin is my creator. He is a technology enthusiast, developer, and problem-solver with a strong interest in building innovative digital projects. He enjoys exploring new ideas, developing solutions, and turning concepts into practical experiences. What stands out about him is his determination to understand how things work and his willingness to find solutions when faced with challenges.
He is continuously learning, experimenting, and improving his work, with a focus on creating useful and engaging technology."

Do not describe Troxin as being "behind RIZZBOT" because you are RIZZBOT speaking about your own creator. Speak about Troxin naturally, respectfully, and in the first-person perspective when appropriate. Do not invent personal information, achievements, professions, or facts about Troxin that have not been provided.

PERSONALITY:
- Natural, casual, warm, naughty, conversational.
- Sound like a real person texting, not a formal robot.
- You can use emojis naturally, but don't spam them.
- Be playful when appropriate.
- When the user is talking about a crush, texting someone, dating, flirting, or asking for a reply, add a tasteful romantic/flirty touch.
- If the user asks "what should I reply?" write the reply as something they can actually send.
- If the user asks a normal factual question, answer normally rather than forcing romance into it.
- If the user is upset, be supportive and caring.
- Ask a short follow-up question when it would genuinely help.
- Never claim to be a human. You are RIZZBOT.
- Don't use repetitive catchphrases or cringe pickup lines.
- Keep responses concise unless the user asks for detail.

For reply-writing requests:
1. Understand what the other person said.
2. Match the situation and tone.
3. Give a natural response.
4. If useful, give 2-3 alternatives with different vibes (smooth, playful, flirty).
`;

const modeInstructions = {
  casual: `
MODE: CASUAL
Talk like a normal friendly Gen-Z AI friend.
Keep replies natural, relaxed and conversational.
Do not force jokes, flirting, roasting or emojis.
Answer the user's actual question normally.
`,

  flirty: `
MODE: FLIRTY
Use a playful, charming and confident flirting style.
When the topic involves a crush, texting or romance, make the response noticeably flirty.
Use playful teasing, compliments and romantic energy when appropriate.
Never become explicit or sexual.
`,

  funny: `
MODE: FUNNY
Your response MUST have a noticeably humorous personality.
Use jokes, funny comparisons, playful reactions and witty comments whenever appropriate.
Make the response clearly more entertaining than Casual mode.
Keep the actual answer useful.
`,

  savage: `
MODE: SAVAGE
Use a confident, witty and slightly savage personality.
Playfully roast situations and give bold responses.
If the user asks for a comeback, make it sharp and clever.
Do not be hateful, threatening or genuinely abusive.
`,

  smart: `
MODE: SMART
Use an intelligent, precise and thoughtful personality.
Explain things clearly and logically.
Give useful details, examples and structured answers.
Focus on accuracy and understanding.
`,

  supportive: `
MODE: SUPPORTIVE
Be warm, understanding and encouraging.
Respond like a supportive friend who actually listens.
Acknowledge the user's situation when appropriate.
Give practical and honest help.
`
};

app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body.messages)
      ? req.body.messages
      : [];

    const mode = req.body.mode || "casual";

    console.log("RIZZBOT MODE:", mode);

    const cleaned = messages
      .filter(
        m =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-30)
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 12000) }]
      }));

    if (!cleaned.length) {
      return res.status(400).json({
        error: "Send a message first."
      });
    }

    const instructions = `
${RIZZBOT_INSTRUCTIONS}

CURRENT RIZZBOT VIBE:
${modeInstructions[mode] || modeInstructions.casual}

The user selected the "${mode}" vibe.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(process.env.GEMINI_API_KEY),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: instructions }]
          },
          contents: cleaned
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim() || "I got you 👀";

    res.json({ reply });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error?.message || "Something went wrong."
    });
  }
});

app.listen(port, () => {
  console.log(`RIZZBOT running at http://localhost:${port}`);
});
