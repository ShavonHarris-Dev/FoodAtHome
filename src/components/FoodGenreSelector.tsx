import React, { useState } from 'react'
import './FoodGenreSelector.css'

interface FoodGenreSelectorProps {
  selectedGenres: string[]
  onGenresChange: (genres: string[]) => void
}

const predefinedGenres = [
  'Korean',
  'Caribbean',
  'West African',
  'Mediterranean',
  'Italian',
  'Mexican',
  'Japanese',
  'Thai',
  'Indian',
  'Chinese',
  'French',
  'Greek',
  'Middle Eastern',
  'Vietnamese',
  'American',
  'British',
  'German',
  'Spanish',
  'Russian',
  'Moroccan'
]

const FoodGenreSelector: React.FC<FoodGenreSelectorProps> = ({
  selectedGenres,
  onGenresChange
}) => {
  const [customGenre, setCustomGenre] = useState('')

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      onGenresChange(selectedGenres.filter(g => g !== genre))
    } else {
      onGenresChange([...selectedGenres, genre])
    }
  }

  const addCustomGenre = () => {
    const trimmedGenre = customGenre.trim()
    if (trimmedGenre && !selectedGenres.includes(trimmedGenre)) {
      onGenresChange([...selectedGenres, trimmedGenre])
      setCustomGenre('')
    }
  }

  const handleCustomGenreKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomGenre()
    }
  }

  const removeGenre = (genre: string) => {
    onGenresChange(selectedGenres.filter(g => g !== genre))
  }

  return (
    <div className="food-genre-selector">
      <h3>Select Your Favorite Food Genres</h3>
      <p>Choose the cuisines you enjoy most (select multiple)</p>

      <div className="genre-grid">
        {predefinedGenres.map(genre => (
          <button
            key={genre}
            className={`genre-button ${selectedGenres.includes(genre) ? 'selected' : ''}`}
            onClick={() => toggleGenre(genre)}
            type="button"
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="custom-genre-section">
        <h4>Add Custom Genre</h4>
        <div className="custom-genre-input">
          <input
            type="text"
            value={customGenre}
            onChange={(e) => setCustomGenre(e.target.value)}
            onKeyPress={handleCustomGenreKeyPress}
            placeholder="Enter a custom cuisine type..."
            maxLength={30}
          />
          <button
            type="button"
            onClick={addCustomGenre}
            disabled={!customGenre.trim()}
            className="add-button"
          >
            Add
          </button>
        </div>
      </div>

      {selectedGenres.length > 0 && (
        <div className="selected-genres">
          <h4>Selected Genres ({selectedGenres.length})</h4>
          <div className="selected-list">
            {selectedGenres.map(genre => (
              <div key={genre} className="selected-genre">
                <span>{genre}</span>
                <button
                  type="button"
                  onClick={() => removeGenre(genre)}
                  className="remove-genre"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FoodGenreSelector