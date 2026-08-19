import { useState } from 'react';
import { X } from 'lucide-react';

export function ChipInput({ value = [], onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div 
      className="form-input flex" 
      style={{ 
        flexWrap: 'wrap', 
        gap: '6px', 
        padding: '6px', 
        minHeight: '40px',
        height: 'auto'
      }}
    >
      {value.map((tag, index) => (
        <span key={index} className="chip">
          {tag}
          <button 
            type="button" 
            onClick={() => removeTag(index)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              padding: '2px'
            }}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        style={{
          flex: 1,
          minWidth: '120px',
          background: 'none',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '14px',
          padding: '4px'
        }}
      />
    </div>
  );
}
