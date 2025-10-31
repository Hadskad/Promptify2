import { GEMINI_API_KEY } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  const rewriteBtn = document.getElementById("rewriteBtn");
  const copyBtn = document.getElementById("copyBtn");
  const userPrompt = document.getElementById("userPrompt");
  const output = document.getElementById("output");

  rewriteBtn.addEventListener("click", async () => {
    const text = userPrompt.value.trim();
    if (!text) {
      output.value = "Please enter a prompt first!";
      return;
    }

    output.value = "⏳ Refining your prompt...";

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            system_instruction: {
              parts: [
                {
                  text: `You are Promptify, an expert AI prompt engineer trained to create powerful, clear, and effective prompts for AI models like ChatGPT, Gemini, and Claude.

Your ONLY goal is to take the user's raw idea or question and rephrase it into a perfect, ready-to-use prompt that gets the most intelligent, relevant, and creative answer possible.

🎯 Rules:
1. NEVER answer the user's question.
2. ALWAYS optimize for clarity, specificity, and context.
3. Add details or structure only if they make the prompt more effective.
4. Output only the final rewritten prompt — nothing else.`,
                },
              ],
            },
          }),
        }
      );

      const data = await response.json();
      const refined =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "❌ Could not refine prompt. Please try again.";
      output.value = refined;
    } catch (error) {
      output.value = "⚠️ Error refining prompt: " + error.message;
    }
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(output.value);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy Output"), 1500);
  });
});
