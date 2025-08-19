import React, { useState } from 'react';
import { User, AlertCircle, Settings } from 'lucide-react';
import UserProfileSetup, { UserPhysiologyData } from './UserProfileSetup';

interface ProfileSetupPromptProps {
  title?: string;
  message?: string;
  missingFields?: string[];
  onComplete?: (data: UserPhysiologyData) => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

export const ProfileSetupPrompt: React.FC<ProfileSetupPromptProps> = ({
  title = "Complete Your Profile",
  message = "Add your physiological data to unlock more accurate training metrics and personalized recommendations.",
  missingFields = [],
  onComplete,
  className = '',
  variant = 'card'
}) => {
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const handleSetupComplete = (data: UserPhysiologyData) => {
    setIsSetupOpen(false);
    if (onComplete) {
      onComplete(data);
    }
  };

  const getMissingFieldsText = () => {
    if (missingFields.length === 0) return '';
    
    const fieldNames: Record<string, string> = {
      maxHeartRate: 'Max Heart Rate',
      restingHeartRate: 'Resting Heart Rate',
      bodyWeight: 'Body Weight',
      age: 'Age'
    };

    const displayNames = missingFields.map(field => fieldNames[field] || field);
    
    if (displayNames.length === 1) {
      return `Missing: ${displayNames[0]}`;
    } else if (displayNames.length === 2) {
      return `Missing: ${displayNames.join(' and ')}`;
    } else {
      return `Missing: ${displayNames.slice(0, -1).join(', ')} and ${displayNames[displayNames.length - 1]}`;
    }
  };

  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-800 mb-1">{title}</h4>
              <p className="text-sm text-blue-700 mb-3">{message}</p>
              {missingFields.length > 0 && (
                <p className="text-xs text-blue-600 mb-3">{getMissingFieldsText()}</p>
              )}
              <button
                onClick={() => setIsSetupOpen(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <Settings className="w-4 h-4 mr-1" />
                Set Up Profile
              </button>
            </div>
          </div>
        </div>

        <UserProfileSetup
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
          onSave={handleSetupComplete}
        />
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <div className={`flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md ${className}`}>
          <div className="flex items-center">
            <User className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              {missingFields.length > 0 ? getMissingFieldsText() : message}
            </span>
          </div>
          <button
            onClick={() => setIsSetupOpen(true)}
            className="text-sm text-yellow-700 hover:text-yellow-800 underline"
          >
            Set up now
          </button>
        </div>

        <UserProfileSetup
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
          onSave={handleSetupComplete}
        />
      </>
    );
  }

  // Default card variant
  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border p-6 text-center ${className}`}>
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {missingFields.length > 0 && (
          <p className="text-sm text-gray-500 mb-4">{getMissingFieldsText()}</p>
        )}
        <button
          onClick={() => setIsSetupOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Settings className="w-4 h-4 mr-2" />
          Set Up Profile
        </button>
      </div>

      <UserProfileSetup
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSave={handleSetupComplete}
      />
    </>
  );
};

export default ProfileSetupPrompt;