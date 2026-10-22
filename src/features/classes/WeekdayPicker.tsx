import s from "./classesForm.module.css";
const weekdays = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];
const order = weekdays.map((day) => day.value);
export function WeekdayPicker({
  value,
  onChange,
  label = "Ngày học trong tuần",
}: {
  value: number[];
  onChange: (days: number[]) => void;
  label?: string;
}) {
  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      <div className={s.dayGrid} role="group" aria-label={label}>
        {weekdays.map((day) => {
          const active = value.includes(day.value);
          return (
            <button
              key={day.label}
              type="button"
              aria-pressed={active}
              className={s.day + (active ? " " + s.dayActive : "")}
              onClick={() =>
                onChange(
                  active
                    ? value.filter((item) => item !== day.value)
                    : [...value, day.value].sort(
                        (a, b) => order.indexOf(a) - order.indexOf(b),
                      ),
                )
              }
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default WeekdayPicker;
