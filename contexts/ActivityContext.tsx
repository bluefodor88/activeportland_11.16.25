import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ActivityContextType {
  activityId?: string
  activity?: string
  skillLevel?: string
  emoji?: string
  setActivityContext: (params: {
    activityId: string
    activity: string
    skillLevel: string
    emoji: string
  }) => void
}

const ActivityContext = createContext<ActivityContextType | null>(null)

interface ActivityProviderProps {
  children: ReactNode
}

export function ActivityProvider({ children }: ActivityProviderProps) {
  const [activityContext, setActivityContextState] = useState<{
    activityId?: string
    activity?: string
    skillLevel?: string
    emoji?: string
  }>({})

  const setActivityContext = (params: {
    activityId: string
    activity: string
    skillLevel: string
    emoji: string
  }) => {
    setActivityContextState(params)
  }

  const value = {
    activityId: activityContext.activityId,
    activity: activityContext.activity,
    skillLevel: activityContext.skillLevel,
    emoji: activityContext.emoji,
    setActivityContext
  }

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivityContext() {
  const context = useContext(ActivityContext)
  if (!context) {
    throw new Error('useActivityContext must be used within an ActivityProvider')
  }
  return context
}