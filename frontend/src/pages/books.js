import { useState } from 'react';
import Layout from '../components/layout/Layout';
import BookList from '../components/books/BookList';
import BookForm from '../components/books/BookForm';

export default function BooksPage() {
  const [isAddingBook, setIsAddingBook] = useState(false);

  const handleAddBook = (bookData) => {
    // TODO: Implement book addition logic
    console.log('Adding book:', bookData);
    setIsAddingBook(false);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isAddingBook ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Add New Book</h1>
                <button
                  onClick={() => setIsAddingBook(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
              <BookForm onSubmit={handleAddBook} />
            </div>
          ) : (
            <BookList onAddClick={() => setIsAddingBook(true)} />
          )}
        </div>
      </div>
    </Layout>
  );
}
