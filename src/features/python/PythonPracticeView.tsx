import React from 'react';
import { PracticeView } from './PracticeView';
import { Question } from '@/types';

export { PracticeView };

export interface PythonPracticeViewProps {
  initialProblem?: Question;
}

/**
 * Backward compatibility alias for PracticeView.
 * PracticeView provides the unified multi-language IDE supporting Python, Java, and C++.
 */
export const PythonPracticeView: React.FC<PythonPracticeViewProps> = (props) => {
  return <PracticeView {...props} />;
};

export default PracticeView;
