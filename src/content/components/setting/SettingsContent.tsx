import { SettingItem } from './SettingItem'
import { Shortcut } from './Shortcut'
import packageJson from '../../../../package.json'
import { useStorageStore } from '@/storage/useStorageStore'

const { version } = packageJson

const REFRESH_INTERVAL_OPTIONS = [
  { value: 1000 * 60 * 5, label: '5분' },
  { value: 1000 * 60 * 10, label: '10분' },
  { value: 1000 * 60 * 20, label: '20분' },
  { value: 1000 * 60 * 30, label: '30분' },
  { value: 1000 * 60 * 60, label: '1시간' },
  { value: 1000 * 60 * 120, label: '2시간' },
]

export function SettingsContent() {
  const { settings, updateData } = useStorageStore()

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto bg-gray-50">
      <div className="mb-12px mt-4px bg-white bg-opacity-50 px-16px py-12px">
        <h2 className="text-16px font-bold">설정</h2>
      </div>

      <div className="flex flex-col gap-16px p-16px">
        <div className="rounded-lg bg-white p-16px shadow-sm">
          <SettingItem title="새로고침 시간" description="과제 목록을 자동으로 갱신할 간격을 설정합니다.">
            <select
              className="d-select d-select-bordered w-full"
              value={settings.refreshInterval}
              onChange={event =>
                updateData('settings', prev => ({
                  ...prev,
                  refreshInterval: Number(event.target.value),
                }))
              }
            >
              {REFRESH_INTERVAL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SettingItem>
        </div>

        <div className="rounded-lg bg-white p-16px shadow-sm">
          <Shortcut />
        </div>
      </div>

      <div className="flex items-center justify-center gap-8px p-16px text-12px">
        <span className="text-gray-500">버전: {version}</span>
      </div>
    </div>
  )
}
