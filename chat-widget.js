/**
 * Sona ChatBot Widget - Reusable Chat Script
 * Can be embedded in any application to add a chatbot interface
 * 
 * Usage:
 * 1. Include the CSS: <link rel="stylesheet" href="chat-widget.css">
 * 2. Include the JS: <script src="chat-widget.js"></script>
 * 3. Initialize: SonaChatWidget.init({ apiUrl: 'http://localhost:8000/api/chat' })
 */

const SonaChatWidget = (function() {
    // Default configuration
    let config = {
        apiUrl: 'https://history-sonachatbot.onrender.com/api/chat',
        position: 'bottom-right',
        primaryColor: '#4a90e2',
        title: 'Sona College Assistant',
        subtitle: 'AI Powered',
        welcomeMessage: 'Hello! How can I help you today?',
        placeholder: 'Type your message...',
        onOpen: null,
        onClose: null,
        onMessage: null
    };

    // DOM elements
    let widget = null;
    let toggleBtn = null;
    let chatWindow = null;
    let messagesContainer = null;
    let inputArea = null;
    let chatInput = null;
    let sendBtn = null;
    let typingIndicator = null;

    // State
    let isOpen = false;
    let isLoading = false;

    /**
     * Initialize the chat widget
     * @param {Object} userConfig - Custom configuration options
     */
    function init(userConfig) {
        // Merge user config with defaults
        config = { ...config, ...userConfig };

        // Apply custom primary color
        if (config.primaryColor) {
            document.documentElement.style.setProperty('--chat-primary-color', config.primaryColor);
            document.documentElement.style.setProperty('--chat-primary-hover', adjustColor(config.primaryColor, -20));
        }

        // Create the widget HTML
        createWidget();

        // Add event listeners
        attachEventListeners();
    }

    /**
     * Create the widget DOM elements
     */
    function createWidget() {
        widget = document.createElement('div');
        widget.className = 'sona-chat-widget';
        widget.innerHTML = `
            <div class="sona-chat-window">
                <div class="sona-chat-header">
                    <div class="sona-chat-header-title">
                        <h3>${config.title}</h3>
                        <span>${config.subtitle}</span>
                    </div>
                    <button class="sona-chat-close-btn" aria-label="Close chat">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="sona-chat-messages">
                    <div class="sona-welcome-message">
                        <h4>${config.title}</h4>
                        <p>${config.welcomeMessage}</p>
                    </div>
                    <div class="sona-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <div class="sona-chat-input-area">
                    <textarea class="sona-chat-input" placeholder="${config.placeholder}" rows="1"></textarea>
                    <button class="sona-chat-send-btn" aria-label="Send message">
                        <svg viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button class="sona-chat-toggle-btn" aria-label="Open chat">
                <svg viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
            </button>
        `;

        document.body.appendChild(widget);

        // Cache DOM references
        toggleBtn = widget.querySelector('.sona-chat-toggle-btn');
        chatWindow = widget.querySelector('.sona-chat-window');
        messagesContainer = widget.querySelector('.sona-chat-messages');
        chatInput = widget.querySelector('.sona-chat-input');
        sendBtn = widget.querySelector('.sona-chat-send-btn');
        typingIndicator = widget.querySelector('.sona-typing-indicator');

        // Position the widget
        if (config.position === 'bottom-left') {
            widget.style.right = 'auto';
            widget.style.left = '20px';
        }
    }

    /**
     * Attach event listeners to the widget
     */
    function attachEventListeners() {
        // Toggle button click
        toggleBtn.addEventListener('click', toggleChat);

        // Close button click
        const closeBtn = chatWindow.querySelector('.sona-chat-close-btn');
        closeBtn.addEventListener('click', closeChat);

        // Send button click
        sendBtn.addEventListener('click', sendMessage);

        // Enter key to send message
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    /**
     * Toggle chat window open/close
     */
    function toggleChat() {
        if (isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }

    /**
     * Open the chat window
     */
    function openChat() {
        isOpen = true;
        chatWindow.classList.add('open');
        toggleBtn.classList.add('active');
        chatInput.focus();

        if (config.onOpen && typeof config.onOpen === 'function') {
            config.onOpen();
        }
    }

    /**
     * Close the chat window
     */
    function closeChat() {
        isOpen = false;
        chatWindow.classList.remove('open');
        toggleBtn.classList.remove('active');

        if (config.onClose && typeof config.onClose === 'function') {
            config.onClose();
        }
    }

    /**
     * Send a message to the API
     */
    async function sendMessage() {
        const message = chatInput.value.trim();
        
        if (!message || isLoading) {
            return;
        }

        // Add user message to chat
        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Show typing indicator
        showTyping(true);

        // Call the callback or API
        try {
            const response = await getAIResponse(message);
            addMessage(response, 'bot');
        } catch (error) {
            addMessage('Sorry, I encountered an error. Please try again.', 'bot', true);
            console.error('Chat error:', error);
        }

        showTyping(false);

        if (config.onMessage && typeof config.onMessage === 'function') {
            config.onMessage(message);
        }
    }

    /**
     * Get AI response from API
     * @param {string} message - User message
     * @returns {Promise<string>} - AI response
     */
    async function getAIResponse(message) {
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.response || data.message || data.result || 'No response received';
    }

    /**
     * Add a message to the chat
     * @param {string} text - Message text
     * @param {string} type - 'user' or 'bot'
     * @param {boolean} isError - Whether this is an error message
     */
    function addMessage(text, type, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `sona-message sona-message-${type}`;
        if (isError) {
            messageDiv.classList.add('sona-message-error');
        }
        messageDiv.textContent = text;

        // Insert before typing indicator
        messagesContainer.insertBefore(messageDiv, typingIndicator);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Show/hide typing indicator
     * @param {boolean} show - Whether to show the indicator
     */
    function showTyping(show) {
        if (show) {
            typingIndicator.classList.add('show');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            typingIndicator.classList.remove('show');
        }
    }

    /**
     * Adjust a hex color brightness
     * @param {string} color - Hex color
     * @param {number} amount - Amount to adjust (-255 to 255)
     * @returns {string} - Adjusted hex color
     */
    function adjustColor(color, amount) {
        let usePound = false;
        
        if (color[0] === '#') {
            color = color.slice(1);
            usePound = true;
        }
        
        let num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        
        let b = ((num >> 8) & 0x00FF) + amount;
        
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        
        let g = (num & 0x0000FF) + amount;
        
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        
        return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    /**
     * Open the chat programmatically
     */
    function open() {
        openChat();
    }

    /**
     * Close the chat programmatically
     */
    function close() {
        closeChat();
    }

    /**
     * Send a message programmatically
     * @param {string} message - Message to send
     */
    function send(message) {
        chatInput.value = message;
        sendMessage();
    }

    /**
     * Destroy the widget
     */
    function destroy() {
        if (widget && widget.parentNode) {
            widget.parentNode.removeChild(widget);
        }
        widget = null;
    }

    // Public API
    return {
        init: init,
        open: open,
        close: close,
        send: send,
        destroy: destroy
    };
})();

// Auto-initialize if data attributes are present
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
} else {
    autoInit();
}

function autoInit() {
    const widgetContainer = document.querySelector('[data-sona-chat]');
    if (widgetContainer) {
        const config = {};
        if (widgetContainer.dataset.apiUrl) config.apiUrl = widgetContainer.dataset.apiUrl;
        if (widgetContainer.dataset.title) config.title = widgetContainer.dataset.title;
        if (widgetContainer.dataset.primaryColor) config.primaryColor = widgetContainer.dataset.primaryColor;
        SonaChatWidget.init(config);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SonaChatWidget;
}
