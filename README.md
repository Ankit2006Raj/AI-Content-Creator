# AI Content Generation & Summarization Tool

A powerful web application powered by Google Gemini 1.5 Flash that helps content creators generate high-quality content and create intelligent summaries.

## Features

- **Generate High-Quality Content**: Create blog posts, social media content, emails, product descriptions, and articles
- **Customizable Options**: Adjust tone (formal, friendly, persuasive, casual, professional) and length (short, medium, long)
- **Intelligent Summarization**: Get brief, detailed, or bullet-point summaries from long documents while preserving key information
- **Beautiful UI**: Modern, animated interface with smooth transitions and responsive design

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Gemini API Key

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**To get your Gemini API key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env` file

### 3. Run the Application

```bash
python app.py
```

The application will start on `http://localhost:5000`

### 4. Open in Browser

Navigate to `http://localhost:5000` in your web browser.

## Usage

### Generate Content

1. Select the "Generate Content" tab
2. Enter your prompt describing what you want to generate
3. Choose content type (blog, social media, email, etc.)
4. Select your preferred tone and length
5. Click "Generate Content"
6. Copy or clear the result as needed

### Summarize Text

1. Select the "Summarize Text" tab
2. Paste the text you want to summarize (minimum 50 characters)
3. Choose summary type (brief, detailed, or bullet points)
4. Click "Summarize"
5. Copy or clear the result as needed

## Project Structure

```
Content/
├── app.py                 # Flask backend application
├── requirements.txt       # Python dependencies
├── .env.example          # Example environment file
├── .gitignore           # Git ignore file
├── README.md            # This file
├── templates/
│   └── index.html       # Main HTML template
└── static/
    ├── css/
    │   └── style.css    # Stylesheet with animations
    └── js/
        └── app.js       # Frontend JavaScript
```

## Technologies Used

- **Backend**: Python, Flask, Google Generative AI (Gemini 1.5 Flash)
- **Frontend**: HTML5, CSS3 (with animations), Vanilla JavaScript
- **APIs**: Google Gemini 1.5 Flash API

## Notes

- Make sure your Gemini API key is valid and has sufficient quota
- The application runs in debug mode by default (suitable for development)
- For production, set `debug=False` in `app.py`

## License

This project is open source and available for personal and commercial use.

