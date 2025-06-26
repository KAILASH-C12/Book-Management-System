// API Base URL
const API_BASE = '/api/books';

// Global variables
let books = [];
let currentBookId = null;
let isEditing = false;
let currentView = 'grid';

// DOM Elements
const booksGrid = document.getElementById('booksGrid');
const bookModal = document.getElementById('bookModal');
const bookDetailsModal = document.getElementById('bookDetailsModal');
const bookForm = document.getElementById('bookForm');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = document.getElementById('submitBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const genreFilter = document.getElementById('genreFilter');
const sortSelect = document.getElementById('sortSelect');
const bookCount = document.getElementById('bookCount');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const toastContainer = document.getElementById('toastContainer');
const confirmDialog = document.getElementById('confirmDialog');
const gridViewBtn = document.getElementById('gridView');
const listViewBtn = document.getElementById('listView');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');

// Stats elements
const totalBooksEl = document.getElementById('totalBooks');
const totalAuthorsEl = document.getElementById('totalAuthors');
const totalGenresEl = document.getElementById('totalGenres');

// Character counter
const descriptionTextarea = document.getElementById('description');
const charCount = document.getElementById('charCount');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    setupEventListeners();
    setupFormValidation();
});

// Setup event listeners
function setupEventListeners() {
    // Modal controls
    document.getElementById('addBookBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('closeDetailsModal').addEventListener('click', closeDetailsModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Form submission
    bookForm.addEventListener('submit', handleFormSubmit);
    
    // Search and filters
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    clearSearchBtn.addEventListener('click', clearSearch);
    genreFilter.addEventListener('change', handleSearch);
    sortSelect.addEventListener('change', handleSearch);
    
    // View toggle
    gridViewBtn.addEventListener('click', () => setView('grid'));
    listViewBtn.addEventListener('click', () => setView('list'));
    
    // Refresh and export
    refreshBtn.addEventListener('click', loadBooks);
    exportBtn.addEventListener('click', exportBooks);
    
    // Character counter
    descriptionTextarea.addEventListener('input', updateCharCounter);
    
    // Confirmation dialog
    document.getElementById('confirmCancel').addEventListener('click', closeConfirmDialog);
    document.getElementById('confirmOk').addEventListener('click', confirmAction);
    
    // Close modals when clicking backdrop
    [bookModal, bookDetailsModal, confirmDialog].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
                if (modal === bookModal) closeModal();
                else if (modal === bookDetailsModal) closeDetailsModal();
                else if (modal === confirmDialog) closeConfirmDialog();
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (bookModal.style.display === 'block') closeModal();
            else if (bookDetailsModal.style.display === 'block') closeDetailsModal();
            else if (confirmDialog.style.display === 'block') closeConfirmDialog();
        }
    });
}

// Setup form validation
function setupFormValidation() {
    const inputs = bookForm.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function validateField(e) {
    const field = e.target;
    const feedback = field.parentNode.querySelector('.input-feedback');
    
    if (!field.value.trim()) {
        showFieldError(field, `${field.labels[0].textContent.replace('*', '').trim()} is required`);
        return false;
    }
    
    // Specific validations
    if (field.name === 'publishedYear') {
        const year = parseInt(field.value);
        const currentYear = new Date().getFullYear();
        if (year < 1000 || year > currentYear) {
            showFieldError(field, `Year must be between 1000 and ${currentYear}`);
            return false;
        }
    }
    
    if (field.name === 'isbn') {
        const isbn = field.value.replace(/[-\s]/g, '');
        if (isbn.length !== 10 && isbn.length !== 13) {
            showFieldError(field, 'ISBN must be 10 or 13 digits');
            return false;
        }
    }
    
    showFieldSuccess(field, 'Looks good!');
    return true;
}

function showFieldError(field, message) {
    const feedback = field.parentNode.querySelector('.input-feedback');
    feedback.textContent = message;
    feedback.className = 'input-feedback error';
    field.style.borderColor = '#dc2626';
}

function showFieldSuccess(field, message) {
    const feedback = field.parentNode.querySelector('.input-feedback');
    feedback.textContent = message;
    feedback.className = 'input-feedback success';
    field.style.borderColor = '#10b981';
}

function clearFieldError(e) {
    const field = e.target;
    const feedback = field.parentNode.querySelector('.input-feedback');
    feedback.textContent = '';
    feedback.className = 'input-feedback';
    field.style.borderColor = '#e2e8f0';
}

function updateCharCounter() {
    const count = descriptionTextarea.value.length;
    charCount.textContent = count;
    
    if (count > 500) {
        charCount.parentNode.style.color = '#dc2626';
        descriptionTextarea.style.borderColor = '#dc2626';
    } else {
        charCount.parentNode.style.color = '#718096';
        descriptionTextarea.style.borderColor = '#e2e8f0';
    }
}

// Search functionality
function handleSearchInput() {
    const hasValue = searchInput.value.trim().length > 0;
    clearSearchBtn.style.display = hasValue ? 'block' : 'none';
}

function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    handleSearch();
}

// View toggle
function setView(view) {
    currentView = view;
    
    if (view === 'grid') {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        booksGrid.classList.remove('list-view');
    } else {
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        booksGrid.classList.add('list-view');
    }
}

// Export functionality
function exportBooks() {
    if (books.length === 0) {
        showToast('No Data', 'No books to export', 'warning');
        return;
    }
    
    const csvContent = convertToCSV(books);
    downloadCSV(csvContent, 'books-export.csv');
    showToast('Export Complete', `Successfully exported ${books.length} books`, 'success');
}

function convertToCSV(data) {
    const headers = ['Title', 'Author', 'ISBN', 'Published Year', 'Genre', 'Description'];
    const csvRows = [headers.join(',')];
    
    data.forEach(book => {
        const row = [
            `"${book.title}"`,
            `"${book.author}"`,
            `"${book.isbn}"`,
            book.publishedYear,
            `"${book.genre}"`,
            `"${book.description || ''}"`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// API Functions
async function fetchBooks(queryParams = '') {
    try {
        const response = await fetch(`${API_BASE}${queryParams}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch books');
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching books:', error);
        showToast('Error', 'Failed to fetch books', 'error');
        return { success: false, data: [] };
    }
}

async function createBook(bookData) {
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookData),
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to create book');
        }
        
        return data;
    } catch (error) {
        console.error('Error creating book:', error);
        throw error;
    }
}

async function updateBook(id, bookData) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookData),
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to update book');
        }
        
        return data;
    } catch (error) {
        console.error('Error updating book:', error);
        throw error;
    }
}

async function deleteBook(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete book');
        }
        
        return data;
    } catch (error) {
        console.error('Error deleting book:', error);
        throw error;
    }
}

// UI Functions
async function loadBooks() {
    showLoading();
    const result = await fetchBooks();
    hideLoading();
    
    if (result.success) {
        books = result.data;
        renderBooks(books);
        updateBookCount(result.count);
        updateStats(books);
    }
}

async function handleSearch() {
    const search = searchInput.value.trim();
    const genre = genreFilter.value;
    const sort = sortSelect.value;
    
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (genre && genre !== 'all') queryParams.append('genre', genre);
    if (sort) queryParams.append('sort', sort);
    
    const queryString = queryParams.toString();
    showLoading();
    const result = await fetchBooks(queryString ? `?${queryString}` : '');
    hideLoading();
    
    if (result.success) {
        renderBooks(result.data);
        updateBookCount(result.count);
    }
}

function renderBooks(booksToRender) {
    if (booksToRender.length === 0) {
        booksGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    booksGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    booksGrid.innerHTML = booksToRender.map(book => `
        <div class="book-card" onclick="viewBookDetails(${book.id})">
            <div class="book-content">
                <div class="book-info">
                    <div class="book-header">
                        <h3 class="book-title">${escapeHtml(book.title)}</h3>
                        <p class="book-author">${escapeHtml(book.author)}</p>
                    </div>
                    
                    <div class="book-details">
                        <div class="book-detail">
                            <span class="book-detail-label">📚 ISBN</span>
                            <span class="book-detail-value">${escapeHtml(book.isbn)}</span>
                        </div>
                        <div class="book-detail">
                            <span class="book-detail-label">📅 Year</span>
                            <span class="book-detail-value">${book.publishedYear}</span>
                        </div>
                    </div>
                    
                    <div class="book-genre">${escapeHtml(book.genre)}</div>
                    
                    ${book.description ? `<p class="book-description">${escapeHtml(book.description)}</p>` : ''}
                </div>
                
                <div class="book-actions" onclick="event.stopPropagation()">
                    <button class="view-btn" onclick="viewBookDetails(${book.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                    <button class="edit-btn" onclick="editBook(${book.id})" title="Edit Book">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="delete-btn" onclick="confirmDeleteBook(${book.id}, '${escapeHtml(book.title)}')" title="Delete Book">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateBookCount(count) {
    bookCount.textContent = `${count} ${count === 1 ? 'book' : 'books'}`;
}

function updateStats(booksData) {
    const totalBooks = booksData.length;
    const uniqueAuthors = new Set(booksData.map(book => book.author.toLowerCase())).size;
    const uniqueGenres = new Set(booksData.map(book => book.genre.toLowerCase())).size;
    
    animateNumber(totalBooksEl, totalBooks);
    animateNumber(totalAuthorsEl, uniqueAuthors);
    animateNumber(totalGenresEl, uniqueGenres);
}

function animateNumber(element, targetNumber) {
    const currentNumber = parseInt(element.textContent) || 0;
    const increment = targetNumber > currentNumber ? 1 : -1;
    const duration = 1000;
    const steps = Math.abs(targetNumber - currentNumber);
    const stepDuration = duration / steps;
    
    let current = currentNumber;
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current;
        
        if (current === targetNumber) {
            clearInterval(timer);
        }
    }, stepDuration);
}

function showLoading() {
    loadingState.style.display = 'block';
    booksGrid.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideLoading() {
    loadingState.style.display = 'none';
}

// Modal Functions
function openModal(book = null) {
    isEditing = !!book;
    currentBookId = book ? book.id : null;
    
    modalTitle.textContent = isEditing ? 'Edit Book' : 'Add New Book';
    submitBtn.querySelector('.btn-text').textContent = isEditing ? 'Update Book' : 'Add Book';
    
    if (isEditing) {
        // Populate form with book data
        document.getElementById('title').value = book.title;
        document.getElementById('author').value = book.author;
        document.getElementById('isbn').value = book.isbn;
        document.getElementById('publishedYear').value = book.publishedYear;
        document.getElementById('genre').value = book.genre;
        document.getElementById('description').value = book.description || '';
        updateCharCounter();
    } else {
        // Clear form
        bookForm.reset();
        updateCharCounter();
        // Clear all field feedback
        bookForm.querySelectorAll('.input-feedback').forEach(feedback => {
            feedback.textContent = '';
            feedback.className = 'input-feedback';
        });
        bookForm.querySelectorAll('input, textarea').forEach(field => {
            field.style.borderColor = '#e2e8f0';
        });
    }
    
    bookModal.style.display = 'block';
    setTimeout(() => document.getElementById('title').focus(), 100);
}

function closeModal() {
    bookModal.style.display = 'none';
    bookForm.reset();
    currentBookId = null;
    isEditing = false;
}

function viewBookDetails(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;
    
    const content = document.getElementById('bookDetailsContent');
    content.innerHTML = `
        <div class="book-detail-header">
            <h2 class="book-detail-title">${escapeHtml(book.title)}</h2>
            <p class="book-detail-author">by ${escapeHtml(book.author)}</p>
        </div>
        
        <div class="book-detail-grid">
            <div class="book-detail-item">
                <div class="book-detail-item-label">ISBN</div>
                <div class="book-detail-item-value">${escapeHtml(book.isbn)}</div>
            </div>
            <div class="book-detail-item">
                <div class="book-detail-item-label">Published Year</div>
                <div class="book-detail-item-value">${book.publishedYear}</div>
            </div>
            <div class="book-detail-item">
                <div class="book-detail-item-label">Genre</div>
                <div class="book-detail-item-value">${escapeHtml(book.genre)}</div>
            </div>
            <div class="book-detail-item">
                <div class="book-detail-item-label">Added</div>
                <div class="book-detail-item-value">Recently</div>
            </div>
        </div>
        
        ${book.description ? `
            <div class="book-detail-description">
                <h4><i class="fas fa-file-alt"></i> Description</h4>
                <p>${escapeHtml(book.description)}</p>
            </div>
        ` : ''}
    `;
    
    bookDetailsModal.style.display = 'block';
}

function closeDetailsModal() {
    bookDetailsModal.style.display = 'none';
}

// Form Functions
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate all required fields
    const requiredFields = bookForm.querySelectorAll('input[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        showToast('Validation Error', 'Please fix the errors in the form', 'error');
        return;
    }
    
    const formData = new FormData(bookForm);
    const bookData = {
        title: formData.get('title').trim(),
        author: formData.get('author').trim(),
        isbn: formData.get('isbn').trim(),
        publishedYear: parseInt(formData.get('publishedYear')),
        genre: formData.get('genre').trim(),
        description: formData.get('description').trim(),
    };
    
    try {
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        btnText.textContent = isEditing ? 'Updating...' : 'Adding...';
        
        if (isEditing) {
            await updateBook(currentBookId, bookData);
            showToast('Success! 🎉', 'Book updated successfully!', 'success');
        } else {
            await createBook(bookData);
            showToast('Success! 🎉', 'Book added successfully!', 'success');
        }
        
        closeModal();
        await loadBooks();
        
    } catch (error) {
        showToast('Error', error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        const btnText = submitBtn.querySelector('.btn-text');
        btnText.textContent = isEditing ? 'Update Book' : 'Add Book';
    }
}

// Book Actions
function editBook(id) {
    const book = books.find(b => b.id === id);
    if (book) {
        openModal(book);
    }
}

let pendingDeleteId = null;

function confirmDeleteBook(id, title) {
    pendingDeleteId = id;
    document.getElementById('confirmTitle').textContent = 'Delete Book';
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${title}"? This action cannot be undone.`;
    confirmDialog.style.display = 'block';
}

function closeConfirmDialog() {
    confirmDialog.style.display = 'none';
    pendingDeleteId = null;
}

async function confirmAction() {
    if (pendingDeleteId) {
        try {
            await deleteBook(pendingDeleteId);
            showToast('Success! 🗑️', 'Book deleted successfully!', 'success');
            await loadBooks();
        } catch (error) {
            showToast('Error', error.message, 'error');
        }
    }
    closeConfirmDialog();
}

// Toast Notifications
function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    
    toast.innerHTML = `
        <div class="toast-title">${icon} ${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
    
    // Remove on click
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    });
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        to {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
        }
    }
`;
document.head.appendChild(style);

// Utility Functions
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Error handling for global errors
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('Unexpected Error', 'Something went wrong. Please try again.', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('Network Error', 'Please check your connection and try again.', 'error');
});

// Add some nice loading effects
document.addEventListener('DOMContentLoaded', () => {
    // Add a subtle entrance animation to the main content
    setTimeout(() => {
        document.querySelector('.main').style.animation = 'fadeInUp 0.6s ease-out';
    }, 100);
});

// Add the fadeInUp animation
const fadeInStyle = document.createElement('style');
fadeInStyle.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(fadeInStyle);