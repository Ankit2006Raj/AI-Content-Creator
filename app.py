from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize model variable
model = None

def get_model():
    """Get or initialize the Gemini model"""
    global model
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key and api_key.strip():
        try:
            genai.configure(api_key=api_key.strip())
            
            # List available models and find one that works
            try:
                available_models = genai.list_models()
                model_names = []
                for m in available_models:
                    if 'generateContent' in m.supported_generation_methods:
                        model_names.append(m.name.replace('models/', ''))
                
                # print(f"Available models: {model_names}")  # Commented out to reduce console output
                
                # Try models in order of preference
                preferred_models = [
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-pro-latest',
                    'gemini-1.5-pro',
                    'gemini-pro-latest',
                    'gemini-pro',
                    'gemini-1.5-flash',
                    'models/gemini-1.5-flash-latest',
                    'models/gemini-pro'
                ]
                
                # First, try preferred models
                for model_name in preferred_models:
                    if model_name in model_names or model_name.replace('models/', '') in model_names:
                        try:
                            model = genai.GenerativeModel(model_name.replace('models/', ''))
                            print(f"Using model: {model_name.replace('models/', '')}")
                            return model
                        except:
                            continue
                
                # If preferred don't work, try the first available model
                if model_names:
                    model_name = model_names[0].replace('models/', '')
                    model = genai.GenerativeModel(model_name)
                    print(f"Using first available model: {model_name}")
                    return model
            except Exception as list_error:
                print(f"Could not list models: {list_error}")
            
            # Fallback: try common model names directly
            fallback_models = ['gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.5-pro-latest']
            for model_name in fallback_models:
                try:
                    model = genai.GenerativeModel(model_name)
                    print(f"Using fallback model: {model_name}")
                    return model
                except:
                    continue
            
            print("ERROR: Could not find any working model")
            return None
            
        except Exception as e:
            print(f"Error configuring Gemini API: {e}")
            return None
    return None

# Initialize model on startup
get_model()

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/api/generate', methods=['POST'])
def generate_content():
    """Generate content based on user input"""
    try:
        data = request.json
        content_type = data.get('contentType', 'blog')
        prompt = data.get('prompt', '')
        tone = data.get('tone', 'friendly')
        length = data.get('length', 'medium')
        
        # Reload environment and check for API key
        load_dotenv()
        api_key = os.getenv('GEMINI_API_KEY')
        
        # Validate API key format
        if not api_key or not api_key.strip() or api_key.strip() == 'your_gemini_api_key_here':
            return jsonify({
                'error': 'Please replace "your_gemini_api_key_here" in the .env file with your actual Gemini API key. Get it from: https://makersuite.google.com/app/apikey'
            }), 500
        
        # Get or initialize model (force reinitialize if None)
        global model
        if model is None:
            model = get_model()
        current_model = model
        if not current_model:
            return jsonify({
                'error': 'Failed to initialize Gemini API. Please verify your API key is correct and starts with "AIza". Check server console for available models.'
            }), 500
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        # Create content type specific instructions
        content_instructions = {
            'blog': 'Write a comprehensive blog post',
            'social': 'Create engaging social media content',
            'email': 'Write a professional email',
            'product': 'Write a compelling product description',
            'article': 'Write a detailed article'
        }
        
        # Map length to word count guidance
        length_guide = {
            'short': 'around 200-300 words',
            'medium': 'around 500-700 words',
            'long': 'around 1000-1500 words'
        }
        
        # Tone descriptions
        tone_guide = {
            'formal': 'Use a formal, professional tone',
            'friendly': 'Use a friendly, conversational tone',
            'persuasive': 'Use a persuasive, compelling tone',
            'casual': 'Use a casual, relaxed tone',
            'professional': 'Use a professional, business-oriented tone'
        }
        
        system_prompt = f"""You are an expert content writer. {content_instructions.get(content_type, 'Create high-quality content')}.

Requirements:
- Content Type: {content_type}
- Tone: {tone_guide.get(tone, 'friendly')}
- Length: {length_guide.get(length, 'medium')}
- Make it engaging, well-structured, and valuable to the reader

User Request: {prompt}

Please generate the content now:"""

        response = current_model.generate_content(system_prompt)
        generated_content = response.text
        
        return jsonify({
            'success': True,
            'content': generated_content
        })
        
    except Exception as e:
        error_msg = str(e)
        # Check for specific API key errors
        if 'API key' in error_msg or 'API_KEY' in error_msg or 'invalid' in error_msg.lower():
            return jsonify({
                'error': f'Invalid Gemini API key. Please check your API key in the .env file. Error: {error_msg}'
            }), 400
        return jsonify({'error': f'Error generating content: {error_msg}'}), 500

@app.route('/api/summarize', methods=['POST'])
def summarize_content():
    """Summarize long content"""
    try:
        data = request.json
        text = data.get('text', '')
        summary_type = data.get('summaryType', 'brief')
        
        # Reload environment and check for API key
        load_dotenv()
        api_key = os.getenv('GEMINI_API_KEY')
        
        # Validate API key format
        if not api_key or not api_key.strip() or api_key.strip() == 'your_gemini_api_key_here':
            return jsonify({
                'error': 'Please replace "your_gemini_api_key_here" in the .env file with your actual Gemini API key. Get it from: https://makersuite.google.com/app/apikey'
            }), 500
        
        # Get or initialize model (force reinitialize if None)
        global model
        if model is None:
            model = get_model()
        current_model = model
        if not current_model:
            return jsonify({
                'error': 'Failed to initialize Gemini API. Please verify your API key is correct and starts with "AIza". Check server console for available models.'
            }), 500
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        if len(text) < 50:
            return jsonify({'error': 'Text is too short. Please provide at least 50 characters.'}), 400
        
        # Map summary type to instructions
        summary_instructions = {
            'brief': 'Create a very brief summary (2-3 sentences) capturing only the main points',
            'detailed': 'Create a detailed summary (2-3 paragraphs) with important details and context',
            'bullet': 'Create a bullet-point summary with key points and sub-points'
        }
        
        system_prompt = f"""You are an expert at creating intelligent summaries. {summary_instructions.get(summary_type, 'brief')}.

Important:
- Preserve all key information
- Maintain accuracy and context
- Keep it concise but comprehensive based on the summary type

Text to summarize:
{text}

Please create the summary now:"""

        response = current_model.generate_content(system_prompt)
        summary = response.text
        
        return jsonify({
            'success': True,
            'summary': summary
        })
        
    except Exception as e:
        error_msg = str(e)
        # Check for specific API key errors
        if 'API key' in error_msg or 'API_KEY' in error_msg or 'invalid' in error_msg.lower():
            return jsonify({
                'error': f'Invalid Gemini API key. Please check your API key in the .env file. Error: {error_msg}'
            }), 400
        return jsonify({'error': f'Error summarizing content: {error_msg}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    load_dotenv()
    api_key = os.getenv('GEMINI_API_KEY')
    return jsonify({
        'status': 'healthy',
        'api_configured': api_key is not None and api_key.strip() != ''
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

