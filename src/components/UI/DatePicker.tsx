import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const dateVal = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [currentYear, setCurrentYear] = useState(dateVal.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(dateVal.getMonth()); // 0-indexed

  // Keep state sync when value changes externally
  useEffect(() => {
    setCurrentYear(dateVal.getFullYear());
    setCurrentMonth(dateVal.getMonth());
  }, [dateVal]);

  // Format YYYY-MM-DD to DD/MM/YYYY for display
  const displayValue = useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

    // Prev Month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        day: d,
        isCurrentMonth: false,
        dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    // Current Month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        day: d,
        isCurrentMonth: true,
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    // Next Month padding days
    const remainingGridCells = 42 - days.length; // 6 rows of 7 days
    for (let d = 1; d <= remainingGridCells; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        day: d,
        isCurrentMonth: false,
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDaySelect = (dateStr: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(dateStr);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div className="relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder="DD/MM/YYYY"
          className="w-full bg-olive-950 border border-gold-500/30 text-white rounded-lg pl-3 pr-9 py-1.5 outline-none focus:border-gold-500 text-xs cursor-pointer select-none"
        />
        <CalendarIcon className="w-4 h-4 text-olive-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-[100] bg-olive-900 border border-gold-500/40 rounded-2xl shadow-2xl p-4 w-64 select-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-olive-800 rounded-lg text-olive-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white font-sans">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-olive-800 rounded-lg text-olive-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-gold-500/60 uppercase">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-0.5">{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((item, idx) => {
              const isSelected = item.dateStr === value;
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={idx}
                  onClick={(e) => handleDaySelect(item.dateStr, e)}
                  className={`py-1 rounded-lg font-mono transition-colors ${
                    !item.isCurrentMonth
                      ? 'text-olive-600 hover:bg-olive-850'
                      : isSelected
                      ? 'bg-gold-500 text-olive-950 font-extrabold shadow-md'
                      : isToday
                      ? 'bg-gold-500/15 border border-gold-500/40 text-gold-400 font-bold'
                      : 'text-white hover:bg-olive-800'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
