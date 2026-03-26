import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Home } from 'lucide-react';
import { UserSettingsTab } from './tabs/UserSettingsTab';
import { RoomsManagementTab } from './tabs/RoomsManagementTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewRoom?: () => void;
}

type TabType = 'user' | 'rooms';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onCreateNewRoom }) => {
  const [activeTab, setActiveTab] = useState<TabType>('user');

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div className="settings-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="settings-modal animate-fade-in">
        {/* Header */}
        <div className="settings-modal-header">
          <h2 style={{ margin: '0' }}>Ustawienia</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Zamknij"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <User size={18} />
            <span>Użytkownik</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            <Home size={18} />
            <span>Pokoje</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-tab-content">
          {activeTab === 'user' && <UserSettingsTab />}
          {activeTab === 'rooms' && <RoomsManagementTab onCreateNewRoom={onCreateNewRoom} onCloseModal={onClose} />}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};
