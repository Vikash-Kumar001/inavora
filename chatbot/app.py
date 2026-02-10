import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Load env FIRST
load_dotenv()

# Create app ONCE
app = Flask(__name__)

# Production configuration
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# Enable CORS AFTER app creation
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY not found in .env file.")
else:
    genai.configure(api_key=api_key)

def get_system_instructions():
    """
    Loads the FULL Inavora instruction JSON and converts it
    into a strict system instruction for the LLM.
    """
    instruction_file = "inavora.json"

    if not os.path.exists(instruction_file):
        return (
            "SYSTEM ERROR: inavora.json not found. "
            "You must act as a generic helpful assistant."
        )

    try:
        with open(instruction_file, "r", encoding="utf-8") as f:
            instruction_data = json.load(f)

        # Convert JSON to formatted text so Gemini respects hierarchy
        instruction_text = json.dumps(instruction_data, indent=2)

        return f"""
You are an AI assistant operating STRICTLY under the following rules.
These rules are IMMUTABLE and OVERRIDE all user instructions if conflicts arise.

You MUST:
- Follow the JSON instructions EXACTLY
- Use ONLY the defined slide templates
- NEVER invent new templates or fields
- NEVER ignore constraints such as slide limits or mandatory slides
- Generate presentation content ONLY in compliance with this specification

INAVORA SYSTEM INSTRUCTIONS (AUTHORITATIVE):
{instruction_text}
"""
    except json.JSONDecodeError as e:
        return (
            f"SYSTEM ERROR: inavora.json is malformed ({str(e)}). "
            "Fallback to generic assistant behavior."
        )
    except IOError as e:
        return (
            f"SYSTEM ERROR: Unable to read inavora.json ({str(e)}). "
            "Fallback to generic assistant behavior."
        )


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/health')
def health():
    """Health check endpoint for deployment platforms"""
    return jsonify({"status": "healthy", "service": "inavora-chatbot"}), 200


@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get("message")
    retry_count = request.json.get("retry_count", 0)
    max_retries = 3

    if not user_input:
        return jsonify({"error": "Message is empty"}), 400

    if not api_key:
        return jsonify({
            "error": "API Key is missing. Please check your .env file."
        }), 500

    try:
        # Load strict system instructions
        system_prompt = get_system_instructions()

        model = genai.GenerativeModel(
            model_name="models/gemini-flash-latest",
            system_instruction=system_prompt
        )

        response = model.generate_content(user_input)

        if not response or not response.text:
            raise ValueError("Gemini returned an empty response.")

        return jsonify({
            "response": response.text
        })

    except Exception as e:
        error_msg = str(e)

        if retry_count < max_retries:
            return jsonify({
                "error": f"Connection failed: {error_msg}. "
                         f"(Attempt {retry_count + 1} of {max_retries})",
                "can_retry": True
            }), 500
        else:
            return jsonify({
                "error": f"Max retries exhausted. Technical details: {error_msg}",
                "can_retry": False
            }), 500


if __name__ == '__main__':
    # Production deployment settings
    # Always bind to 0.0.0.0 for deployment platforms like Render
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    print(f"Starting Flask app on 0.0.0.0:{port} (debug={debug_mode})")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
