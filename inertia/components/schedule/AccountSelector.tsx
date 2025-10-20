import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { X, Twitter } from 'lucide-react'
import CustomSelect, { type Option } from '../ui/CustomSelect'
import type { Account } from '../../types/schedule'
import { findAccountByKey, getDisplayHandle } from '../../utils/schedule/accountFormatting'

interface AccountSelectorProps {
  accounts: Account[]
  selectedAccountIds: string[]
  currentSelectValue: string
  accountOptions: Option[]
  onSelectAccount: (accountId: string) => void
  onDeselectAccount: (accountId: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  setCurrentSelectValue: (value: string) => void
}

export const AccountSelector = ({
  accounts,
  selectedAccountIds,
  currentSelectValue,
  accountOptions,
  onSelectAccount,
  onDeselectAccount,
  onSelectAll,
  onClearAll,
  setCurrentSelectValue
}: AccountSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Accounts ({selectedAccountIds.length} selected)
        </Label>
        {accounts.length > 1 && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-xs h-6 px-2"
              disabled={selectedAccountIds.length === accounts.length}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs h-6 px-2"
              disabled={selectedAccountIds.length === 0}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {selectedAccountIds.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
            {selectedAccountIds.map((accountId) => {
              const account = findAccountByKey(accounts, accountId)
              if (!account) return null

              const displayHandle = getDisplayHandle(account)

              return (
                <div
                  key={accountId}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-full border border-blue-300 dark:border-blue-600 text-sm"
                >
                  {account.platform === 'twitter' ? (
                    <Twitter className="h-4 w-4 text-blue-400" />
                  ) : (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">B</span>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {account.displayName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      @{displayHandle}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeselectAccount(accountId)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <CustomSelect
          value={currentSelectValue}
          onChange={(accountId) => {
            if (accountId) {
              onSelectAccount(accountId)
              setCurrentSelectValue('')
            }
          }}
          options={accountOptions.filter(option => !selectedAccountIds.includes(option.value))}
          placeholder={selectedAccountIds.length === 0 ? "Choose accounts" : "Add another account"}
          className="w-full"
        />
      </div>

      {selectedAccountIds.length === 0 && (
        <p className="text-xs text-red-500 mt-1">Please select at least one account</p>
      )}
    </div>
  )
}
