import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for books
let books = [
  {
    id: 1,
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn: "978-0-7432-7356-5",
    publishedYear: 1925,
    genre: "Fiction",
    description: "A classic American novel set in the summer of 1922."
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    isbn: "978-0-06-112008-4",
    publishedYear: 1960,
    genre: "Fiction",
    description: "A gripping tale of racial injustice and childhood innocence."
  },
  {
    id: 3,
    title: "1984",
    author: "George Orwell",
    isbn: "978-0-452-28423-4",
    publishedYear: 1949,
    genre: "Dystopian Fiction",
    description: "A dystopian social science fiction novel and cautionary tale."
  }
];

let nextId = 4;

// Helper function to validate book data
const validateBook = (book) => {
  const errors = [];
  
  if (!book.title || book.title.trim() === '') {
    errors.push('Title is required');
  }
  
  if (!book.author || book.author.trim() === '') {
    errors.push('Author is required');
  }
  
  if (!book.isbn || book.isbn.trim() === '') {
    errors.push('ISBN is required');
  }
  
  if (!book.publishedYear || isNaN(book.publishedYear) || book.publishedYear < 1000 || book.publishedYear > new Date().getFullYear()) {
    errors.push('Valid published year is required');
  }
  
  if (!book.genre || book.genre.trim() === '') {
    errors.push('Genre is required');
  }
  
  return errors;
};

// Routes

// GET /api/books - Get all books
app.get('/api/books', (req, res) => {
  try {
    const { search, genre, sort } = req.query;
    let filteredBooks = [...books];
    
    // Search functionality
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredBooks = filteredBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.genre.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by genre
    if (genre && genre !== 'all') {
      filteredBooks = filteredBooks.filter(book => 
        book.genre.toLowerCase() === genre.toLowerCase()
      );
    }
    
    // Sort functionality
    if (sort) {
      switch (sort) {
        case 'title':
          filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'author':
          filteredBooks.sort((a, b) => a.author.localeCompare(b.author));
          break;
        case 'year':
          filteredBooks.sort((a, b) => b.publishedYear - a.publishedYear);
          break;
        default:
          break;
      }
    }
    
    res.json({
      success: true,
      count: filteredBooks.length,
      data: filteredBooks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/books/:id - Get a specific book
app.get('/api/books/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }
    
    const book = books.find(b => b.id === id);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/books - Create a new book
app.post('/api/books', (req, res) => {
  try {
    const bookData = req.body;
    
    // Validate book data
    const errors = validateBook(bookData);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Check if ISBN already exists
    const existingBook = books.find(b => b.isbn === bookData.isbn);
    if (existingBook) {
      return res.status(409).json({
        success: false,
        message: 'A book with this ISBN already exists'
      });
    }
    
    // Create new book
    const newBook = {
      id: nextId++,
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      isbn: bookData.isbn.trim(),
      publishedYear: parseInt(bookData.publishedYear),
      genre: bookData.genre.trim(),
      description: bookData.description ? bookData.description.trim() : ''
    };
    
    books.push(newBook);
    
    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: newBook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT /api/books/:id - Update a book
app.put('/api/books/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }
    
    const bookIndex = books.findIndex(b => b.id === id);
    
    if (bookIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    const bookData = req.body;
    
    // Validate book data
    const errors = validateBook(bookData);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Check if ISBN already exists (excluding current book)
    const existingBook = books.find(b => b.isbn === bookData.isbn && b.id !== id);
    if (existingBook) {
      return res.status(409).json({
        success: false,
        message: 'A book with this ISBN already exists'
      });
    }
    
    // Update book
    const updatedBook = {
      id: id,
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      isbn: bookData.isbn.trim(),
      publishedYear: parseInt(bookData.publishedYear),
      genre: bookData.genre.trim(),
      description: bookData.description ? bookData.description.trim() : ''
    };
    
    books[bookIndex] = updatedBook;
    
    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/books/:id - Delete a book
app.delete('/api/books/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }
    
    const bookIndex = books.findIndex(b => b.id === id);
    
    if (bookIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    const deletedBook = books.splice(bookIndex, 1)[0];
    
    res.json({
      success: true,
      message: 'Book deleted successfully',
      data: deletedBook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`📚 Books API Server running on http://localhost:${PORT}`);
  console.log(`📖 Available endpoints:`);
  console.log(`   GET    /api/books     - Get all books`);
  console.log(`   GET    /api/books/:id - Get book by ID`);
  console.log(`   POST   /api/books     - Create new book`);
  console.log(`   PUT    /api/books/:id - Update book`);
  console.log(`   DELETE /api/books/:id - Delete book`);
});