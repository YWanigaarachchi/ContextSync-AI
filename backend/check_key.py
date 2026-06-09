from app.core.config import settings
import os

print("--- ENV VARIABLE ---")
print("GEMINI_API_KEY in os.environ:", os.environ.get("GEMINI_API_KEY"))

print("--- SETTINGS VALUE ---")
print("GEMINI_API_KEY in settings:", settings.GEMINI_API_KEY)
print("Key length:", len(settings.GEMINI_API_KEY))
if len(settings.GEMINI_API_KEY) > 8:
    print("Prefix:", settings.GEMINI_API_KEY[:8])
    print("Suffix:", settings.GEMINI_API_KEY[-8:])
else:
    print("Key is too short!")
