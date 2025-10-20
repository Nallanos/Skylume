import { useState, useEffect, useCallback } from 'react'
import type { Account } from '../../types/schedule'
import { accountToOption } from '../../utils/schedule/accountFormatting'
import type { Option } from '../../components/ui/CustomSelect'

export const useAccountSelection = (accounts: Account[]) => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [currentSelectValue, setCurrentSelectValue] = useState<string>('')

  const accountOptions: Option[] = accounts.map(accountToOption)

  const isTwitterSelected = selectedAccountIds.some(accountId => accountId.startsWith('twitter:'))
  const isOnlyBlueskySelected = selectedAccountIds.length > 0 && selectedAccountIds.every(accountId => accountId.startsWith('bluesky:'))

  const previewAccount = accounts.find(acc => {
    if (selectedAccountIds.length === 0) return false
    const [platform, id] = selectedAccountIds[0].split(':')
    return acc.platform === platform && acc.id.toString() === id
  }) || null

  useEffect(() => {
    if (selectedAccountIds.length === 0) {
      setCurrentSelectValue('')
    }
  }, [selectedAccountIds])

  const selectAccount = useCallback((accountId: string) => {
    if (accountId && !selectedAccountIds.includes(accountId)) {
      setSelectedAccountIds(prev => [...prev, accountId])
      setCurrentSelectValue('')
    }
  }, [selectedAccountIds])

  const deselectAccount = useCallback((accountId: string) => {
    setSelectedAccountIds(prev => prev.filter(id => id !== accountId))
  }, [])

  const selectAllAccounts = useCallback(() => {
    setSelectedAccountIds(accounts.map(acc => `${acc.platform}:${acc.id}`))
  }, [accounts])

  const clearAllAccounts = useCallback(() => {
    setSelectedAccountIds([])
  }, [])

  return {
    selectedAccountIds,
    setSelectedAccountIds,
    currentSelectValue,
    setCurrentSelectValue,
    accountOptions,
    isTwitterSelected,
    isOnlyBlueskySelected,
    previewAccount,
    selectAccount,
    deselectAccount,
    selectAllAccounts,
    clearAllAccounts,
  }
}
