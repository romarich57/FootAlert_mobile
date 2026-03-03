import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from './AppLayout';
import { HomePage } from '@/pages/HomePage';
import { TutorialsPage } from '@/pages/TutorialsPage';
import { ScoresPage } from '@/pages/ScoresPage';
import { SupportPage } from '@/pages/SupportPage';
import { SocialPage } from '@/pages/SocialPage';
import { LegalPrivacyPage } from '@/pages/LegalPrivacyPage';
import { LegalTermsPage } from '@/pages/LegalTermsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tutorials', element: <TutorialsPage /> },
      { path: 'scores', element: <ScoresPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'social', element: <SocialPage /> },
      { path: 'legal/privacy', element: <LegalPrivacyPage /> },
      { path: 'legal/terms', element: <LegalTermsPage /> },
      { path: '*', element: <HomePage /> },
    ],
  },
]);
