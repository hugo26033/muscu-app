import { formatRest } from '../lib/format';

const OPTIONS = [0, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300, 360, 420, 480, 540, 600, 660, 720];

export default function RestSelect({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (sec: number) => void;
  id?: string;
}) {
  const options = OPTIONS.includes(value) ? OPTIONS : [...OPTIONS, value].sort((a, b) => a - b);
  return (
    <select id={id} className="rest-select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((sec) => (
        <option key={sec} value={sec}>
          {formatRest(sec)}
        </option>
      ))}
    </select>
  );
}
