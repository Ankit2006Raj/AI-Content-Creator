// Tab Management
let activeTab = 'generate';

// Voice Recognition and Speech Synthesis
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isListening = false;
let isSpeaking = false;

function initApp() {
    setupTabs();
    setupEventListeners();
    setupVoiceRecognition();
    setupVoiceControls();
    createParticles();
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    activeTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Show/hide content sections
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });
    
    document.getElementById(`${tab}-section`).classList.remove('hidden');
    
    // Clear previous results
    clearResults();
}

function setupEventListeners() {
    // Generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }
    
    // Summarize button
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', handleSummarize);
    }
    
    // Copy buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) {
            copyToClipboard(e.target);
        }
    });

    // Voice input button
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', toggleVoiceInput);
    }

    // Play content buttons
    const playGeneratedBtn = document.getElementById('playGeneratedContent');
    const pauseGeneratedBtn = document.getElementById('pauseGeneratedContent');
    const playSummaryBtn = document.getElementById('playSummaryContent');
    const pauseSummaryBtn = document.getElementById('pauseSummaryContent');

    if (playGeneratedBtn) {
        playGeneratedBtn.addEventListener('click', () => playContent('generate'));
    }
    if (pauseGeneratedBtn) {
        pauseGeneratedBtn.addEventListener('click', pauseContent);
    }
    if (playSummaryBtn) {
        playSummaryBtn.addEventListener('click', () => playContent('summarize'));
    }
    if (pauseSummaryBtn) {
        pauseSummaryBtn.addEventListener('click', pauseContent);
    }
}

// Content Generation
async function handleGenerate() {
    const prompt = document.getElementById('generatePrompt').value.trim();
    const contentType = document.getElementById('contentType').value;
    const tone = document.getElementById('tone').value;
    const length = document.getElementById('length').value;
    
    if (!prompt) {
        showAlert('Please enter a prompt', 'error');
        return;
    }
    
    const generateBtn = document.getElementById('generateBtn');
    const resultSection = document.getElementById('generate-result');
    const resultContent = document.getElementById('generate-result-content');
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="loading"></span> Generating...';
    resultSection.classList.add('hidden');
    clearAlerts();
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                contentType,
                tone,
                length
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            resultContent.textContent = data.content;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            showAlert(data.error || 'Failed to generate content', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>✨</span> Generate Content';
    }
}

// Content Summarization
async function handleSummarize() {
    const text = document.getElementById('summarizeText').value.trim();
    const summaryType = document.getElementById('summaryType').value;
    
    if (!text) {
        showAlert('Please enter text to summarize', 'error');
        return;
    }
    
    if (text.length < 50) {
        showAlert('Text must be at least 50 characters long', 'error');
        return;
    }
    
    const summarizeBtn = document.getElementById('summarizeBtn');
    const resultSection = document.getElementById('summarize-result');
    const resultContent = document.getElementById('summarize-result-content');
    
    // Show loading state
    summarizeBtn.disabled = true;
    summarizeBtn.innerHTML = '<span class="loading"></span> Summarizing...';
    resultSection.classList.add('hidden');
    clearAlerts();
    
    try {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                summaryType
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            resultContent.textContent = data.summary;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            showAlert(data.error || 'Failed to summarize content', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        summarizeBtn.disabled = false;
        summarizeBtn.innerHTML = '<span>📝</span> Summarize';
    }
}

// Utility Functions
function clearResults() {
    document.querySelectorAll('.result-section').forEach(section => {
        section.classList.add('hidden');
    });
    clearAlerts();
}

function clearAlerts() {
    document.querySelectorAll('.alert').forEach(alert => {
        alert.remove();
    });
}

function showAlert(message, type = 'error') {
    clearAlerts();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${type === 'error' ? '⚠️' : '✓'}</span>
        <span>${message}</span>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(-20px)';
        setTimeout(() => alert.remove(), 400);
    }, 5000);
}

async function copyToClipboard(button) {
    let text = '';
    
    if (activeTab === 'generate') {
        text = document.getElementById('generate-result-content').textContent;
    } else if (activeTab === 'summarize') {
        text = document.getElementById('summarize-result-content').textContent;
    }
    
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const originalText = button.innerHTML;
        button.innerHTML = '<span>✓</span> Copied!';
        button.style.background = 'var(--success)';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    } catch (error) {
        showAlert('Failed to copy to clipboard', 'error');
    }
}

function createParticles() {
    const container = document.body;
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

// Voice Recognition Setup
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'hi-IN'; // Hindi language support
        
        recognition.onstart = function() {
            isListening = true;
            updateVoiceUI(true);
            showVoiceIndicator('🎤 सुन रहा हूं... बोलें!');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const promptTextarea = document.getElementById('generatePrompt');
            if (promptTextarea) {
                // Append to existing text or replace if empty
                const currentText = promptTextarea.value.trim();
                promptTextarea.value = currentText ? currentText + ' ' + transcript : transcript;
                
                // Auto-resize textarea
                promptTextarea.style.height = 'auto';
                promptTextarea.style.height = promptTextarea.scrollHeight + 'px';
            }
            showAlert(`Voice input: "${transcript}"`, 'success');
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Voice recognition error occurred';
            
            switch(event.error) {
                case 'network':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone permission.';
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'No microphone found. Please check your audio settings.';
                    break;
            }
            
            showAlert(errorMessage, 'error');
        };
        
        recognition.onend = function() {
            isListening = false;
            updateVoiceUI(false);
            hideVoiceIndicator();
        };
    } else {
        console.warn('Speech recognition not supported');
        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
    }
}

// Voice Controls Setup
function setupVoiceControls() {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        // Hide voice play buttons
        document.querySelectorAll('.voice-play-btn, .voice-pause-btn').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

// Toggle Voice Input
function toggleVoiceInput() {
    if (!recognition) {
        showAlert('Voice recognition not supported in your browser', 'error');
        return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            showAlert('Unable to start voice recognition', 'error');
        }
    }
}

// Update Voice UI
function updateVoiceUI(listening) {
    const voiceBtn = document.getElementById('voiceInputBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (voiceBtn) {
        if (listening) {
            voiceBtn.classList.add('recording');
            voiceBtn.title = 'Recording... Click to stop';
        } else {
            voiceBtn.classList.remove('recording');
            voiceBtn.title = 'Voice Input';
        }
    }
    
    if (voiceStatus) {
        if (listening) {
            voiceStatus.textContent = 'Listening...';
            voiceStatus.classList.remove('hidden');
            voiceStatus.classList.add('listening');
        } else {
            voiceStatus.classList.add('hidden');
            voiceStatus.classList.remove('listening');
        }
    }
}

// Show Voice Indicator
function showVoiceIndicator(message) {
    // Remove existing indicator
    const existingIndicator = document.querySelector('.voice-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'voice-indicator';
    indicator.innerHTML = `
        <div class="voice-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
        </div>
        <div>${message}</div>
        <div style="font-size: 0.8rem; opacity: 0.8;">Click voice button to stop</div>
    `;
    
    document.body.appendChild(indicator);
}

// Hide Voice Indicator
function hideVoiceIndicator() {
    const indicator = document.querySelector('.voice-indicator');
    if (indicator) {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => indicator.remove(), 300);
    }
}

// Play Content with Voice
function playContent(type) {
    if (isSpeaking) {
        speechSynthesis.cancel();
    }
    
    let content = '';
    let playBtn, pauseBtn;
    
    if (type === 'generate') {
        content = document.getElementById('generate-result-content').textContent;
        playBtn = document.getElementById('playGeneratedContent');
        pauseBtn = document.getElementById('pauseGeneratedContent');
    } else if (type === 'summarize') {
        content = document.getElementById('summarize-result-content').textContent;
        playBtn = document.getElementById('playSummaryContent');
        pauseBtn = document.getElementById('pauseSummaryContent');
    }
    
    if (!content.trim()) {
        showAlert('No content to play', 'error');
        return;
    }
    
    const voiceType = document.getElementById('voiceType').value;
    const voiceSpeed = parseFloat(document.getElementById('voiceSpeed').value);
    
    currentUtterance = new SpeechSynthesisUtterance(content);
    
    // Get available voices
    const voices = speechSynthesis.getVoices();
    let selectedVoice = null;
    
    // Try to find preferred voice type
    if (voiceType === 'female') {
        selectedVoice = voices.find(voice => 
            (voice.name.toLowerCase().includes('female') || 
             voice.name.toLowerCase().includes('woman') ||
             voice.name.toLowerCase().includes('zira') ||
             voice.name.toLowerCase().includes('eva') ||
             voice.name.toLowerCase().includes('susan')) &&
            (voice.lang.includes('en') || voice.lang.includes('hi'))
        );
    } else if (voiceType === 'male') {
        selectedVoice = voices.find(voice => 
            (voice.name.toLowerCase().includes('male') || 
             voice.name.toLowerCase().includes('man') ||
             voice.name.toLowerCase().includes('david') ||
             voice.name.toLowerCase().includes('mark') ||
             voice.name.toLowerCase().includes('ravi')) &&
            (voice.lang.includes('en') || voice.lang.includes('hi'))
        );
    }
    
    // Fallback to any English or Hindi voice
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
            voice.lang.includes('en') || voice.lang.includes('hi')
        );
    }
    
    if (selectedVoice) {
        currentUtterance.voice = selectedVoice;
    }
    
    currentUtterance.rate = voiceSpeed;
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;
    
    currentUtterance.onstart = function() {
        isSpeaking = true;
        playBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        playBtn.innerHTML = '<span>🔊</span> Playing...';
    };
    
    currentUtterance.onend = function() {
        isSpeaking = false;
        playBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
        playBtn.innerHTML = type === 'generate' ? '<span>🔊</span> Listen to Content' : '<span>🔊</span> Listen to Summary';
    };
    
    currentUtterance.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        showAlert('Error playing audio', 'error');
        isSpeaking = false;
        playBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
    };
    
    speechSynthesis.speak(currentUtterance);
}

// Pause Content
function pauseContent() {
    if (isSpeaking && currentUtterance) {
        speechSynthesis.cancel();
        isSpeaking = false;
        
        // Update UI
        document.querySelectorAll('.voice-play-btn').forEach(btn => {
            btn.classList.remove('hidden');
            if (btn.id === 'playGeneratedContent') {
                btn.innerHTML = '<span>🔊</span> Listen to Content';
            } else if (btn.id === 'playSummaryContent') {
                btn.innerHTML = '<span>🔊</span> Listen to Summary';
            }
        });
        
        document.querySelectorAll('.voice-pause-btn').forEach(btn => {
            btn.classList.add('hidden');
        });
    }
}

// Load voices when available
speechSynthesis.onvoiceschanged = function() {
    const voices = speechSynthesis.getVoices();
    console.log('Available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

