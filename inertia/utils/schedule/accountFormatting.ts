import type { Account } from '../../types/schedule'

export const formatAccountKey = (account: Account): string => {
  return `${account.platform}:${account.id}`
}

export const parseAccountKey = (key: string): { platform: string; id: string } => {
  const [platform, id] = key.split(':')
  return { platform, id }
}

export const getDisplayHandle = (account: Account): string => {
  return account.platform === 'twitter' 
    ? account.username || account.handle 
    : account.handle
}

export const findAccountByKey = (accounts: Account[], key: string): Account | undefined => {
  const { platform, id } = parseAccountKey(key)
  return accounts.find(acc => 
    acc.platform === platform && acc.id.toString() === id
  )
}

export const accountToOption = (account: Account) => {
  const accountKey = formatAccountKey(account)
  const displayHandle = getDisplayHandle(account)
  
  return {
    value: accountKey,
    label: account.displayName,
    sublabel: `@${displayHandle} (${account.platform})`
  }
}
