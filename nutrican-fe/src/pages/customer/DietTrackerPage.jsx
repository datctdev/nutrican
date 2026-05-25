import { useState, useRef } from 'react';
import { Upload, Camera, FileText, AlertTriangle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function DietTrackerPage() {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Diet Tracker</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Log Your Meal</h3>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files[0])} />
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Upload a photo of your meal</p>
            <p className="text-sm text-gray-400 mt-1">Image should be less than 500KB</p>
            {selectedFile && <p className="mt-2 text-sm text-green-600 font-medium">{selectedFile.name}</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" className="flex-1" loading={uploading} onClick={() => setUploading(true)}>
              <Upload className="w-4 h-4 mr-2" /> Analyze with AI
            </Button>
            <Button variant="outline" className="flex-1">
              <FileText className="w-4 h-4 mr-2" /> Manual Entry
            </Button>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-700">Having trouble estimating? Create an SOS ticket and your PT will help.</p>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Today's Summary</h3>
          <div className="space-y-4">
            {[
              { label: 'Calories', current: 1450, target: 2000, color: 'bg-blue-500' },
              { label: 'Protein', current: 65, target: 120, color: 'bg-red-500' },
              { label: 'Carbs', current: 180, target: 200, color: 'bg-yellow-500' },
              { label: 'Fat', current: 45, target: 65, color: 'bg-green-500' },
            ].map((macro) => (
              <div key={macro.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{macro.label}</span>
                  <span className="text-gray-500">{macro.current}g / {macro.target}g</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${macro.color} h-2 rounded-full`} style={{ width: `${Math.min(100, (macro.current / macro.target) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Recent Logs</h3>
        <div className="space-y-3">
          {[
            { meal: 'Lunch', food: 'Grilled chicken salad', time: '12:30 PM', status: 'APPROVED', calories: 450 },
            { meal: 'Breakfast', food: 'Oatmeal with fruits', time: '7:00 AM', status: 'PENDING', calories: 380 },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge>{log.meal}</Badge>
                <div>
                  <p className="font-medium text-gray-900">{log.food}</p>
                  <p className="text-sm text-gray-500">{log.time} - {log.calories} kcal</p>
                </div>
              </div>
              <Badge variant={log.status === 'APPROVED' ? 'success' : 'warning'}>{log.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
