import { useState } from 'react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

export default function ReviewDietLogPage() {
  const [logs] = useState([
    { id: 1, client: 'Alice Smith', meal: 'Lunch', food: 'Grilled chicken salad', time: '12:30 PM', calories: 450, protein: 35, status: 'PT_REVIEWING' },
    { id: 2, client: 'Bob Johnson', meal: 'Dinner', food: 'Pasta with meat sauce', time: '7:00 PM', calories: 720, protein: 28, status: 'PT_REVIEWING' },
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Review Diet Logs</h1>
      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id}>
            <div className="flex gap-6">
              <div className="w-48 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                [Meal Image]
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{log.client}</h3>
                  <Badge>{log.meal}</Badge>
                  <Badge variant="warning">{log.time}</Badge>
                </div>
                <p className="text-gray-700">{log.food}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>Calories: {log.calories} kcal</span>
                  <span>Protein: {log.protein}g</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="success" size="sm">Approve</Button>
                  <Button variant="outline" size="sm">Adjust Macros</Button>
                  <Button variant="ghost" size="sm">Reject</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
