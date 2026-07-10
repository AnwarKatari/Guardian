import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { SafetyEngineProvider } from './contexts/SafetyEngineContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import MapPage from './pages/MapPage';
import SOSPage from './pages/SOSPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import SafetyZonesPage from './pages/SafetyZonesPage';
import TrustedContactsPage from './pages/TrustedContactsPage';
import CheckInPage from './pages/CheckInPage';
import ResourcesPage from './pages/ResourcesPage';
import OfflineModule from './pages/OfflineModule';
import FakeCallPage from './pages/FakeCallPage';
import EmergencyHub from './pages/EmergencyHub';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SOSHistoryPage from './pages/SOSHistoryPage';
import NetworkPage from './pages/NetworkPage';
import MessagesPage from './pages/MessagesPage';
import SecurityPage from './pages/SecurityPage';
import ConversationalHub from './pages/ConversationalHub';
import { VoiceSentinel } from './components/VoiceSentinel';
import { SecurityOverlay } from './components/SecurityOverlay';
import { SOSSuccessModal } from './components/SOSSuccessModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <DashboardPage setActiveTab={setActiveTab} />;
      case 'map': return <MapPage />;
      case 'sos': return <SOSPage setActiveTab={setActiveTab} />;
      case 'report': return <ReportPage />;
      case 'settings': return <SettingsPage setActiveTab={setActiveTab} />;
      case 'trusted-contacts': return <TrustedContactsPage setActiveTab={setActiveTab} />;
      case 'security': return <SecurityPage setActiveTab={setActiveTab} />;
      case 'resources': return <ResourcesPage setActiveTab={setActiveTab} />;
      case 'offline-module': return <OfflineModule setActiveTab={setActiveTab} />;
      case 'check-in': return <CheckInPage />;
      case 'fake-call': return <FakeCallPage setActiveTab={setActiveTab} />;
      case 'emergency-hub': return <EmergencyHub setActiveTab={setActiveTab} />;
      case 'privacy': return <PrivacyPolicy onBack={() => setActiveTab('settings')} />;
      case 'sos-history': return <SOSHistoryPage setActiveTab={setActiveTab} />;
      case 'network': return <NetworkPage setActiveTab={setActiveTab} setSelectedId={setSelectedId} />;
      case 'messages': return <MessagesPage recipientId={selectedId || undefined} setActiveTab={setActiveTab} />;
      case 'conversational-hub': return <ConversationalHub setActiveTab={setActiveTab} />;
      default: return <DashboardPage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <AuthProvider>
      <LocationProvider>
        <SafetyEngineProvider>
          <NotificationProvider>
            <VoiceSentinel />
            <SecurityOverlay />
            <SOSSuccessModal />
            <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </Layout>
          </NotificationProvider>
        </SafetyEngineProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
