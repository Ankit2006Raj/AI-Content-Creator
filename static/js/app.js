// Tab Management
let activeTab = 'generate';

// Voice Recognition and Speech Synthesis
let recognition = null;
let recognitionHindi = null;
let recognitionEnglish = null;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isListening = false;
let isSpeaking = false;
let detectedLanguage = 'en'; // Default language
let isIntentionalStop = false; // Track if user manually stopped speech

// Speech position tracking for speed change
let currentSpeechText = '';
let currentCharIndex = 0;
let speechStartTime = 0;
let estimatedCharsPerSecond = 10; // Average reading speed

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
    
    // Stop any playing speech when switching tabs
    if (isSpeaking || speechSynthesis.speaking) {
        isIntentionalStop = true;
        speechSynthesis.cancel();
        isSpeaking = false;
        setTimeout(() => { isIntentionalStop = false; }, 200);
    }
    
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

    // Copy and Clear buttons for Generate section
    const copyGeneratedBtn = document.getElementById('copyGeneratedContent');
    const clearGeneratedBtn = document.getElementById('clearGeneratedContent');

    if (copyGeneratedBtn) {
        copyGeneratedBtn.addEventListener('click', () => copyToClipboard(copyGeneratedBtn));
    }
    if (clearGeneratedBtn) {
        clearGeneratedBtn.addEventListener('click', clearGenerateResult);
    }

    // Language detection on typing
    const promptTextarea = document.getElementById('generatePrompt');
    if (promptTextarea) {
        promptTextarea.addEventListener('input', function() {
            const text = this.value.trim();
            if (text.length > 5) {
                const detectedLang = detectLanguageFromPrompt(text);
                this.setAttribute('data-language', detectedLang);
                updateLanguageIndicator(detectedLang);
            } else {
                document.getElementById('languageIndicator')?.classList.add('hidden');
            }
        });
    }

    // Real-time voice type control - CONTINUE FROM POSITION
    const voiceTypeSelect = document.getElementById('voiceType');
    if (voiceTypeSelect) {
        voiceTypeSelect.addEventListener('change', function() {
            const newVoiceType = this.value;
            const voiceLabel = newVoiceType === 'female' ? 'Female' : newVoiceType === 'male' ? 'Male' : 'Default';
            
            // If speech is currently playing, apply voice change and resume from current position
            if (isSpeaking && currentUtterance && currentSpeechText) {
                try {
                    if (speechSynthesis.speaking) {
                        // Store current state
                        const currentLang = currentUtterance.lang;
                        const currentRate = currentUtterance.rate;
                        const currentPitch = currentUtterance.pitch;
                        const currentVolume = currentUtterance.volume;
                        
                        // Get remaining text from current position
                        const remainingText = currentSpeechText.substring(currentCharIndex);
                        
                        console.log(`🎤 Changing voice to ${voiceLabel} at character ${currentCharIndex} of ${currentSpeechText.length}`);
                        console.log(`📝 Remaining text: ${remainingText.substring(0, 50)}...`);
                        
                        // Find which button is active
                        let activePlayBtn = null;
                        let activePauseBtn = null;
                        if (document.getElementById('playGeneratedContent').classList.contains('hidden')) {
                            activePlayBtn = document.getElementById('playGeneratedContent');
                            activePauseBtn = document.getElementById('pauseGeneratedContent');
                        } else if (document.getElementById('playSummaryContent').classList.contains('hidden')) {
                            activePlayBtn = document.getElementById('playSummaryContent');
                            activePauseBtn = document.getElementById('pauseSummaryContent');
                        }
                        
                        // Detect content language
                        const hasHindiChars = /[\u0900-\u097F]/.test(currentSpeechText);
                        const contentLanguage = hasHindiChars ? 'hi' : 'en';
                        
                        // Cancel current speech (intentional, not an error)
                        isIntentionalStop = true;
                        speechSynthesis.cancel();
                        
                        // Small delay to ensure cancel completes
                        setTimeout(() => {
                            isIntentionalStop = false;
                            
                            // Create new utterance with REMAINING text and new voice
                            currentUtterance = new SpeechSynthesisUtterance(remainingText);
                            currentUtterance.lang = currentLang;
                            currentUtterance.rate = currentRate;
                            currentUtterance.pitch = currentPitch;
                            currentUtterance.volume = currentVolume;
                            
                            // Select new voice based on voice type
                            const voices = speechSynthesis.getVoices();
                            let selectedVoice = null;
                            
                            if (contentLanguage === 'hi') {
                                // For Hindi content
                                const hindiVoices = voices.filter(voice => 
                                    voice.lang.includes('hi') || 
                                    voice.lang.includes('HI') ||
                                    voice.name.toLowerCase().includes('hindi')
                                );
                                
                                if (hindiVoices.length > 0) {
                                    if (newVoiceType === 'female') {
                                        selectedVoice = hindiVoices.find(voice => {
                                            const name = voice.name.toLowerCase();
                                            return name.includes('female') || name.includes('woman') ||
                                                   name.includes('swara') || name.includes('kalpana');
                                        });
                                    } else if (newVoiceType === 'male') {
                                        selectedVoice = hindiVoices.find(voice => {
                                            const name = voice.name.toLowerCase();
                                            return name.includes('male') || name.includes('man') ||
                                                   name.includes('pankaj') || name.includes('hemant');
                                        });
                                    }
                                    
                                    if (!selectedVoice) {
                                        selectedVoice = hindiVoices[0];
                                    }
                                }
                            } else {
                                // For English content
                                const englishVoices = voices.filter(voice => 
                                    voice.lang.includes('en') && !voice.lang.includes('en-IN')
                                );
                                
                                if (newVoiceType === 'female') {
                                    selectedVoice = englishVoices.find(voice => {
                                        const name = voice.name.toLowerCase();
                                        return name.includes('female') || name.includes('woman') ||
                                               name.includes('zira') || name.includes('susan') ||
                                               name.includes('hazel') || name.includes('samantha');
                                    });
                                } else if (newVoiceType === 'male') {
                                    selectedVoice = englishVoices.find(voice => {
                                        const name = voice.name.toLowerCase();
                                        return name.includes('male') || name.includes('man') ||
                                               name.includes('david') || name.includes('mark');
                                    });
                                }
                                
                                if (!selectedVoice && englishVoices.length > 0) {
                                    selectedVoice = englishVoices[0];
                                }
                            }
                            
                            if (selectedVoice) {
                                currentUtterance.voice = selectedVoice;
                                console.log(`✓ New voice selected: ${selectedVoice.name}`);
                            }
                            
                            // Track new position in remaining text
                            let localCharIndex = 0;
                            currentUtterance.onboundary = function(event) {
                                if (event.name === 'word') {
                                    localCharIndex = event.charIndex;
                                    // Update global position (base position + local offset)
                                    currentCharIndex = currentCharIndex + localCharIndex;
                                }
                            };
                            
                            // Re-attach event handlers
                            currentUtterance.onstart = function() {
                                isSpeaking = true;
                                if (activePlayBtn && activePauseBtn) {
                                    activePlayBtn.classList.add('hidden');
                                    activePauseBtn.classList.remove('hidden');
                                    activePauseBtn.innerHTML = `<span>⏹️</span> Stop`;
                                }
                            };
                            
                            currentUtterance.onend = function() {
                                isSpeaking = false;
                                currentCharIndex = 0;
                                if (activePlayBtn && activePauseBtn) {
                                    activePlayBtn.classList.remove('hidden');
                                    activePauseBtn.classList.add('hidden');
                                    activePlayBtn.innerHTML = activePlayBtn.id === 'playGeneratedContent' 
                                        ? '<span>🔊</span> Listen to Content' 
                                        : '<span>🔊</span> Listen to Summary';
                                    activePauseBtn.innerHTML = '<span>⏸️</span> Pause';
                                }
                            };
                            
                            currentUtterance.onerror = function(event) {
                                console.log('Speech synthesis event during voice change:', event.error);
                                // Ignore errors during voice changes - they're expected
                                isSpeaking = false;
                            };
                            
                            // Continue speaking from current position with new voice
                            speechSynthesis.speak(currentUtterance);
                            
                            console.log(`✓ Voice changed to ${voiceLabel} - Continuing from current position`);
                        }, 100);
                        
                        showAlert(`🎤 Voice changed to ${voiceLabel} - Continuing...`, 'success');
                    }
                } catch (error) {
                    console.error('Error changing voice:', error);
                    showAlert(`Voice will apply on next playback: ${voiceLabel}`, 'success');
                }
            } else {
                // Not currently playing - just show confirmation for next play
                showAlert(`✓ Voice set to ${voiceLabel} for next playback`, 'success');
            }
        });
    }

    // Real-time voice speed control - CONTINUE FROM POSITION
    const voiceSpeedSelect = document.getElementById('voiceSpeed');
    if (voiceSpeedSelect) {
        voiceSpeedSelect.addEventListener('change', function() {
            const newSpeed = parseFloat(this.value);
            const speedLabel = newSpeed === 0.8 ? 'Slow' : newSpeed === 1.0 ? 'Normal' : 'Fast';
            
            // If speech is currently playing, apply speed change and resume from current position
            if (isSpeaking && currentUtterance && currentSpeechText) {
                try {
                    if (speechSynthesis.speaking) {
                        // Store current state
                        const currentVoice = currentUtterance.voice;
                        const currentLang = currentUtterance.lang;
                        const currentPitch = currentUtterance.pitch;
                        const currentVolume = currentUtterance.volume;
                        
                        // Get remaining text from current position
                        const remainingText = currentSpeechText.substring(currentCharIndex);
                        
                        console.log(`🎚️ Changing speed at character ${currentCharIndex} of ${currentSpeechText.length}`);
                        console.log(`📝 Remaining text: ${remainingText.substring(0, 50)}...`);
                        
                        // Find which button is active
                        let activePlayBtn = null;
                        let activePauseBtn = null;
                        if (document.getElementById('playGeneratedContent').classList.contains('hidden')) {
                            activePlayBtn = document.getElementById('playGeneratedContent');
                            activePauseBtn = document.getElementById('pauseGeneratedContent');
                        } else if (document.getElementById('playSummaryContent').classList.contains('hidden')) {
                            activePlayBtn = document.getElementById('playSummaryContent');
                            activePauseBtn = document.getElementById('pauseSummaryContent');
                        }
                        
                        // Cancel current speech (intentional, not an error)
                        isIntentionalStop = true;
                        speechSynthesis.cancel();
                        
                        // Small delay to ensure cancel completes
                        setTimeout(() => {
                            isIntentionalStop = false;
                            // Create new utterance with REMAINING text at new speed
                            currentUtterance = new SpeechSynthesisUtterance(remainingText);
                            currentUtterance.voice = currentVoice;
                            currentUtterance.lang = currentLang;
                            currentUtterance.rate = newSpeed;
                            currentUtterance.pitch = currentPitch;
                            currentUtterance.volume = currentVolume;
                            
                            // Track new position in remaining text
                            let localCharIndex = 0;
                            currentUtterance.onboundary = function(event) {
                                if (event.name === 'word') {
                                    localCharIndex = event.charIndex;
                                    // Update global position
                                    currentCharIndex = currentCharIndex + localCharIndex;
                                }
                            };
                            
                            // Re-attach event handlers
                            currentUtterance.onstart = function() {
                                isSpeaking = true;
                                if (activePlayBtn && activePauseBtn) {
                                    activePlayBtn.classList.add('hidden');
                                    activePauseBtn.classList.remove('hidden');
                                    activePauseBtn.innerHTML = `<span>⏹️</span> Stop`;
                                }
                            };
                            
                            currentUtterance.onend = function() {
                                isSpeaking = false;
                                currentCharIndex = 0;
                                if (activePlayBtn && activePauseBtn) {
                                    activePlayBtn.classList.remove('hidden');
                                    activePauseBtn.classList.add('hidden');
                                    activePlayBtn.innerHTML = activePlayBtn.id === 'playGeneratedContent' 
                                        ? '<span>🔊</span> Listen to Content' 
                                        : '<span>🔊</span> Listen to Summary';
                                    activePauseBtn.innerHTML = '<span>⏸️</span> Pause';
                                }
                            };
                            
                            currentUtterance.onerror = function(event) {
                                console.log('Speech synthesis event during speed change:', event.error);
                                // Ignore errors during speed changes - they're expected
                                isSpeaking = false;
                            };
                            
                            // Continue speaking from current position with new speed
                            speechSynthesis.speak(currentUtterance);
                            
                            console.log(`✓ Speed changed to ${speedLabel} (${newSpeed}x) - Continuing from current position`);
                        }, 100);
                        
                        showAlert(`🎚️ Speed changed to ${speedLabel} (${newSpeed}x) - Continuing...`, 'success');
                    }
                } catch (error) {
                    console.error('Error changing speed:', error);
                    showAlert(`Speed will apply on next playback: ${speedLabel}`, 'success');
                }
            } else {
                // Not currently playing - just show confirmation for next play
                showAlert(`✓ Speed set to ${speedLabel} (${newSpeed}x) for next playback`, 'success');
            }
        });
    }
}

// Content Generation
async function handleGenerate() {
    // Stop any playing speech before generating new content
    if (isSpeaking || speechSynthesis.speaking) {
        isIntentionalStop = true;
        speechSynthesis.cancel();
        isSpeaking = false;
        setTimeout(() => { isIntentionalStop = false; }, 200);
    }
    
    const promptTextarea = document.getElementById('generatePrompt');
    const prompt = promptTextarea.value.trim();
    const contentType = document.getElementById('contentType').value;
    const tone = document.getElementById('tone').value;
    const length = document.getElementById('length').value;
    
    if (!prompt) {
        showAlert('Please enter a prompt', 'error');
        return;
    }
    
    // Smart language detection
    const finalLanguage = detectLanguageFromPrompt(prompt);
    
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
                length,
                language: finalLanguage
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            resultContent.textContent = data.content;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Detect actual language of generated content
            const hasHindiInResult = /[\u0900-\u097F]/.test(data.content);
            const actualLanguage = hasHindiInResult ? 'Hindi (हिंदी)' : 'English';
            
            showAlert(`✨ Content generated in ${actualLanguage}! Click "Listen to Content" to hear it.`, 'success');
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

// Smart Language Detection Function
function detectLanguageFromPrompt(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // First priority: Check for Hindi/Devanagari characters
    const hasHindiChars = /[\u0900-\u097F]/.test(prompt);
    if (hasHindiChars) {
        return 'hi';
    }
    
    // Second priority: Check if user explicitly asks for Hindi content
    const hindiExplicitKeywords = [
        'hindi me', 'hindi mein', 'in hindi', 'hindi language',
        'हिंदी में', 'हिन्दी में'
    ];
    
    for (let keyword of hindiExplicitKeywords) {
        if (lowerPrompt.includes(keyword)) {
            return 'hi';
        }
    }
    
    // Third priority: Check if user explicitly asks for English content
    const englishKeywords = [
        'in english', 'english me', 'english mein', 'english language'
    ];
    
    for (let keyword of englishKeywords) {
        if (lowerPrompt.includes(keyword)) {
            return 'en';
        }
    }
    
    // Fourth priority: Check for specific Hinglish patterns (WHOLE WORDS ONLY)
    // Use word boundaries to avoid false matches like "collage" matching "kaha"
    const hinglishPatterns = [
        /\bhindu\b/, /\bhindi\b/, /\bkya\b/, /\bhai\b/, /\bhain\b/, 
        /\bkar\b/, /\bkaro\b/, /\bkaru\b/, /\bbanao\b/, /\bbanaye\b/,
        /\blikhao\b/, /\blikho\b/, /\bbatao\b/, /\bbataiye\b/, 
        /\bkaise\b/, /\bkaisa\b/, /\bkahani\b/, /\bkuch\b/,
        /\bmein\b/, /\bmujhe\b/, /\btumhara\b/, /\bhumara\b/,
        /\bapna\b/, /\bmera\b/, /\btera\b/, /\bwala\b/, /\bwali\b/, /\bwale\b/
    ];
    
    let hinglishCount = 0;
    
    for (let pattern of hinglishPatterns) {
        if (pattern.test(lowerPrompt)) {
            hinglishCount++;
        }
    }
    
    // Need at least 2 strong Hinglish indicators to treat as Hindi
    if (hinglishCount >= 2) {
        return 'hi';
    }
    
    // Check for single strong Hindi indicator (like just "hindi" word)
    if (/\bhindi\b/.test(lowerPrompt)) {
        return 'hi';
    }
    
    // Default to English for everything else
    return 'en';
}

// Content Summarization
async function handleSummarize() {
    // Stop any playing speech before summarizing new content
    if (isSpeaking || speechSynthesis.speaking) {
        isIntentionalStop = true;
        speechSynthesis.cancel();
        isSpeaking = false;
        setTimeout(() => { isIntentionalStop = false; }, 200);
    }
    
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
    
    if (!text) {
        showAlert('No content to copy. Please generate content first.', 'error');
        return;
    }
    
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

// Voice Recognition Setup with Language Detection
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        // Try both languages and use the one that gets results first
        recognitionHindi = new SpeechRecognition();
        recognitionEnglish = new SpeechRecognition();
        
        // Setup for Hindi
        recognitionHindi.continuous = false;
        recognitionHindi.interimResults = false;
        recognitionHindi.lang = 'hi-IN';
        
        // Setup for English
        recognitionEnglish.continuous = false;
        recognitionEnglish.interimResults = false;
        recognitionEnglish.lang = 'en-US';
        
        // Use a unified recognition object that tries both
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Start with English as default
        
        recognition.onstart = function() {
            isListening = true;
            updateVoiceUI(true);
            showVoiceIndicator('🎤 Listening... / सुन रहा हूं...');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[event.results.length - 1][0].transcript;
            
            // Only process final results
            if (event.results[event.results.length - 1].isFinal) {
                const promptTextarea = document.getElementById('generatePrompt');
                if (promptTextarea) {
                    // Append to existing text or replace if empty
                    const currentText = promptTextarea.value.trim();
                    promptTextarea.value = currentText ? currentText + ' ' + transcript : transcript;
                    
                    // Use smart language detection
                    detectedLanguage = detectLanguageFromPrompt(promptTextarea.value);
                    
                    // Store detected language as a data attribute
                    promptTextarea.setAttribute('data-language', detectedLanguage);
                    
                    // Update language indicator
                    updateLanguageIndicator(detectedLanguage);
                    
                    // Auto-resize textarea
                    promptTextarea.style.height = 'auto';
                    promptTextarea.style.height = promptTextarea.scrollHeight + 'px';
                }
                
                const langLabel = detectedLanguage === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English';
                showAlert(`Voice input detected (${langLabel}): "${transcript}"`, 'success');
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            
            // If no-speech error and we haven't tried the other language, try Hindi
            if (event.error === 'no-speech' && recognition.lang === 'en-US') {
                recognition.lang = 'hi-IN';
                try {
                    recognition.start();
                    showVoiceIndicator('🎤 हिंदी में बोलें... / Speak in Hindi...');
                    return;
                } catch (e) {
                    console.error('Error switching to Hindi:', e);
                }
            }
            
            let errorMessage = 'Voice recognition error occurred';
            
            switch(event.error) {
                case 'network':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone permission.';
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try speaking in English or Hindi.';
                    break;
                case 'audio-capture':
                    errorMessage = 'No microphone found. Please check your audio settings.';
                    break;
            }
            
            showAlert(errorMessage, 'error');
            isListening = false;
            updateVoiceUI(false);
            hideVoiceIndicator();
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

// Update Language Indicator
function updateLanguageIndicator(language) {
    const indicator = document.getElementById('languageIndicator');
    if (indicator) {
        if (language === 'hi') {
            indicator.textContent = '🇮🇳 Hindi Detected';
            indicator.classList.remove('hidden');
        } else if (language === 'en') {
            indicator.textContent = '🇬🇧 English Detected';
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    }
}

// Clean text for speech - Remove markdown formatting
function cleanTextForSpeech(text) {
    let cleanedText = text;
    
    // Remove markdown headers (### , ## , # )
    cleanedText = cleanedText.replace(/#{1,6}\s+/g, '');
    
    // Remove markdown bold/italic (**text** or __text__ or *text* or _text_)
    cleanedText = cleanedText.replace(/\*\*\*/g, '');
    cleanedText = cleanedText.replace(/\*\*/g, '');
    cleanedText = cleanedText.replace(/__/g, '');
    cleanedText = cleanedText.replace(/\*/g, '');
    cleanedText = cleanedText.replace(/_/g, ' ');
    
    // Remove horizontal rules (--- or ***)
    cleanedText = cleanedText.replace(/^[-*]{3,}$/gm, '');
    
    // Remove multiple dots (..., ...., etc) - replace with single period
    cleanedText = cleanedText.replace(/\.{2,}/g, '.');
    
    // Remove markdown links [text](url)
    cleanedText = cleanedText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // Remove inline code backticks (`code`)
    cleanedText = cleanedText.replace(/`([^`]+)`/g, '$1');
    
    // Remove bullet points and list markers
    cleanedText = cleanedText.replace(/^[\s]*[-*+]\s+/gm, '');
    cleanedText = cleanedText.replace(/^\d+\.\s+/gm, '');
    
    // Remove excessive newlines (more than 2)
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
    
    // Remove leading/trailing whitespace from each line
    cleanedText = cleanedText.split('\n').map(line => line.trim()).join('\n');
    
    // Remove excessive spaces
    cleanedText = cleanedText.replace(/\s{2,}/g, ' ');
    
    return cleanedText.trim();
}

// Play Content with Voice - IMPROVED
function playContent(type) {
    if (isSpeaking) {
        isIntentionalStop = true;
        speechSynthesis.cancel();
        setTimeout(() => { isIntentionalStop = false; }, 100);
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
    
    // Ensure buttons are in correct initial state
    if (playBtn && pauseBtn) {
        playBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
    }
    
    // Clean text for speech (remove markdown formatting)
    const cleanedContent = cleanTextForSpeech(content);
    
    // Detect language of the content
    const hasHindiChars = /[\u0900-\u097F]/.test(content);
    const contentLanguage = hasHindiChars ? 'hi' : 'en';
    
    const voiceType = document.getElementById('voiceType').value;
    const voiceSpeed = parseFloat(document.getElementById('voiceSpeed').value);
    
    // Use cleaned content for speech
    currentUtterance = new SpeechSynthesisUtterance(cleanedContent);
    
    // Set language based on content
    currentUtterance.lang = contentLanguage === 'hi' ? 'hi-IN' : 'en-US';
    
    // Get available voices - FORCE RELOAD
    let voices = speechSynthesis.getVoices();
    
    // If no voices loaded, wait and try again
    if (voices.length === 0) {
        speechSynthesis.onvoiceschanged = function() {
            voices = speechSynthesis.getVoices();
            selectAndPlayVoice();
        };
        return;
    }
    
    selectAndPlayVoice();
    
    function selectAndPlayVoice() {
        let selectedVoice = null;
        
        // IMPROVED: Better voice selection logic
        if (contentLanguage === 'hi') {
            // For Hindi content - PRIORITY: Hindi voices over gender preference
            console.log('🇮🇳 Selecting Hindi voice...');
            
            // Get all Hindi voices first
            const hindiVoices = voices.filter(voice => 
                voice.lang.includes('hi') || 
                voice.lang.includes('HI') ||
                voice.name.toLowerCase().includes('hindi')
            );
            
            console.log(`Found ${hindiVoices.length} Hindi voices:`, hindiVoices.map(v => v.name));
            
            if (hindiVoices.length > 0) {
                // Try to match gender preference within Hindi voices
                if (voiceType === 'female') {
                    selectedVoice = hindiVoices.find(voice => {
                        const name = voice.name.toLowerCase();
                        return name.includes('female') || 
                               name.includes('woman') ||
                               name.includes('swara') ||
                               name.includes('hemant') ||
                               name.includes('kalpana');
                    });
                } else if (voiceType === 'male') {
                    selectedVoice = hindiVoices.find(voice => {
                        const name = voice.name.toLowerCase();
                        return name.includes('male') || 
                               name.includes('man') ||
                               name.includes('pankaj') ||
                               name.includes('hemant');
                    });
                }
                
                // If no gender match, use FIRST available Hindi voice (ignore gender)
                if (!selectedVoice) {
                    selectedVoice = hindiVoices[0];
                    console.log('⚠ No gender-specific Hindi voice found, using first Hindi voice');
                }
            }
            
            // Fallback: Indian English voice (better than US English for Hindi)
            if (!selectedVoice) {
                console.log('⚠ No Hindi voice available, trying Indian English...');
                selectedVoice = voices.find(voice => 
                    voice.lang.includes('en-IN') || 
                    voice.name.toLowerCase().includes('india') ||
                    voice.name.toLowerCase().includes('ravi') ||
                    voice.name.toLowerCase().includes('heera')
                );
            }
            
            // Last resort: Any available voice
            if (!selectedVoice) {
                console.warn('⚠ No Hindi or Indian voice found, using default voice for Hindi text');
                selectedVoice = voices[0];
            }
        } else {
            // For English content - STRICT gender matching
            const englishVoices = voices.filter(voice => 
                voice.lang.includes('en') && 
                !voice.lang.includes('en-IN')
            );
            
            if (voiceType === 'female') {
                // Try multiple female voice patterns
                selectedVoice = englishVoices.find(voice => {
                    const name = voice.name.toLowerCase();
                    return name.includes('female') || 
                           name.includes('woman') ||
                           name.includes('zira') ||
                           name.includes('hazel') ||
                           name.includes('susan') ||
                           name.includes('samantha') ||
                           name.includes('victoria') ||
                           name.includes('karen') ||
                           name.includes('moira') ||
                           name.includes('tessa') ||
                           name.includes('fiona') ||
                           (name.includes('microsoft') && name.includes('female'));
                });
            } else if (voiceType === 'male') {
                // Try multiple male voice patterns
                selectedVoice = englishVoices.find(voice => {
                    const name = voice.name.toLowerCase();
                    return name.includes('male') || 
                           name.includes('man') ||
                           name.includes('david') ||
                           name.includes('mark') ||
                           name.includes('daniel') ||
                           name.includes('thomas') ||
                           name.includes('alex') ||
                           name.includes('fred') ||
                           name.includes('oliver') ||
                           (name.includes('microsoft') && name.includes('male'));
                });
            }
            
            // Fallback: Use default English voice with preferred gender
            if (!selectedVoice && voiceType === 'female') {
                // Try to get any female-sounding voice (typically higher index)
                const femaleVoiceIndex = Math.floor(englishVoices.length / 2);
                selectedVoice = englishVoices[femaleVoiceIndex] || englishVoices[0];
            } else if (!selectedVoice && voiceType === 'male') {
                // Try to get any male-sounding voice (typically lower index)
                selectedVoice = englishVoices[0];
            } else if (!selectedVoice) {
                // Default: first English voice
                selectedVoice = englishVoices[0];
            }
        }
        
        // Absolute fallback: use any available voice
        if (!selectedVoice && voices.length > 0) {
            selectedVoice = voices[0];
        }
        
        if (selectedVoice) {
            currentUtterance.voice = selectedVoice;
            console.log(`✓ SELECTED VOICE: ${selectedVoice.name}`);
            console.log(`  Language: ${selectedVoice.lang}`);
            console.log(`  Requested Type: ${voiceType}`);
            console.log(`  Content Language: ${contentLanguage}`);
        } else {
            console.warn('⚠ No suitable voice found, using system default');
        }
        
        currentUtterance.rate = voiceSpeed;
        currentUtterance.pitch = 1;
        currentUtterance.volume = 1;
        
        // Store full text for position tracking
        currentSpeechText = cleanedContent;
        currentCharIndex = 0;
        speechStartTime = Date.now();
        
        // Track position using boundary event (word boundaries)
        currentUtterance.onboundary = function(event) {
            if (event.name === 'word') {
                currentCharIndex = event.charIndex;
                console.log(`Speaking at character: ${currentCharIndex} of ${currentSpeechText.length}`);
            }
        };
        
        currentUtterance.onstart = function() {
            isSpeaking = true;
            playBtn.classList.add('hidden');
            pauseBtn.classList.remove('hidden');
            pauseBtn.innerHTML = `<span>⏹️</span> Stop`;
            speechStartTime = Date.now();
            
            // Show detailed voice info
            const langLabel = contentLanguage === 'hi' ? 'हिंदी (Hindi)' : 'English';
            const voiceLabel = selectedVoice ? selectedVoice.name : 'Default';
            const requestedType = voiceType === 'female' ? 'Female' : voiceType === 'male' ? 'Male' : 'Default';
            
            showAlert(`🔊 Playing in ${langLabel} | Voice: ${voiceLabel.split(' ')[0]} (${requestedType} requested)`, 'success');
        };
        
        currentUtterance.onend = function() {
            isSpeaking = false;
            playBtn.classList.remove('hidden');
            pauseBtn.classList.add('hidden');
            playBtn.innerHTML = type === 'generate' ? '<span>🔊</span> Listen to Content' : '<span>🔊</span> Listen to Summary';
            pauseBtn.innerHTML = '<span>⏸️</span> Pause';
            currentCharIndex = 0;
        };
        
        currentUtterance.onerror = function(event) {
            console.log('Speech synthesis event:', event.error);
            
            // Filter out non-critical errors (interrupted, canceled)
            const criticalErrors = ['network', 'synthesis-failed', 'audio-busy', 'not-allowed'];
            const isCriticalError = criticalErrors.includes(event.error);
            
            // Don't show error if user intentionally stopped playback or if it's a non-critical error
            if (!isIntentionalStop && isCriticalError) {
                showAlert('Error playing audio. Your browser may not support the selected voice.', 'error');
            }
            
            isSpeaking = false;
            // Ensure play button is visible and stop button is hidden
            if (playBtn && pauseBtn) {
                playBtn.classList.remove('hidden');
                pauseBtn.classList.add('hidden');
                pauseBtn.innerHTML = '<span>⏸️</span> Pause';
                playBtn.innerHTML = type === 'generate' ? '<span>🔊</span> Listen to Content' : '<span>🔊</span> Listen to Summary';
            }
        };
        
        speechSynthesis.speak(currentUtterance);
    }
}

// Stop Content - IMPROVED (was pauseContent)
function pauseContent() {
    if (isSpeaking || speechSynthesis.speaking) {
        isIntentionalStop = true; // Mark as intentional stop to prevent error message
        
        // Cancel all speech
        try {
            speechSynthesis.cancel();
        } catch (e) {
            console.log('Cancel speech error (ignored):', e);
        }
        
        isSpeaking = false;
        
        showAlert('🛑 Playback stopped', 'success');
        
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
            btn.innerHTML = '<span>⏸️</span> Pause';
        });
        
        // Reset flag after a short delay
        setTimeout(() => {
            isIntentionalStop = false;
        }, 200);
    }
}

// Load voices when available
let voicesLoaded = false;

function loadVoices() {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0 && !voicesLoaded) {
        voicesLoaded = true;
        
        // Categorize voices for better debugging
        const hindiVoices = voices.filter(v => v.lang.includes('hi') || v.lang.includes('HI'));
        const englishVoices = voices.filter(v => v.lang.includes('en') && !v.lang.includes('en-IN'));
        const femaleVoices = voices.filter(v => {
            const name = v.name.toLowerCase();
            return name.includes('female') || name.includes('woman') || 
                   name.includes('zira') || name.includes('susan') || 
                   name.includes('hazel') || name.includes('samantha');
        });
        const maleVoices = voices.filter(v => {
            const name = v.name.toLowerCase();
            return name.includes('male') || name.includes('man') || 
                   name.includes('david') || name.includes('mark');
        });
        
        console.log('🎤 Voice System Loaded:');
        console.log(`  Total voices: ${voices.length}`);
        console.log(`  Hindi voices: ${hindiVoices.length}`, hindiVoices.map(v => v.name));
        console.log(`  English voices: ${englishVoices.length}`);
        console.log(`  Female voices detected: ${femaleVoices.length}`, femaleVoices.map(v => v.name));
        console.log(`  Male voices detected: ${maleVoices.length}`, maleVoices.map(v => v.name));
        
        // Check for Hindi voice availability
        if (hindiVoices.length > 0) {
            console.log('✓ Hindi voice available:', hindiVoices[0].name);
        } else {
            console.warn('⚠ No Hindi voice found. Hindi text will be spoken with English voice.');
        }
    }
    return voices;
}

speechSynthesis.onvoiceschanged = loadVoices;

// Try to load voices immediately
if (speechSynthesis) {
    loadVoices();
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

