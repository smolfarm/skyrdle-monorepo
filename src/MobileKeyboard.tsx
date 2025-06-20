import React from 'react';

interface Props {
  onKey: (key: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  keyboardStatus: Record<string, 'correct' | 'present' | 'absent' | null>;
}

const rows = ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];

const MobileKeyboard: React.FC<Props> = ({ onKey, onEnter, onDelete, keyboardStatus }) => {
  // Function to determine key class based on its status
  const getKeyClass = (letter: string): string => {
    const status = keyboardStatus[letter];
    if (!status) return 'key btn-glass'; // Default state
    return `key btn-glass key-${status}`; // correct, present, or absent
  };

  return (
    <div className="keyboard">
      {rows.map((row, idx) => (
        <div key={idx} className="keyboard-row">
          {row.split('').map(letter => (
            <button
              key={letter}
              className={getKeyClass(letter)}
              onClick={() => onKey(letter)}
              disabled={keyboardStatus[letter] === 'absent'}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard-row keyboard-actions">
        <button className="key key-action btn-glass" onClick={onEnter}>Enter</button>
        <button className="key key-action btn-glass" onClick={onDelete}>Del</button>
      </div>
    </div>
  );
};

export default MobileKeyboard;
