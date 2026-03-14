import { useState, useEffect } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

const DICE_ICONS: Record<number, ComponentType<LucideProps>> = {
  1: Dice1,
  2: Dice2,
  3: Dice3,
  4: Dice4,
  5: Dice5,
  6: Dice6,
};

interface DiceProps {
  value: number;
  isKept: boolean;
  disabled: boolean;
  rollsLeft: number;
  onToggle: () => void;
}

export function Dice({ value, isKept, disabled, rollsLeft, onToggle }: DiceProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isKept && value !== 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [rollsLeft]); // Reaccionar a la acción de tirar, no al valor del dado

  const Icon = DICE_ICONS[value];

  // Antes de la primera tirada los dados muestran "?"
  if (!Icon) {
    return (
      <button
        disabled
        className="w-16 h-16 rounded-xl bg-gray-800 border-2 border-gray-700
                   flex items-center justify-center text-2xl text-gray-600
                   cursor-not-allowed select-none"
      >
        ?
      </button>
    );
  }

  const blocked = disabled || isAnimating || value === 0;

  return (
    <button
      onClick={onToggle}
      disabled={blocked}
      className={`
        w-16 h-16 rounded-xl border-2 flex items-center justify-center
        transition-all duration-150 select-none
        ${blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-105 active:scale-95'}
        ${isKept
          ? 'bg-amber-900/40 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
          : 'bg-gray-800 border-gray-700 text-gray-200 hover:border-gray-500'}
        ${isAnimating ? 'animate-dice-roll' : ''}
      `}
      title={isKept ? 'Guardado — clic para liberar' : 'Clic para guardar'}
    >
      <Icon className="w-9 h-9" />
    </button>
  );
}
