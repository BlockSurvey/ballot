import React from 'react';
import { sanitizeHtml, sanitizeTextWithLinks, SANITIZE_CONFIGS } from '../../utils/htmlSanitizer';

const RichTextDisplay = ({ 
    content, 
    className = '',
    convertLinks = true,
    securityLevel = 'PERMISSIVE', // 'STRICT', 'MODERATE', or 'PERMISSIVE'
    isPlainText = false // Set to true if content is plain text, false if it's rich HTML
}) => {
    const processContent = () => {
        if (!content) return '';
        
        if (isPlainText) {
            // For plain text content, use sanitizeTextWithLinks for safe URL conversion
            return sanitizeTextWithLinks(content, convertLinks);
        } else {
            // For rich HTML content, use sanitizeHtml with appropriate security level
            const config = SANITIZE_CONFIGS[securityLevel] || {};
            return sanitizeHtml(content, config);
        }
    };

    const processedContent = processContent();

    return (
        <div className={`rich-text-display ${className}`}>
            <style jsx global>{`
                .rich-text-display {
                    color: inherit;
                    line-height: 1.6;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                .rich-text-display h1 {
                    font-size: 1.875rem;
                    line-height: 2.25rem;
                    font-weight: 700;
                    margin: 1.5rem 0 1rem 0;
                    color: inherit;
                }

                .rich-text-display h2 {
                    font-size: 1.5rem;
                    line-height: 2rem;
                    font-weight: 600;
                    margin: 1.25rem 0 0.75rem 0;
                    color: inherit;
                }

                .rich-text-display h3 {
                    font-size: 1.25rem;
                    line-height: 1.75rem;
                    font-weight: 600;
                    margin: 1rem 0 0.5rem 0;
                    color: inherit;
                }

                .rich-text-display h4 {
                    font-size: 1.125rem;
                    line-height: 1.5rem;
                    font-weight: 600;
                    margin: 0.875rem 0 0.5rem 0;
                    color: inherit;
                }

                .rich-text-display h5 {
                    font-size: 1rem;
                    line-height: 1.5rem;
                    font-weight: 600;
                    margin: 0.75rem 0 0.5rem 0;
                    color: inherit;
                }

                .rich-text-display h6 {
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    font-weight: 600;
                    margin: 0.75rem 0 0.5rem 0;
                    color: inherit;
                }

                .rich-text-display p {
                    margin: 0 !important;
                    padding: 0 !important;
                    line-height: 1.6;
                    color: inherit;
                }

                .rich-text-display p:empty + p {
                    margin-top: 0.5rem !important;
                }

                .rich-text-display ul,
                .rich-text-display ol {
                    margin: 1rem 0;
                    padding-left: 1.5rem;
                    color: inherit;
                }

                .rich-text-display li {
                    margin-bottom: 0.5rem;
                }

                .rich-text-display li:last-child {
                    margin-bottom: 0;
                }

                .rich-text-display blockquote {
                    border-left: 4px solid currentColor;
                    margin: 1.5rem 0;
                    padding: 0.5rem 0 0.5rem 1rem;
                    font-style: italic;
                    opacity: 0.8;
                    background: rgba(0, 0, 0, 0.02);
                    border-radius: 0 4px 4px 0;
                }

                .rich-text-display code {
                    background: rgba(0, 0, 0, 0.1);
                    padding: 0.125rem 0.25rem;
                    border-radius: 3px;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 0.875em;
                }

                .rich-text-display pre {
                    background: rgba(0, 0, 0, 0.05);
                    padding: 1rem;
                    border-radius: 6px;
                    overflow-x: auto;
                    margin: 1rem 0;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                }

                .rich-text-display pre code {
                    background: none;
                    padding: 0;
                    border-radius: 0;
                    font-size: 0.875rem;
                }

                .rich-text-display a {
                    color: #3b82f6;
                    text-decoration: underline;
                    transition: color 0.2s ease;
                }

                .rich-text-display a:hover {
                    color: #2563eb;
                    text-decoration-color: #2563eb;
                }

                .rich-text-display a:visited {
                    color: #7c3aed;
                }

                .rich-text-display strong,
                .rich-text-display b {
                    font-weight: 600;
                }

                .rich-text-display em,
                .rich-text-display i {
                    font-style: italic;
                }

                .rich-text-display u {
                    text-decoration: underline;
                }

                .rich-text-display s,
                .rich-text-display strike {
                    text-decoration: line-through;
                    opacity: 0.7;
                }

                .rich-text-display sub {
                    font-size: 0.75em;
                    vertical-align: sub;
                }

                .rich-text-display sup {
                    font-size: 0.75em;
                    vertical-align: super;
                }

                /* Text alignment */
                .rich-text-display .ql-align-center {
                    text-align: center;
                }

                .rich-text-display .ql-align-right {
                    text-align: right;
                }

                .rich-text-display .ql-align-justify {
                    text-align: justify;
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .rich-text-display h1 {
                        font-size: 1.5rem;
                        line-height: 2rem;
                        margin: 1.25rem 0 0.75rem 0;
                    }

                    .rich-text-display h2 {
                        font-size: 1.25rem;
                        line-height: 1.75rem;
                        margin: 1rem 0 0.5rem 0;
                    }

                    .rich-text-display h3 {
                        font-size: 1.125rem;
                        line-height: 1.5rem;
                        margin: 0.875rem 0 0.5rem 0;
                    }

                    .rich-text-display blockquote {
                        margin: 1rem 0;
                        padding: 0.5rem 0 0.5rem 0.75rem;
                    }

                    .rich-text-display pre {
                        padding: 0.75rem;
                        margin: 0.75rem 0;
                        font-size: 0.8125rem;
                    }
                }

                /* Print styles */
                @media print {
                    .rich-text-display a {
                        text-decoration: underline;
                        color: inherit;
                    }

                    .rich-text-display a::after {
                        content: " (" attr(href) ")";
                        font-size: 0.8em;
                        color: #666;
                    }
                }
            `}</style>
            
            {processedContent ? (
                <div 
                    dangerouslySetInnerHTML={{ 
                        __html: processedContent 
                    }}
                />
            ) : null}
        </div>
    );
};

export default RichTextDisplay;