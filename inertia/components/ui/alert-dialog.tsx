"use client"

import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"

interface AlertDialogContextType {
  open: boolean
  setOpen: (open: boolean) => void
  onConfirm: (() => void) | null
  setOnConfirm: (fn: (() => void) | null) => void
}

const AlertDialogContext = React.createContext<AlertDialogContextType>({
  open: false,
  setOpen: () => {},
  onConfirm: null,
  setOnConfirm: () => {}
})

const AlertDialog = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  const [onConfirm, setOnConfirm] = React.useState<(() => void) | null>(null)
  
  return (
    <AlertDialogContext.Provider value={{ open, setOpen, onConfirm, setOnConfirm }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

const AlertDialogTrigger = ({ 
  children, 
  asChild 
}: { 
  children: React.ReactNode
  asChild?: boolean 
}) => {
  const { setOpen } = React.useContext(AlertDialogContext)
  
  const handleClick = () => setOpen(true)
  
  if (asChild) {
    return (
      <div onClick={handleClick} style={{ display: 'inline-block' }}>
        {children}
      </div>
    )
  }
  
  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

const AlertDialogContent = ({ children }: { children: React.ReactNode }) => {
  const { open } = React.useContext(AlertDialogContext)
  
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background p-6 rounded-lg shadow-lg max-w-lg w-full space-y-4">
        {children}
      </div>
    </div>
  )
}

const AlertDialogHeader = ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-2", className)}>
    {children}
  </div>
)

const AlertDialogFooter = ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex justify-end space-x-2", className)}>
    {children}
  </div>
)

const AlertDialogTitle = ({ children, className }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
)

const AlertDialogDescription = ({ children, className }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)}>
    {children}
  </p>
)

const AlertDialogAction = ({ 
  children, 
  onClick, 
  className 
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) => {
  const { setOpen } = React.useContext(AlertDialogContext)
  
  const handleClick = () => {
    onClick?.()
    setOpen(false)
  }
  
  return (
    <Button onClick={handleClick} className={className}>
      {children}
    </Button>
  )
}

const AlertDialogCancel = ({ 
  children, 
  className 
}: {
  children: React.ReactNode
  className?: string
}) => {
  const { setOpen } = React.useContext(AlertDialogContext)
  
  return (
    <Button variant="outline" onClick={() => setOpen(false)} className={className}>
      {children}
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
