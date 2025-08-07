import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface Option {
  value: string
  label: string
  sublabel?: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  className?: string
  allowCustomInput?: boolean
  customInputPlaceholder?: string
}

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option", 
  disabled = false,
  className = "",
  allowCustomInput = false,
  customInputPlaceholder = "Enter custom value"
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const selectRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)
  const isCustomValue = !selectedOption && value && allowCustomInput

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = (option: Option) => {
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border rounded-md text-sm
          flex items-center justify-between
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled 
            ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-700' 
            : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className={selectedOption || isCustomValue ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : (isCustomValue ? value : placeholder)}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {allowCustomInput && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder={customInputPlaceholder}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customValue.trim()) {
                    onChange(customValue.trim())
                    setIsOpen(false)
                    setCustomValue('')
                  }
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Press Enter to use custom value
              </div>
            </div>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={`
                w-full px-3 py-2 text-left text-sm
                flex items-center justify-between
                transition-colors duration-150
                hover:bg-gray-50 dark:hover:bg-gray-800
                ${value === option.value 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-900 dark:text-gray-100'
                }
              `}
            >
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                {option.sublabel && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {option.sublabel}
                  </div>
                )}
              </div>
              {value === option.value && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
