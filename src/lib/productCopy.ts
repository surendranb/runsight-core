export interface EvidenceCopy {
  label: string;
  description: string;
}

export const getEvidenceCopy = (confidence: number): EvidenceCopy => {
  if (confidence >= 0.8) {
    return {
      label: 'Well supported',
      description: 'There is enough recent evidence for this to be a strong signal, not just a hunch.'
    };
  }

  if (confidence >= 0.6) {
    return {
      label: 'Reasonable estimate',
      description: 'This is directionally useful, but not strong enough to treat as exact.'
    };
  }

  return {
    label: 'Use with caution',
    description: 'The evidence is still thin or noisy, so treat this as an early signal.'
  };
};

export const getEvidenceCopyFromLevel = (level: 'high' | 'medium' | 'low'): EvidenceCopy => {
  switch (level) {
    case 'high':
      return getEvidenceCopy(0.85);
    case 'medium':
      return getEvidenceCopy(0.65);
    case 'low':
    default:
      return getEvidenceCopy(0.4);
  }
};
