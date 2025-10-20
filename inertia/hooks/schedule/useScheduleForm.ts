import { useState, useCallback, useRef, useEffect } from 'react'
import type { Account } from '../../types/schedule'
import { getCurrentDateTime } from '../../utils/schedule/dateTime'
import { formatAccountKey } from '../../utils/schedule/accountFormatting'

export const useScheduleForm = (accounts: Account[]) => {
  const [addMessage, setAddMessage] = useState('')
  const [addDateTime, setAddDateTime] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [explicitLinks, setExplicitLinks] = useState<Array<{ text: string; url: string }>>([])
  const [showAddModal, setShowAddModal] = useState(false)
  
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null)

  const isFormValid = addMessage.trim() !== '' && 
    (addDateTime !== '' || selectedTimeSlot !== '') &&
    accounts.length > 0

  const handleLinkInsert = useCallback((text: string, url: string) => {
    const textarea = messageTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentMessage = addMessage

    const newMessage =
      currentMessage.substring(0, start) +
      text +
      currentMessage.substring(end)

    setAddMessage(newMessage)

    const newLink = { text, url }
    const updatedLinks = [...explicitLinks, newLink]
    setExplicitLinks(updatedLinks)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }, [addMessage, explicitLinks])

  const insertHashtags = useCallback((hashtags: string[]) => {
    const hashtagText = hashtags.map((tag) => `#${tag}`).join(' ')
    setAddMessage((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed} ${hashtagText}` : hashtagText
    })
  }, [])

  const resetForm = useCallback(() => {
    setAddMessage('')
    setAddDateTime('')
    setSelectedTimeSlot('')
    setSelectedDate('')
    setExplicitLinks([])
  }, [])

  const openModal = useCallback(() => {
    setShowAddModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowAddModal(false)
  }, [])

  useEffect(() => {
    if (showAddModal && accounts.length === 1) {
      const singleAccount = accounts[0]
      const accountKey = formatAccountKey(singleAccount)
      console.log('Auto-selecting single account:', accountKey)
    }
  }, [showAddModal, accounts])

  return {
    addMessage,
    setAddMessage,
    addDateTime,
    setAddDateTime,
    selectedTimeSlot,
    setSelectedTimeSlot,
    selectedDate,
    setSelectedDate,
    explicitLinks,
    setExplicitLinks,
    showAddModal,
    setShowAddModal,
    messageTextareaRef,
    isFormValid,
    handleLinkInsert,
    insertHashtags,
    resetForm,
    openModal,
    closeModal,
    getCurrentDateTime,
  }
}
