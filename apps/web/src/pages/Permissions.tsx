/**
 * Permissions.tsx
 * 权限管理页面
 *
 * 功能:
 * - 用户组管理
 * - Webhook 管理
 * - API Key 管理
 */

import React, { useState } from 'react';
import { cn } from '@/utils';
import { Users, Webhook, Key, Settings } from 'lucide-react';
import { GroupList } from '@/components/groups';
import { WebhookList } from '@/components/webhooks';
import { ApiKeyList } from '@/components/settings';

type TabType = 'groups' | 'webhooks' | 'apikeys';

const tabs: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
  { id: 'groups', label: '用户组', icon: Users },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'apikeys', label: 'API Keys', icon: Key },
];

const Permissions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('groups');

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-semibold">权限管理</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  管理用户组、Webhook 和 API Key
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-1 border-b -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'groups' && <GroupList />}
          {activeTab === 'webhooks' && <WebhookList />}
          {activeTab === 'apikeys' && <ApiKeyList />}
        </div>
      </div>
    </div>
  );
};

export default Permissions;
