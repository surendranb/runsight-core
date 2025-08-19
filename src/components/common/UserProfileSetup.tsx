import React, { useState, useEffect } from 'react';
import { User, Heart, Weight, Save, X } from 'lucide-react';

export interface UserPhysiologyData {
  maxHeartRate?: number;
  restingHeartRate?: number;
  bodyWeight?: number;
  age?: number;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
}

interface UserProfileSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserPhysiologyData) => void | Promise<void>;
  initialData?: UserPhysiologyData;
  title?: string;
  description?: string;
}

const STORAGE_KEY = 'runsight_user_physiology';

// Validation ranges
const VALIDATION_RANGES = {
  restingHeartRate: { min: 40, max: 100 },
  maxHeartRate: { min: 150, max: 220 },
  bodyWeight: { min: 40, max: 150 },
  age: { min: 16, max: 80 }
};

export const UserProfileSetup: React.FC<UserProfileSetupProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = "Set Up Your Profile",
  description = "Enter your physiological data to get more accurate training metrics and recommendations."
}) => {
  const [formData, setFormData] = useState<UserPhysiologyData>({
    maxHeartRate: initialData?.maxHeartRate || undefined,
    restingHeartRate: initialData?.restingHeartRate || undefined,
    bodyWeight: initialData?.bodyWeight || undefined,
    age: initialData?.age || undefined,
    fitnessLevel: initialData?.fitnessLevel || 'intermediate'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    if (isOpen && !initialData) {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Error loading user profile data:', error);
        }
      }
    }
  }, [isOpen, initialData]);

  const validateField = (field: string, value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '';
    }

    const range = VALIDATION_RANGES[field as keyof typeof VALIDATION_RANGES];
    if (!range) return '';

    if (value < range.min || value > range.max) {
      return `Must be between ${range.min} and ${range.max}`;
    }

    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate each field
    Object.keys(VALIDATION_RANGES).forEach(field => {
      const value = formData[field as keyof UserPhysiologyData] as number;
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Additional validation: max HR should be higher than resting HR
    if (formData.maxHeartRate && formData.restingHeartRate) {
      if (formData.maxHeartRate <= formData.restingHeartRate) {
        newErrors.maxHeartRate = 'Max heart rate must be higher than resting heart rate';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserPhysiologyData, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to localStorage (as backup)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      
      // Call the onSave callback (may be async)
      await onSave(formData);
      
      // Close the modal (only if onSave didn't handle it)
      onClose();
    } catch (error) {
      console.error('Error saving user profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimateMaxHeartRate = () => {
    if (formData.age) {
      const estimated = 220 - formData.age;
      setFormData(prev => ({ ...prev, maxHeartRate: estimated }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <User className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">{description}</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age (years)
              </label>
              <input
                type="number"
                min={VALIDATION_RANGES.age.min}
                max={VALIDATION_RANGES.age.max}
                value={formData.age || ''}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.age ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 30"
              />
              {errors.age && (
                <p className="text-red-500 text-sm mt-1">{errors.age}</p>
              )}
            </div>

            {/* Resting Heart Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Heart className="w-4 h-4 inline mr-1" />
                Resting Heart Rate (bpm)
              </label>
              <input
                type="number"
                min={VALIDATION_RANGES.restingHeartRate.min}
                max={VALIDATION_RANGES.restingHeartRate.max}
                value={formData.restingHeartRate || ''}
                onChange={(e) => handleInputChange('restingHeartRate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.restingHeartRate ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 60"
              />
              {errors.restingHeartRate && (
                <p className="text-red-500 text-sm mt-1">{errors.restingHeartRate}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Measure first thing in the morning before getting out of bed
              </p>
            </div>

            {/* Max Heart Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Heart className="w-4 h-4 inline mr-1" />
                Maximum Heart Rate (bpm)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min={VALIDATION_RANGES.maxHeartRate.min}
                  max={VALIDATION_RANGES.maxHeartRate.max}
                  value={formData.maxHeartRate || ''}
                  onChange={(e) => handleInputChange('maxHeartRate', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.maxHeartRate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 190"
                />
                <button
                  type="button"
                  onClick={estimateMaxHeartRate}
                  disabled={!formData.age}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Estimate
                </button>
              </div>
              {errors.maxHeartRate && (
                <p className="text-red-500 text-sm mt-1">{errors.maxHeartRate}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Use actual max HR from a fitness test, or estimate using age
              </p>
            </div>

            {/* Body Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Weight className="w-4 h-4 inline mr-1" />
                Body Weight (kg)
              </label>
              <input
                type="number"
                min={VALIDATION_RANGES.bodyWeight.min}
                max={VALIDATION_RANGES.bodyWeight.max}
                step="0.1"
                value={formData.bodyWeight || ''}
                onChange={(e) => handleInputChange('bodyWeight', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bodyWeight ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 70.0"
              />
              {errors.bodyWeight && (
                <p className="text-red-500 text-sm mt-1">{errors.bodyWeight}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Used for power estimation and metabolic calculations
              </p>
            </div>

            {/* Fitness Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fitness Level
              </label>
              <select
                value={formData.fitnessLevel || 'intermediate'}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  fitnessLevel: e.target.value as UserPhysiologyData['fitnessLevel']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner (0-1 years running)</option>
                <option value="intermediate">Intermediate (1-3 years running)</option>
                <option value="advanced">Advanced (3+ years running)</option>
                <option value="elite">Elite (competitive athlete)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Helps calibrate training recommendations
              </p>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Why we need this data:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Heart rate data</strong> enables TRIMP calculation and training zones</li>
              <li>• <strong>Body weight</strong> allows running power estimation</li>
              <li>• <strong>Age & fitness level</strong> help calibrate recommendations</li>
              <li>• All data is stored locally on your device</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to manage user physiology data
export const useUserPhysiology = () => {
  const [data, setData] = useState<UserPhysiologyData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setData(parsed);
      } catch (error) {
        console.error('Error loading user physiology data:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateData = (newData: UserPhysiologyData) => {
    const updatedData = { ...data, ...newData };
    setData(updatedData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
  };

  const clearData = () => {
    setData({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasRequiredData = () => {
    return !!(data.maxHeartRate && data.restingHeartRate);
  };

  const hasCompleteData = () => {
    return !!(data.maxHeartRate && data.restingHeartRate && data.bodyWeight && data.age);
  };

  return {
    data,
    isLoaded,
    updateData,
    clearData,
    hasRequiredData,
    hasCompleteData
  };
};

export default UserProfileSetup;