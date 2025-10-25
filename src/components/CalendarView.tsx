import { useState } from 'react';
import { Plant } from '../types';
import { calculateGerminationDate, calculateTransplantDate } from '../utils/dateUtils';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CalendarViewProps {
  plants: Plant[];
}

interface CalendarEvent {
  type: 'seed' | 'germination' | 'transplant';
  plant: Plant;
  date: Date;
}

export default function CalendarView({ plants }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Build events map
  const eventsMap = new Map<string, CalendarEvent[]>();

  plants.forEach((plant) => {
    // Seed start date
    const seedDate = parseISO(plant.seedStartDate);
    const seedKey = format(seedDate, 'yyyy-MM-dd');
    if (!eventsMap.has(seedKey)) eventsMap.set(seedKey, []);
    eventsMap.get(seedKey)!.push({ type: 'seed', plant, date: seedDate });

    // Germination date
    const germDate = parseISO(calculateGerminationDate(plant.seedStartDate, plant.daysToGermination));
    const germKey = format(germDate, 'yyyy-MM-dd');
    if (!eventsMap.has(germKey)) eventsMap.set(germKey, []);
    eventsMap.get(germKey)!.push({ type: 'germination', plant, date: germDate });

    // Transplant date
    const transDate = parseISO(calculateTransplantDate(plant.seedStartDate, plant.daysToTransplant));
    const transKey = format(transDate, 'yyyy-MM-dd');
    if (!eventsMap.has(transKey)) eventsMap.set(transKey, []);
    eventsMap.get(transKey)!.push({ type: 'transplant', plant, date: transDate });
  });

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const key = format(day, 'yyyy-MM-dd');
    return eventsMap.get(key) || [];
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const eventColors = {
    seed: 'bg-yellow-500',
    germination: 'bg-green-500',
    transplant: 'bg-blue-500',
  };

  const eventLabels = {
    seed: 'Seed Start',
    germination: 'Germination',
    transplant: 'Transplant',
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Growing Calendar</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-2xl font-bold text-gray-800">{format(currentDate, 'MMMM yyyy')}</h3>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          {Object.entries(eventLabels).map(([type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${eventColors[type as keyof typeof eventColors]}`}></div>
              <span className="text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const events = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={index}
                className={`min-h-24 border rounded-lg p-2 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {events.map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={`${eventColors[event.type]} text-white text-xs px-1.5 py-0.5 rounded truncate`}
                      title={`${eventLabels[event.type]}: ${event.plant.name}`}
                    >
                      {event.plant.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
