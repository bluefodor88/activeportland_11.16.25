import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useActivityContext } from '@/contexts/ActivityContext'
import { calculateDistance, formatDistance, getCurrentLocation } from '@/lib/locationUtils'
import type { Profile, UserActivitySkill } from '@/types/database'

interface PersonWithSkill extends Profile {
  skill_level: string
  distance: string
  distanceValue: number
  ready_today: boolean
}

export function usePeople() {
  const { user } = useAuth()
  const { activityId } = useActivityContext()
  const [people, setPeople] = useState<PersonWithSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null)

  useEffect(() => {
    // Get user's current location when component mounts
    getCurrentLocation().then(setUserLocation)
    
    if (activityId && user) {
      fetchPeople()
    } else {
      setPeople([])
      setLoading(false)
    }
  }, [activityId, user])

  const fetchPeople = async () => {
    if (!activityId || !user) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('user_activity_skills')
        .select(`
          id,
          user_id,
          activity_id,
          skill_level,
          ready_today,
          profiles!user_activity_skills_user_id_fkey (
            id,
            name,
            email,
            avatar_url,
            created_at,
            updated_at,
            latitude,
            longitude,
            location_sharing_enabled
          )
        `)
        .eq('activity_id', activityId)
        .not('profiles', 'is', null)

      if (error) {
        console.log('Clearing people list - error:', error)
        console.error('Error fetching people:', error)
        setPeople([])
      } else if (data) {
        // Filter out current user and process data
        const filteredData = data.filter(item => {
          const hasProfile = item.profiles && typeof item.profiles === 'object'
          const isNotCurrentUser = item.user_id !== user.id
          return hasProfile && isNotCurrentUser
        })
        
        const peopleWithSkills = filteredData.map(item => ({
          id: item.profiles.id, // This should be the UUID from profiles table
          name: item.profiles.name,
          email: item.profiles.email,
          avatar_url: item.profiles.avatar_url,
          created_at: item.profiles.created_at,
          updated_at: item.profiles.updated_at,
          skill_level: item.skill_level,
          ready_today: item.ready_today ?? false,
          distance: calculateDistanceForUser(item.profiles),
          distanceValue: calculateDistanceValueForUser(item.profiles)
        }))
        
        // Sort by ready_today first (ready people at top), then by distance
        peopleWithSkills.sort((a, b) => {
          // First sort by ready_today (true comes first)
          if (a.ready_today !== b.ready_today) {
            return a.ready_today ? -1 : 1
          }
          // Then sort by distance (closest first)
          return a.distanceValue - b.distanceValue
        })
        
        setPeople(peopleWithSkills)
      } else {
        setPeople([])
      }
    } catch (error) {
      console.error('Unexpected error fetching people:', error)
      setPeople([])
    } finally {
      setLoading(false)
    }
  }

  const calculateDistanceForUser = (profile: any): string => {
    // If user hasn't enabled location sharing, show generic message
    if (!profile.location_sharing_enabled) {
      return 'Location private'
    }

    // If we don't have user's location or profile's location, use mock data
    if (!userLocation || !profile.latitude || !profile.longitude) {
      const mockDistance = Math.random() * 15 + 0.5 // 0.5 to 15.5 miles
      return formatDistance(mockDistance)
    }

    // Calculate real distance
    const distance = calculateDistance(
      userLocation,
      { latitude: profile.latitude, longitude: profile.longitude }
    )
    return formatDistance(distance)
  }

  const calculateDistanceValueForUser = (profile: any): number => {
    // If user hasn't enabled location sharing, put them at the end
    if (!profile.location_sharing_enabled) {
      return 999
    }
    
    // If we don't have location data, use mock distance for sorting
    if (!userLocation || !profile.latitude || !profile.longitude) {
      return Math.random() * 15 + 0.5
    }
    
    // Calculate real distance for sorting
    return calculateDistance(
      userLocation,
      { latitude: profile.latitude, longitude: profile.longitude }
    )
  }

  const updateReadyToday = async (activityId: string, ready: boolean) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('user_activity_skills')
        .upsert({
          user_id: user.id,
          activity_id: activityId,
          ready_today: ready,
        }, {
          onConflict: 'user_id,activity_id'
        })

      if (error) {
        console.error('Error updating ready_today:', error)
        return false
      } else {
        // Refresh the people list
        fetchPeople()
        return true
      }
    } catch (error) {
      console.error('Error updating ready_today:', error)
      return false
    }
  }

  return { people, loading, refetch: fetchPeople, updateReadyToday }
}