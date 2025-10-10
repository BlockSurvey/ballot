import React, { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
});

const RichTextEditor = ({ 
    value, 
    onChange, 
    placeholder = "Enter description...", 
    className = '',
    error = false,
    disabled = false
}) => {
    const quillRef = useRef(null);

    // Quill modules configuration
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['link'],
                ['blockquote', 'code-block'],
                ['clean']
            ],
        },
        clipboard: {
            matchVisual: false,
        }
    }), []);

    // Quill formats configuration
    const formats = [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link', 'color', 'background',
        'align', 'script',
        'code-block', 'direction'
    ];

    // Handle editor change
    const handleChange = (content, delta, source, editor) => {
        // Get HTML content
        const htmlContent = editor.getHTML();
        
        // Get plain text content (for validation)
        const textContent = editor.getText();
        
        // Call parent onChange with both HTML and text
        if (onChange) {
            onChange(htmlContent, textContent);
        }
    };

    const editorStyle = {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: error ? '2px solid #ef4444' : '1px solid #e5e7eb',
        transition: 'border-color 0.2s ease-in-out',
        minHeight: '120px',
    };

    const toolbarStyle = {
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
    };

    return (
        <div className={`rich-text-editor ${className}`}>
            <style jsx global>{`
                /* Rich text editor wrapper */
                .rich-text-editor {
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    transition: all 0.2s ease;
                    overflow: hidden;
                }

                /* Toolbar styles */
                .rich-text-editor .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid var(--color-border) !important;
                    border-radius: 0 !important;
                    background-color: var(--color-surface, #f9fafb);
                    padding: var(--space-3, 12px);
                }

                /* Container styles */
                .rich-text-editor .ql-container {
                    border: none !important;
                    border-radius: 0 !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                    font-size: 16px;
                    line-height: 1.5;
                    background: var(--color-background, #ffffff);
                    outline: none !important;
                }

                /* Editor styles */
                .rich-text-editor .ql-editor {
                    min-height: 120px;
                    padding: var(--space-3, 12px) var(--space-4, 16px);
                    color: var(--color-primary, #1f2937);
                    transition: all 0.2s ease;
                    outline: none !important;
                }

                /* Placeholder styles */
                .rich-text-editor .ql-editor.ql-blank::before {
                    color: var(--color-tertiary, #9ca3af);
                    font-style: normal;
                    left: 16px !important;
                    right: 16px !important;
                    font-size: 16px;
                    line-height: 1.6;
                }

                /* Toolbar button states */
                .rich-text-editor .ql-toolbar .ql-picker-label:hover,
                .rich-text-editor .ql-toolbar .ql-picker-label.ql-active,
                .rich-text-editor .ql-toolbar button:hover,
                .rich-text-editor .ql-toolbar button.ql-active {
                    color: #000000;
                }

                .rich-text-editor .ql-toolbar button:hover .ql-stroke,
                .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
                    stroke: #000000;
                }

                .rich-text-editor .ql-toolbar button:hover .ql-fill,
                .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
                    fill: #000000;
                }

                /* Error states */
                .rich-text-editor.error {
                    border-color: #ef4444 !important;
                }

                .rich-text-editor.error:focus-within {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                }

                /* Typography */
                .rich-text-editor .ql-editor h1 {
                    font-size: 1.875rem;
                    line-height: 2.25rem;
                    font-weight: 700;
                    margin: 1rem 0 0.5rem 0;
                }

                .rich-text-editor .ql-editor h2 {
                    font-size: 1.5rem;
                    line-height: 2rem;
                    font-weight: 600;
                    margin: 0.875rem 0 0.5rem 0;
                }

                .rich-text-editor .ql-editor h3 {
                    font-size: 1.25rem;
                    line-height: 1.75rem;
                    font-weight: 600;
                    margin: 0.75rem 0 0.5rem 0;
                }

                /* Paragraph spacing */
                .rich-text-editor .ql-editor p {
                    margin: 0 !important;
                    padding: 0 !important;
                    line-height: 1.6;
                }

                .rich-text-editor .ql-editor p:empty + p {
                    margin-top: 0.5rem !important;
                }

                /* Lists */
                .rich-text-editor .ql-editor ul,
                .rich-text-editor .ql-editor ol {
                    margin: 0.75rem 0;
                    padding-left: 1.5rem;
                }

                .rich-text-editor .ql-editor li {
                    margin-bottom: 0.25rem;
                }

                /* Blockquote */
                .rich-text-editor .ql-editor blockquote {
                    border-left: 4px solid #e5e7eb;
                    margin: 1rem 0;
                    padding-left: 1rem;
                    color: #6b7280;
                    font-style: italic;
                }

                /* Links */
                .rich-text-editor .ql-editor a {
                    color: #3b82f6;
                    text-decoration: underline;
                }

                .rich-text-editor .ql-editor a:hover {
                    color: #2563eb;
                }

                /* Mobile responsive */
                @media (max-width: 768px) {
                    .rich-text-editor .ql-toolbar {
                        padding: 8px;
                    }

                    .rich-text-editor .ql-editor {
                        min-height: 100px;
                        padding: 12px;
                    }

                    .rich-text-editor .ql-toolbar .ql-formats {
                        margin-right: 8px;
                    }
                }

                /* Focus states */
                .rich-text-editor:focus-within {
                    border-color: var(--color-primary) !important;
                    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1) !important;
                }

                /* Clean borders */
                .rich-text-editor .ql-snow {
                    border: none !important;
                }

                .rich-text-editor .ql-snow .ql-tooltip {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                }

                /* Disabled state */
                .rich-text-editor.disabled .ql-toolbar {
                    pointer-events: none;
                    opacity: 0.6;
                    background-color: #f3f4f6;
                }

                .rich-text-editor.disabled .ql-editor {
                    background-color: #f9fafb;
                    color: #9ca3af;
                    cursor: not-allowed;
                }
            `}</style>
            
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value || ''}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                readOnly={disabled}
                className={`${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
            />
        </div>
    );
};

// Helper function to strip HTML tags for plain text
export const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
};

// Helper function to check if content is empty
export const isEditorEmpty = (content) => {
    if (!content) return true;
    const textContent = stripHtmlTags(content);
    return textContent.length === 0;
};

export default RichTextEditor;