const BASE_URL = "http://127.0.0.1:5000/";

let currentPage = 0; // Default to page 0

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const paginationDiv = document.getElementById('pagination'); // Get pagination div
    const query = searchInput.value.trim();

    if (!query) {
        resultsDiv.innerHTML = '<p class="error">Please enter a search query</p>';
        return;
    }

    currentPage = 0; // Reset page to 0 for a new query

    try {
        resultsDiv.innerHTML = '<p class="loading">Searching...</p>';

        const response = await fetch(`${BASE_URL}/search/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                formInput: query,
                pagenum: currentPage, // Always start from page 0 for a new search
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        displayResults(data); // Display results
        updatePaginationDisplay(); // Update current page display

        // Show the pagination div after the first search
        paginationDiv.style.display = 'flex'; // Show pagination controls

    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = '<p class="error">Error performing search</p>';
    }
}

async function getDocument(docId) {
    try {
        const response = await fetch(`${BASE_URL}/doc/${docId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Check if we have complete document content
        if (data && data.doc) {
            displayDocument(data);
        } else {
            throw new Error('Document content is incomplete or missing');
        }

    } catch (error) {
        console.error('Error fetching document:', error);
        alert('Error loading document. Please try again.');
    }
}


function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    
    if (!data.docs || data.docs.length === 0) {
        resultsDiv.innerHTML = '<p class="no-results">No results found</p>';
        return;
    }

    const html = data.docs.map(doc => `
        <div class="result-item">
            <h3>${doc.title || 'Untitled'}</h3>
            <div class="fragment">${doc.headline || ''}</div>
            <div class="meta-info">
                <span class="source">${doc.docsource || ''}</span>
                <span class="date">${doc.posted_date || ''}</span>
            </div>
            <button onclick="getDocument('${doc.tid}')" class="view-doc-btn">View Document</button>
        </div>
    `).join('');

    resultsDiv.innerHTML = html;
}

// Enhanced displayDocument function
function displayDocument(doc) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Enhanced modal structure with better content handling
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${doc.title || 'Document'}</h2>
                <div class="header-controls">
                    <button class="download-btn" onclick="downloadDocument('${doc.title}', this)">
                        <span class="download-icon">📥</span> Download PDF
                    </button>
                    <span class="close" onclick="this.closest('.modal').remove()">✖</span>
                </div>
            </div>
            <div class="document-content">
                ${sanitizeAndFormatContent(doc.doc || 'No content available')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Helper function to sanitize and format content
function sanitizeAndFormatContent(content) {
    // Remove any potentially harmful HTML/scripts
    let sanitized = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    // Preserve paragraphs and basic formatting
    sanitized = sanitized
        .replace(/\n/g, '<br>')
        .replace(/<p>/g, '<p class="doc-paragraph">');
    
    return sanitized;
}


async function downloadDocument(title, buttonElement) {
    try {
        // Save original button text
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '⌛ Generating PDF...';
        buttonElement.disabled = true;

        const content = document.querySelector('.modal .document-content');

        // Clone the document-content for PDF generation to capture full content
        const contentClone = content.cloneNode(true);

        // Create a temporary container for capturing the entire div
        const tempContainer = document.createElement('div');
        tempContainer.style.width = '100%';
        tempContainer.appendChild(contentClone);

        // Append the temporary container to the body to ensure it's rendered
        document.body.appendChild(tempContainer);

        // Configure PDF options
        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5], // Inches: [top, right, bottom, left]
            filename: `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2, // Higher scale for better quality
                useCORS: true, // Allow loading of cross-origin images
                letterRendering: true,
            },
            jsPDF: {
                unit: 'in',
                format: 'a4',
                orientation: 'portrait',
            },
        };

        // Generate and download the PDF
        await html2pdf().set(opt).from(tempContainer).save();

        // Restore button state
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;

        // Clean up temporary container
        tempContainer.remove();
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
    }
}


// Add event listener for Enter key in search input
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});



function updatePaginationDisplay() {
        document.getElementById('currentPage').innerText = `Page ${currentPage}`;
        document.getElementById('prevButton').disabled = currentPage === 0; // Disable "Previous" button if on page 0
    }

//see 
document.getElementById('nextButton').addEventListener('click', async () => {
            const query = document.getElementById('searchInput').value;
            if (!query) {
                alert('Please enter a search query!');
                return;
            }
        
            currentPage++; // Increment to the next page
            await fetchResults(query, currentPage);
        });
        
document.getElementById('prevButton').addEventListener('click', async () => {
            const query = document.getElementById('searchInput').value;
            if (!query) {
                alert('Please enter a search query!');
                return;
            }
        
            if (currentPage > 0) {
                currentPage--; // Decrement to the previous page (minimum: 0)
                await fetchResults(query, currentPage);
            }
        });
        

async function fetchResults(query, page) {
                const resultsDiv = document.getElementById('results');
            
                try {
                    resultsDiv.innerHTML = '<p class="loading">Loading results...</p>';
            
                    const response = await fetch(`${BASE_URL}/search/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ formInput: query, pagenum: page }),
                    });
            
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
            
                    const data = await response.json();
            
                    displayResults(data); // Display fetched results
                    updatePaginationDisplay(); // Update pagination UI
                } catch (error) {
                    console.error('Fetch results error:', error);
                    resultsDiv.innerHTML = '<p class="error">Error loading results</p>';
                }
            }
            