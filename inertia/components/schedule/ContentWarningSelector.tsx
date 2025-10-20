import { Shield, AlertTriangle, Eye, Flame, Droplet } from 'lucide-react'

export type ContentWarningType = 'porn' | 'nudity' | 'sexual' | 'graphic-media' | 'gore'

interface ContentWarning {
  value: ContentWarningType
  label: string
  icon: React.ReactNode
  description: string
  color: string
  bgColor: string
  borderColor: string
}

interface ContentWarningSelectorProps {
  selected: string[]
  onChange: (warnings: string[]) => void
  className?: string
}

const CONTENT_WARNINGS: ContentWarning[] = [
  {
    value: 'sexual',
    label: 'Sexual',
    icon: <Flame className="h-3.5 w-3.5" />,
    description: 'Sexual or suggestive content',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
  {
    value: 'nudity',
    label: 'Nudity',
    icon: <Eye className="h-3.5 w-3.5" />,
    description: 'Contains nudity',
    color: 'text-pink-700 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    borderColor: 'border-pink-300 dark:border-pink-700',
  },
  {
    value: 'porn',
    label: 'Adult',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    description: 'Adult/pornographic content',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-300 dark:border-red-700',
  },
  {
    value: 'graphic-media',
    label: 'Graphic',
    icon: <Shield className="h-3.5 w-3.5" />,
    description: 'Graphic or disturbing imagery',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  {
    value: 'gore',
    label: 'Gore',
    icon: <Droplet className="h-3.5 w-3.5" />,
    description: 'Blood, violence, or gore',
    color: 'text-rose-800 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/20',
    borderColor: 'border-rose-300 dark:border-rose-700',
  },
]

export const ContentWarningSelector = ({
  selected,
  onChange,
  className = '',
}: ContentWarningSelectorProps) => {
  const toggleWarning = (value: ContentWarningType) => {
    if (selected.includes(value)) {
      onChange(selected.filter((w) => w !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Content Warnings
        </span>
        {selected.length > 0 && (
          <span className="text-xs text-gray-500">({selected.length} selected)</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTENT_WARNINGS.map((warning) => {
          const isSelected = selected.includes(warning.value)

          return (
            <button
              key={warning.value}
              type="button"
              onClick={() => toggleWarning(warning.value)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                border transition-all duration-200
                ${
                  isSelected
                    ? `${warning.bgColor} ${warning.borderColor} ${warning.color} border-2`
                    : 'bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600'
                }
              `}
              title={warning.description}
            >
              {warning.icon}
              <span>{warning.label}</span>
              {isSelected && (
                <span className="ml-0.5 font-bold">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <p>
            These labels will be applied to your post. Users can filter content based on these warnings.
          </p>
        </div>
      )}
    </div>
  )
}
