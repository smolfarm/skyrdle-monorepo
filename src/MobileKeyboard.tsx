import React from 'react';

interface Props {
  onKey: (key: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  absentLetters: string[];
}

const rows = ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];

const MobileKeyboard: React.FC<Props> = ({ onKey, onEnter, onDelete, absentLetters }) => {
  return (
    <div className="keyboard">
      {rows.map((row, idx) => (
        <div key={idx} className="keyboard-row">
          {row.split('').map(letter => (
            <button
              key={letter}
              className="key btn-glass"
              onClick={() => onKey(letter)}
              disabled={absentLetters.includes(letter)}
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
