// Server-side compatible sanitization
let DOMPurify;
let isClientSide = false;

if (typeof window !== 'undefined') {
    // Client-side: dynamically import DOMPurify
    isClientSide = true;
    DOMPurify = require('dompurify');
}

/**
 * Fallback server-side sanitization using regex patterns
 * This is a basic fallback for server-side rendering
 */
const serverSideSanitize = (html, config = {}) => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    let sanitized = html;
    
    // Remove script tags and their content
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<script[^>]*\/?>/gi, '');
    
    // Remove dangerous elements
    const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option', 'meta', 'link', 'style', 'base', 'applet', 'frame', 'frameset', 'noframes', 'noscript'];
    dangerousTags.forEach(tag => {
        const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
        sanitized = sanitized.replace(regex, '');
        const selfClosingRegex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
        sanitized = sanitized.replace(selfClosingRegex, '');
    });
    
    // Remove all event handlers (on* attributes)
    sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
    
    // Remove javascript: and data: URLs
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
    sanitized = sanitized.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
    
    // Additional cleanup for javascript: and data: without quotes
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');
    
    return sanitized;
};

/**
 * Safely sanitizes HTML content to prevent XSS attacks while preserving legitimate formatting
 * @param {string} html - The HTML content to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized HTML content
 */
export const sanitizeHtml = (html, options = {}) => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    // Default configuration - allows most formatting tags but blocks dangerous elements
    const defaultConfig = {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote', 'code', 'pre',
            'a', 'sub', 'sup',
            'div', 'span'
        ],
        ALLOWED_ATTR: [
            'href', 'target', 'rel',
            'class', // Allow class for styling (Quill editor classes)
            'style' // Allow limited inline styles
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        // Block all script-related attributes and events
        FORBID_ATTR: [
            'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
            'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
            'onchange', 'onsubmit', 'onreset', 'onselect', 'onresize',
            'onscroll', 'onunload', 'onbeforeunload', 'ondrag', 'ondrop',
            'ondragstart', 'ondragend', 'ondragover', 'ondragenter',
            'ondragleave', 'oncontextmenu', 'onwheel', 'ontouchstart',
            'ontouchend', 'ontouchmove', 'ontouchcancel'
        ],
        // Remove script tags entirely
        FORBID_TAGS: [
            'script', 'object', 'embed', 'applet', 'iframe', 'frame',
            'frameset', 'noframes', 'noscript', 'form', 'input', 'button',
            'textarea', 'select', 'option', 'meta', 'link', 'style', 'base'
        ]
    };

    // Merge with custom options
    const config = { ...defaultConfig, ...options };

    let sanitized;
    
    if (isClientSide && DOMPurify) {
        // Use DOMPurify on client-side
        sanitized = DOMPurify.sanitize(html, config);
    } else {
        // Use fallback sanitization on server-side
        sanitized = serverSideSanitize(html, config);
    }
    
    // Extra layer of protection: ensure no javascript: or data: URLs slip through
    return sanitized.replace(/javascript:/gi, '').replace(/data:/gi, '');
};

/**
 * Sanitizes plain text and converts URLs to safe links
 * @param {string} text - Plain text content
 * @param {boolean} convertLinks - Whether to convert URLs to clickable links
 * @returns {string} - Sanitized HTML content
 */
export const sanitizeTextWithLinks = (text, convertLinks = true) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // First escape HTML entities to prevent injection
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

    if (!convertLinks) {
        return escaped;
    }

    // Convert URLs to safe links with strict validation
    const urlRegex = /https?:\/\/[^\s<>\"{}|\\^`\[\]]*/gi;
    
    const withLinks = escaped.replace(urlRegex, function (url) {
        // Additional URL validation
        try {
            const urlObj = new URL(url);
            // Only allow http and https protocols
            if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
                // Escape the URL for HTML attribute use
                const safeUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
                return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            }
        } catch (e) {
            // Invalid URL, return as plain text
        }
        return url;
    });

    return withLinks;
};

/**
 * Strips all HTML tags and returns plain text
 * @param {string} html - HTML content to strip
 * @returns {string} - Plain text content
 */
export const stripHtml = (html) => {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    if (isClientSide && DOMPurify) {
        return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
    } else {
        // Server-side: simple HTML tag removal
        return html.replace(/<[^>]*>/g, '');
    }
};

/**
 * Configuration for different security levels
 */
export const SANITIZE_CONFIGS = {
    // Strictest - only basic text formatting
    STRICT: {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i'],
        ALLOWED_ATTR: []
    },
    // Moderate - includes headings and lists
    MODERATE: {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote'
        ],
        ALLOWED_ATTR: []
    },
    // Permissive - includes links and styling (default)
    PERMISSIVE: {
        // Uses the default configuration from sanitizeHtml function
    }
};

export default sanitizeHtml;