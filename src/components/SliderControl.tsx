import { ChangeEvent } from 'react';
import './SliderControl.css';

type SliderControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

const formatNumber = (value: number) => {
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(2);
  }
  return value.toFixed(2);
};

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit,
  onChange
}: SliderControlProps) {
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  return (
    <label className="slider-control">
      <div className="slider-header">
        <span>{label}</span>
        <span className="slider-value">
          {formatNumber(value)} {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={handleInput} />
    </label>
  );
}

export default SliderControl;
