from langchain_core.language_models import BaseChatModel
from langchain_groq import ChatGroq

from app.config import Settings


def build_llm(settings: Settings) -> BaseChatModel:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0.4)
