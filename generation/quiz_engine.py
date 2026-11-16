import json
import os
from openai import OpenAI

class QuizEngine:
    """
    Generates diagnostic questions and evaluates user answers using LLM-as-a-judge.
    """
    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.model_name = model_name
        self.client = OpenAI(
            base_url="https://models.github.ai/inference",
            api_key=os.environ.get("GITHUB_TOKEN")
        )

    def generate_question(self, context_used: str, mastery: float) -> str:
        """
        Generates a quick diagnostic question based on the exact chunks retrieved.
        """
        difficulty = "conceptual and basic" if mastery < 0.4 else \
                     "applied and analytical" if mastery < 0.7 else \
                     "highly rigorous, edge-case focused, and mathematical"

        sys_prompt = (
            "You are an expert Computer Science professor. "
            "Based ONLY on the provided context, generate ONE diagnostic question to test the student's understanding. "
            f"The student's mastery level is {mastery:.2f} (0=Novice, 1=Expert). "
            f"Make the question {difficulty}. "
            "Output ONLY the question text, nothing else. Keep it under 2 sentences."
        )

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"Context: {context_used}"}
            ],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()

    def evaluate_answer(self, question: str, user_answer: str, context: str) -> dict:
        """
        Evaluates the user's answer and returns a JSON dict with score and feedback.
        """
        sys_prompt = (
            "You are a strict but fair Computer Science grading AI. "
            "Evaluate the student's answer to the given question based on the provided ground-truth context. "
            "You must respond with valid JSON containing exactly these three keys: \n"
            '1. "score": a float between 0.0 (completely wrong) and 1.0 (perfectly correct). Partial credit is allowed.\n'
            '2. "is_correct": boolean true if score >= 0.6 else false.\n'
            '3. "feedback": A brief 1-2 sentence explanation of what they got right or wrong.'
        )

        user_prompt = f"Context: {context}\n\nQuestion: {question}\n\nStudent Answer: {user_answer}"

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            response_format={ "type": "json_object" }
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except Exception:
            return {"score": 0.0, "is_correct": False, "feedback": "Failed to parse evaluation."}
