import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { X, FileText, Twitter, Video, Calendar, Image } from 'lucide-react'
import LinkHighlightTextarea from '../LinkHighlightTextarea'
import HashtagGroupSelector from '../HashtagGroupSelector'
import GmailStyleLinkManager from '../GmailStyleLinkManager'
import CustomSelect from '../ui/CustomSelect'
import { ContentWarningSelector } from './ContentWarningSelector'
import type { Account } from '../../types/schedule'
import { findAccountByKey, getDisplayHandle, formatAccountKey } from '../../utils/schedule/accountFormatting'
import { useEffect } from 'react'

interface CreateScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: Account[]
  
  // Form state
  message: string
  setMessage: (message: string) => void
  messageTextareaRef: React.RefObject<HTMLTextAreaElement | null>
  
  // Account selection
  selectedAccountIds: string[]
  currentSelectValue: string
  setCurrentSelectValue: (value: string) => void
  accountOptions: Array<{ value: string; label: string; sublabel?: string }>
  onSelectAccount: (accountId: string) => void
  onDeselectAccount: (accountId: string) => void
  onSelectAllAccounts: () => void
  onClearAllAccounts: () => void
  isTwitterSelected: boolean
  isOnlyBlueskySelected: boolean
  previewAccount: Account | null
  
  // Time selection
  selectedDate: string
  selectedTimeSlot: string
  addDateTime: string
  setAddDateTime: (value: string) => void
  getCurrentDateTime: () => string
  
  // Links
  explicitLinks: Array<{ text: string; url: string }>
  setExplicitLinks: (links: Array<{ text: string; url: string }>) => void
  onLinkInsert: (text: string, url: string) => void
  
  // Hashtags
  onInsertHashtags: (hashtags: string[]) => void
  
  // Media
  selectedImages: File[]
  selectedVideos: File[]
  imagePreviews: string[]
  imageAltTexts: string[]
  videoAltTexts: string[]
  videoValidationError: string
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onMediaSelect: (files: FileList | null) => void
  onRemoveImage: (index: number) => void
  onRemoveVideo: (index: number) => void
  onClearAllMedia: () => void
  onUpdateImageAltText: (index: number, text: string) => void
  onUpdateVideoAltText: (index: number, text: string) => void
  
  // Content warnings
  contentWarnings: string[]
  onContentWarningsChange: (warnings: string[]) => void
  
  // Actions
  onSave: () => void
  isFormValid: boolean
}

export const CreateScheduleModal = ({
  isOpen,
  onClose,
  accounts,
  message,
  setMessage,
  messageTextareaRef,
  selectedAccountIds,
  currentSelectValue,
  setCurrentSelectValue,
  accountOptions,
  onSelectAccount,
  onDeselectAccount,
  onSelectAllAccounts,
  onClearAllAccounts,
  isTwitterSelected,
  isOnlyBlueskySelected,
  previewAccount,
  selectedDate,
  selectedTimeSlot,
  addDateTime,
  setAddDateTime,
  getCurrentDateTime,
  explicitLinks,
  setExplicitLinks,
  onLinkInsert,
  onInsertHashtags,
  selectedImages,
  selectedVideos,
  imagePreviews,
  imageAltTexts,
  videoAltTexts,
  videoValidationError,
  fileInputRef,
  onMediaSelect,
  onRemoveImage,
  onRemoveVideo,
  onClearAllMedia,
  onUpdateImageAltText,
  onUpdateVideoAltText,
  contentWarnings,
  onContentWarningsChange,
  onSave,
  isFormValid,
}: CreateScheduleModalProps) => {
  if (!isOpen) return null

  // Auto-select single account on modal open
  useEffect(() => {
    if (isOpen && accounts.length === 1 && selectedAccountIds.length === 0) {
      const accountKey = formatAccountKey(accounts[0])
      onSelectAccount(accountKey)
    }
  }, [isOpen, accounts, selectedAccountIds.length, onSelectAccount])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Schedule New Post</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {/* Section 1: Account Selection - Only show if multiple accounts */}
          {accounts.length > 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Post to
                  {selectedAccountIds.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      ({selectedAccountIds.length} account{selectedAccountIds.length > 1 ? 's' : ''})
                    </span>
                  )}
                </Label>
                {selectedAccountIds.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onSelectAllAccounts}
                      className="text-xs h-6 px-2"
                      disabled={selectedAccountIds.length === accounts.length}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClearAllAccounts}
                      className="text-xs h-6 px-2"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {selectedAccountIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAccountIds.map((accountId) => {
                      const account = findAccountByKey(accounts, accountId)
                      if (!account) return null

                      const displayHandle = getDisplayHandle(account)

                      return (
                        <div
                          key={accountId}
                          className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 text-sm"
                        >
                          {account.platform === 'twitter' ? (
                            <Twitter className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">B</span>
                            </div>
                          )}
                          <span className="text-xs font-medium">@{displayHandle}</span>
                          <button
                            type="button"
                            onClick={() => onDeselectAccount(accountId)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-0.5"
                          >
                            <X className="h-3 w-3" />
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
                    }
                  }}
                  options={accountOptions.filter(option => !selectedAccountIds.includes(option.value))}
                  placeholder={selectedAccountIds.length === 0 ? "Select account" : "Add another"}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Show selected account info for single account */}
          {accounts.length === 1 && selectedAccountIds.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              {accounts[0].platform === 'twitter' ? (
                <Twitter className="h-4 w-4 text-blue-500" />
              ) : (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">B</span>
                </div>
              )}
              <span>Posting as <span className="font-medium text-foreground">@{getDisplayHandle(accounts[0])}</span></span>
            </div>
          )}

          {/* Section 2: Message */}
          <div className="space-y-3">
            <Label htmlFor="addMessage" className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Message
            </Label>

            <LinkHighlightTextarea
              ref={messageTextareaRef}
              value={message}
              onChange={setMessage}
              links={explicitLinks}
              placeholder="What's on your mind?"
              rows={5}
              className="mt-1 min-h-[120px] w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              showPreview={true}
              previewAccount={previewAccount}
            />

            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <HashtagGroupSelector
                  onInsert={onInsertHashtags}
                  className="w-auto"
                />
                {isOnlyBlueskySelected && (
                  <GmailStyleLinkManager
                    onLinkInsert={onLinkInsert}
                    disabled={false}
                  />
                )}
              </div>
              <span className="text-xs">{message.length}/300</span>
            </div>

            {explicitLinks.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Links ({explicitLinks.length})
                </Label>
                <div className="space-y-1.5">
                  {explicitLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                        <span className="font-medium">&quot;{link.text}&quot;</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-blue-600 dark:text-blue-400 truncate">
                          {link.url}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const updatedLinks = explicitLinks.filter((_, i) => i !== index)
                          setExplicitLinks(updatedLinks)
                        }}
                        className="ml-2 h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Media */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-600" />
              Media
              {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({selectedImages.length + selectedVideos.length})
                </span>
              )}
            </Label>

            {isTwitterSelected && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-600 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                <Twitter className="h-3.5 w-3.5" />
                <span>Media upload disabled for Twitter</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  isTwitterSelected ||
                  selectedImages.length >= 4 ||
                  selectedVideos.length >= 1 ||
                  selectedAccountIds.length === 0
                }
                className="h-8 text-xs"
              >
                <Image className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => onMediaSelect(e.target.files)}
                disabled={isTwitterSelected}
              />
              {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearAllMedia}
                  className="h-8 text-xs text-red-500 hover:text-red-700"
                >
                  Clear
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {isTwitterSelected
                  ? ''
                  : `Max: ${selectedImages.length > 0 ? '4 images' : '1 video'}`}
              </span>
            </div>

            {videoValidationError && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                <div className="flex items-center gap-2">
                  <strong className="font-bold">Video Error:</strong>
                  <span>{videoValidationError}</span>
                </div>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="relative group">
                        <img
                          src={preview}
                          alt={imageAltTexts[index] || `Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded border border-blue-200 dark:border-blue-800"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveImage(index)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <Input
                        type="text"
                        placeholder="Alt text (optional)"
                        value={imageAltTexts[index] || ''}
                        onChange={(e) => onUpdateImageAltText(index, e.target.value)}
                        className="text-xs h-7"
                        maxLength={1000}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedVideos.length > 0 && (
              <div className="space-y-2">
                {selectedVideos.map((video, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="relative group p-2 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{video.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(video.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveVideo(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <Input
                      type="text"
                      placeholder="Alt text (optional)"
                      value={videoAltTexts[index] || ''}
                      onChange={(e) => onUpdateVideoAltText(index, e.target.value)}
                      className="text-xs h-7"
                      maxLength={1000}
                    />
                  </div>
                ))}
              </div>
            )}

            {(selectedImages.length > 0 || selectedVideos.length > 0) && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <ContentWarningSelector
                  selected={contentWarnings}
                  onChange={onContentWarningsChange}
                />
              </div>
            )}
          </div>

          {/* Section 4: Schedule Time */}
          <div className="space-y-3">
            <Label htmlFor="addDatetime" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Schedule Time
            </Label>

            {selectedDate && selectedTimeSlot ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                  Scheduled for
                </p>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}{' '}
                  at {selectedTimeSlot}
                </p>
              </div>
            ) : (
              <Input
                id="addDatetime"
                type="datetime-local"
                value={addDateTime}
                onChange={(e) => setAddDateTime(e.target.value)}
                min={getCurrentDateTime()}
                className="h-10 text-sm"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={onSave}
              className="flex-1 h-10 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              disabled={!isFormValid}
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Schedule Post
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 h-10 text-sm"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
